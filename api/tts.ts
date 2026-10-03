import { z } from 'zod';
import crypto from 'crypto';

// Gemini TTS configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-2.0-flash-exp';
const TTS_RATE_LIMIT_PER_MIN = Number(process.env.TTS_RATE_LIMIT_PER_MIN || 30);
const TTS_TIMEOUT_MS = Math.min(Number(process.env.TTS_TIMEOUT_MS || 15_000), 15_000);
const TTS_MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB in-memory cache

// Validation schema
export const TTSRequestSchema = z.object({
  text: z.string().trim().min(1).max(600),
  language: z.enum(['english', 'urdu', 'pashto']),
  voice: z.string().optional(),
}).strict();

export type TTSRequest = z.infer<typeof TTSRequestSchema>;

// Language to Gemini voice mapping
const LANGUAGE_VOICE_MAP: Record<string, string> = {
  english: 'Aoife', // Female English voice
  urdu: 'Mehwish', // Female Urdu voice (fallback to English if unavailable)
  pashto: 'Hameed', // Male Pashto voice (fallback to English if unavailable)
};

// In-memory cache
interface CacheEntry {
  audio: Buffer;
  contentType: string;
  createdAt: number;
  size: number;
}
const audioCache = new Map<string, CacheEntry>();
let cacheSizeBytes = 0;

// Rate limiting by IP
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();

// Log only provider/latency/status, never text or keys
function logTTS(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
) {
  const sanitized = meta
    ? {
        ...meta,
        text: undefined,
        key: undefined,
        apiKey: undefined,
      }
    : {};
  console[level](`[tts] ${message}`, Object.keys(sanitized).length > 0 ? sanitized : '');
}

/**
 * Generate a cache key based on text, language, and voice.
 */
function getCacheKey(text: string, language: string, voice?: string): string {
  const key = `${text}|${language}|${voice || ''}`;
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Check rate limit for an IP address.
 * Returns true if the request is allowed, false if rate limited.
 */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= TTS_RATE_LIMIT_PER_MIN) {
    return false; // Rate limited
  }

  entry.count++;
  return true;
}

/**
 * Wrap PCM audio in WAV header (if needed).
 * Gemini returns PCM data; wrap it in a minimal WAV container.
 */
function wrapPCMInWAV(pcmData: Buffer, sampleRate = 24000): Buffer {
  const bytesPerSample = 2; // 16-bit audio
  const numChannels = 1; // Mono
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const wav = Buffer.alloc(44 + dataSize);

  // RIFF header
  wav.write('RIFF', 0);
  wav.writeUInt32LE(fileSize, 4);
  wav.write('WAVE', 8);

  // fmt subchunk
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16); // Subchunk1Size
  wav.writeUInt16LE(1, 20); // AudioFormat (PCM = 1)
  wav.writeUInt16LE(numChannels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  wav.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  wav.writeUInt16LE(bytesPerSample * 8, 34); // BitsPerSample

  // data subchunk
  wav.write('data', 36);
  wav.writeUInt32LE(dataSize, 40);
  pcmData.copy(wav, 44);

  return wav;
}

/**
 * Call Gemini TTS API.
 * Returns audio buffer.
 */
async function callGeminiTTS(text: string, language: string, voice?: string): Promise<Buffer> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const selectedVoice = voice || LANGUAGE_VOICE_MAP[language] || LANGUAGE_VOICE_MAP.english;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: text,
          },
          {
            audio_config: {
              encoding: 'LINEAR16',
              sample_rate_hertz: 24000,
            },
          },
          {
            voice_name: selectedVoice,
          },
        ],
      },
    ],
  };

  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
    });

    const elapsedMs = Date.now() - startTime;

    if (!response.ok) {
      logTTS('warn', `Gemini TTS failed with status ${response.status}`, {
        status: response.status,
        elapsedMs,
      });
      throw new Error(`Gemini TTS HTTP ${response.status}`);
    }

    type InlineAudio = { data?: string };
    const data = await response.json() as {
      candidates?: { content?: { parts?: { inlineData?: InlineAudio; inline_data?: InlineAudio }[] } }[];
    };

    // Gemini's REST API returns camelCase `inlineData`; accept snake_case too.
    const audioPart = data?.candidates?.[0]?.content?.parts?.[0];
    const base64Data = audioPart?.inlineData?.data ?? audioPart?.inline_data?.data;
    if (base64Data) {
      const audioBuffer = Buffer.from(base64Data, 'base64');

      // Check if it's raw PCM; wrap it if needed
      if (!isWAVHeader(audioBuffer)) {
        const wavBuffer = wrapPCMInWAV(audioBuffer);
        logTTS('info', 'Gemini TTS succeeded', {
          language,
          voice: selectedVoice,
          elapsedMs,
          audioSize: wavBuffer.length,
        });
        return wavBuffer;
      }

      logTTS('info', 'Gemini TTS succeeded', {
        language,
        voice: selectedVoice,
        elapsedMs,
        audioSize: audioBuffer.length,
      });
      return audioBuffer;
    }

    throw new Error('Unexpected Gemini TTS response format');
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    logTTS('error', `Gemini TTS error: ${error instanceof Error ? error.message : String(error)}`, {
      language,
      elapsedMs,
    });
    throw error;
  }
}

/**
 * Check if a buffer starts with WAV header.
 */
function isWAVHeader(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'RIFF';
}

/**
 * Add audio to cache, evicting old entries if necessary.
 */
function addToCache(key: string, audio: Buffer, contentType: string): void {
  const size = audio.length;

  // Check if adding this entry exceeds cache size
  if (cacheSizeBytes + size > TTS_MAX_CACHE_SIZE) {
    // Evict oldest entries until there's enough space
    const entries = Array.from(audioCache.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (const [k, v] of entries) {
      if (cacheSizeBytes + size <= TTS_MAX_CACHE_SIZE) break;
      cacheSizeBytes -= v.size;
      audioCache.delete(k);
    }
  }

  audioCache.set(key, {
    audio,
    contentType,
    createdAt: Date.now(),
    size,
  });
  cacheSizeBytes += size;
}

/**
 * Get audio from cache.
 */
function getFromCache(key: string): Buffer | null {
  const entry = audioCache.get(key);
  return entry ? entry.audio : null;
}

/**
 * Handle TTS request.
 * Returns Response with audio buffer or error.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Parse JSON body
    const bodyText = await request.text();
    let body: TTSRequest;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate request
    try {
      TTSRequestSchema.parse(body);
    } catch (error) {
      logTTS('warn', 'Invalid TTS request', {
        error: error instanceof Error ? error.message : String(error),
      });
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { text, language, voice } = body;

    // Get client IP from request headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      logTTS('warn', 'Rate limit exceeded', { ip });
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check cache
    const cacheKey = getCacheKey(text, language, voice);
    const cachedAudio = getFromCache(cacheKey);
    if (cachedAudio) {
      logTTS('info', 'Cache hit for TTS', { language });
      return new Response(cachedAudio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Call Gemini TTS
    try {
      const audio = await callGeminiTTS(text, language, voice);

      // Cache the result
      addToCache(cacheKey, audio, 'audio/wav');

      return new Response(audio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/wav',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (error) {
      logTTS('error', `TTS generation failed: ${error instanceof Error ? error.message : String(error)}`);
      return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    logTTS('error', `TTS handler error: ${error instanceof Error ? error.message : String(error)}`);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
