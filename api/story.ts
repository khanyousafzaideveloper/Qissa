import { z } from 'zod';
import { SETTINGS, LESSONS, PARENT_PURPOSES, STORY_LENGTHS, inferStoryLength, buildStory, type StoryData, type StoryPage, type StoryLength } from '../src/data/storyData.js';
import { createJob, completeJob, failJob, addChapter } from './story-status.js';

const HERO = '{{HERO}}';
const illustrationValues = ['mountain', 'village', 'bazaar', 'eid', 'forest', 'school', 'night', 'journey'] as const;
const ILLUSTRATIONS: StoryPage['illustration'][] = [...illustrationValues];

// Provider configuration
const AI_PROVIDER_ORDER = (process.env.AI_PROVIDER_ORDER || 'groq,gemini')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

// Groq configuration - using gpt-oss models (llama models retired as of 2026-08-16)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODELS = (process.env.GROQ_FALLBACK_MODELS || 'openai/gpt-oss-20b')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const GROQ_TIMEOUT_MS = Math.min(Number(process.env.GROQ_TIMEOUT_MS || 20_000), 20_000);
const GROQ_MAX_COMPLETION_TOKENS = 8_000; // gpt-oss reasoning tokens count toward limit

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-3.5-flash')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const GEMINI_TIMEOUT_MS = Math.min(Number(process.env.GEMINI_TIMEOUT_MS || 25_000), 25_000);
const GEMINI_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'low';

// Generation constraints
const GENERATION_TOTAL_TIMEOUT_MS = Math.min(Number(process.env.GENERATION_TOTAL_TIMEOUT_MS || 60_000), 60_000);
const GEMINI_MAX_OUTPUT_TOKENS = 4_096;
const GEMINI_MAX_ATTEMPTS = 3;
const GROQ_MAX_ATTEMPTS = 3;
const GEMINI_BACKOFF_BASE_MS = 1_000;
const CACHE_TTL_MS = 5 * 60_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
// Weight per story length: short=1 unit, medium=1.5 units, long=2 units
const RATE_LIMIT_WEIGHTS = { short: 1, medium: 1.5, long: 2 } as const;
const MAX_PAGE_CHARS = 900;

// Log enabled providers at startup
const enabledProviders: string[] = [];
if (GROQ_API_KEY) enabledProviders.push('groq');
if (GEMINI_API_KEY) enabledProviders.push('gemini');
console.info('[story] enabled AI providers at startup:', enabledProviders.join(', ') || 'none');

type FailureKind = 'provider' | 'blocked-by-safety' | 'invalid-json' | 'schema-failure' | 'child-safety' | 'total-timeout' | 'config-error';

interface GeminiResponse {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
}

class ProviderFailure extends Error {
  constructor(
    public readonly kind: FailureKind,
    message: string,
    public readonly retryable = false,
    public readonly retryAfterMs?: number,
    public readonly attempts = 0,
    public readonly skipModel = false,
    public readonly removeField?: string,
  ) {
    super(message);
  }
}

// Track dead models and circuit breakers
const deadGroqModels = new Set<string>();
const deadGeminiModels = new Set<string>();
const loggedDeadModels = new Set<string>();

interface CircuitBreakerState {
  consecutiveFailures: number;
  bannedUntil: number;
}
const geminiCircuitBreakers = new Map<string, CircuitBreakerState>();
const CIRCUIT_BREAKER_THRESHOLD = 2;
const CIRCUIT_BREAKER_WINDOW_MS = 60_000;

export const StoryRequestSchema = z.object({
  settingId: z.string().refine((value) => SETTINGS.some((setting) => setting.id === value), 'Unknown settingId'),
  lessonId: z.string().refine((value) => LESSONS.some((lesson) => lesson.id === value), 'Unknown lessonId'),
  parentPurpose: z.string().refine((value) => PARENT_PURPOSES.some((purpose) => purpose.id === value), 'Unknown parentPurpose').optional(),
  language: z.enum(['english', 'urdu', 'pashto']),
  gender: z.enum(['girl', 'boy']),
  storyLength: z.enum(['short', 'medium', 'long']).optional(),
}).strict();

const ChoiceSchema = z.object({
  text: z.object({ en: z.string().trim().min(1), ur: z.string().trim().min(1), ps: z.string().trim().min(1) }).strict(),
}).strict();

const ModelPageSchema = z.object({
  text: z.object({ en: z.string().trim().min(1), ur: z.string().trim().min(1), ps: z.string().trim().min(1) }).strict(),
  illustration: z.enum(illustrationValues),
  choices: z.array(ChoiceSchema).optional(),
}).strict();

const QuizQuestionSchema = z.object({
  question: z.object({ en: z.string().trim().min(1), ur: z.string().trim().min(1), ps: z.string().trim().min(1) }).strict(),
  options: z.array(z.object({ en: z.string().trim().min(1), ur: z.string().trim().min(1), ps: z.string().trim().min(1) }).strict()).length(3),
  answer: z.number().int().min(0).max(2),
}).strict();

export const ModelStorySchema = z.object({
  title: z.object({ en: z.string().trim().min(1), ur: z.string().trim().min(1), ps: z.string().trim().min(1) }).strict(),
  pages: z.array(ModelPageSchema).min(6).max(20),
  quiz: z.array(QuizQuestionSchema).min(3).max(5),
}).strict();

const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'OBJECT', properties: { en: { type: 'STRING' }, ur: { type: 'STRING' }, ps: { type: 'STRING' } }, required: ['en', 'ur', 'ps'] },
    pages: {
      type: 'ARRAY', minItems: 6, maxItems: 6,
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'OBJECT', properties: { en: { type: 'STRING' }, ur: { type: 'STRING' }, ps: { type: 'STRING' } }, required: ['en', 'ur', 'ps'] },
          illustration: { type: 'STRING', enum: [...illustrationValues] },
          choices: {
            type: 'ARRAY', minItems: 0, maxItems: 2,
            items: {
              type: 'OBJECT',
              properties: { text: { type: 'OBJECT', properties: { en: { type: 'STRING' }, ur: { type: 'STRING' }, ps: { type: 'STRING' } }, required: ['en', 'ur', 'ps'] } },
              required: ['text'],
            },
          },
        },
        required: ['text', 'illustration'],
      },
    },
    quiz: {
      type: 'ARRAY', minItems: 3, maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'OBJECT', properties: { en: { type: 'STRING' }, ur: { type: 'STRING' }, ps: { type: 'STRING' } }, required: ['en', 'ur', 'ps'] },
          options: { type: 'ARRAY', minItems: 3, maxItems: 3, items: { type: 'OBJECT', properties: { en: { type: 'STRING' }, ur: { type: 'STRING' }, ps: { type: 'STRING' } }, required: ['en', 'ur', 'ps'] } },
          answer: { type: 'INTEGER' },
        },
        required: ['question', 'options', 'answer'],
      },
    },
  },
  required: ['title', 'pages', 'quiz'],
} as const;

// Banned terms: split into HARD-BAN (never allowed) and SOFT (allowed 1-2x if not repetitive/violent context)
const HARD_BAN_TERMS = {
  en: ['kill', 'death', 'dead', 'weapon', 'gun', 'knife', 'murder', 'suicide', 'romance', 'adult', 'drugs'],
  ur: ['قتل', 'بندوق', 'چاقو'],
} as const;

const SOFT_TERMS = {
  en: { 'blood': 'gentle mention allowed (e.g., scraped knee)' },
  ur: { 'خون': 'gentle mention allowed' },
} as const;

interface GroqStoryResult {
  story: StoryData;
  provider: 'groq';
  model: string;
  attempts: number;
  elapsedMs: number;
}

interface GeminiStoryResult {
  story: StoryData;
  provider: 'gemini';
  model: string;
  attempts: number;
  elapsedMs: number;
}

type StoryResult = GroqStoryResult | GeminiStoryResult;

type CachedStory = {
  expiresAt: number;
  story: StoryData;
  provider: 'gemini' | 'groq';
  model?: string;
  attempts?: number;
  elapsedMs?: number;
};

const storyCache = new Map<string, CachedStory>();
const rateLimits = new Map<string, number[]>();

const SYSTEM_PROMPT = `You are Qissa, a warm storyteller writing picture-book stories for Pakistani children aged 4 to 8.

Rules:
- Gentle, positive, and age-appropriate. No violence, scary content, romance, or anything unsafe for young children (ages 4-8).
- Rooted in Pakistani culture: familiar foods, places, family members (Ammi, Abbu, Dada, Nani), festivals and manners. Respectful of Islamic values without preaching.
- Simple sentences a young child can follow. Each page has exactly 2 to 3 short sentences per language.
- The hero is always written as the exact token ${HERO} (never invent a name for the hero).
- Every title, page, choice, quiz question, and quiz option is an object with en, ur, and ps fields. Urdu and Pashto must use their native scripts, not Roman Urdu or Roman Pashto.
- The lesson must come through the events of the story, not a lecture.
- Do not include violence, death, weapons, frightening imagery, romance, or adult themes.

Return ONLY valid JSON. The response MUST have:
- Exactly 6 pages
- Exactly 3 quiz questions
- Each quiz question must have exactly 3 options

The 6 pages form a small branching story:
- Page 0: introduce ${HERO} and the setting. No choices.
- Page 1: a problem appears. Exactly 2 choices for what ${HERO} does next.
- Page 2: what happens after choice 1. Exactly 1 choice to continue.
- Page 3: what happens after choice 2. Exactly 1 choice to continue.
- Page 4: ${HERO} solves the problem using the lesson. No choices.
- Page 5: happy ending that shows the lesson. No choices.
Both branches must make sense before page 4. Quiz questions must be answerable from the story whichever branch the child picks.`;

type StoryRequest = z.infer<typeof StoryRequestSchema>;

function buildUserPrompt(req: StoryRequest): string {
  const setting = SETTINGS.find((item) => item.id === req.settingId)!;
  const lesson = LESSONS.find((item) => item.id === req.lessonId)!;
  const purpose = PARENT_PURPOSES.find((item) => item.id === req.parentPurpose);
  const storyLength = req.storyLength || 'short';
  const lengthConfig = STORY_LENGTHS[storyLength];
  const languageGuidance = {
    english: 'Use warm, simple English vocabulary and natural picture-book rhythm.',
    urdu: 'Use gentle, natural Urdu vocabulary for young children in Urdu script, with culturally familiar phrasing.',
    pashto: 'Use gentle, natural Pashto vocabulary for young children in Pashto script, with culturally familiar phrasing.',
  }[req.language];
  
  const pageRequirement = storyLength === 'short' 
    ? 'EXACTLY 6 pages' 
    : storyLength === 'medium' 
    ? 'EXACTLY 12 pages (with multiple chapters and continued storyline)' 
    : 'EXACTLY 20 pages (with a full multi-chapter story with multiple plot points)';

  const quizRequirement = storyLength === 'short'
    ? '3 comprehension questions'
    : storyLength === 'medium'
    ? '4 comprehension questions'
    : '5 comprehension questions';

  return [
    `⚠️ CRITICAL REQUIREMENT: Generate a story that is ${pageRequirement}. Do not generate 6 pages unless explicitly told. Count carefully.`,
    `Setting: ${setting.label} (${setting.labelUrdu}; ${setting.labelPashto}).`,
    `Lesson: ${lesson.label}.`,
    `Preferred reading language: ${req.language}. ${languageGuidance}`,
    `The hero ${HERO} is a ${req.gender} (use the correct Urdu verb gender).`,
    purpose ? `A parent asked for this story to gently help their child with: "${purpose.label}". Weave this in naturally.` : '',
    `Story structure: Your response MUST contain exactly ${lengthConfig.pages} pages. Each page should have meaningful content. Include branching choices (story split points that lead to different paths). Include exactly ${quizRequirement}.`,
    `For a ${lengthConfig.pages}-page story: expand the narrative with more chapters, deeper character development, and additional adventures. Do not pad with repetition.`,
    'Write a fresh, original story.',
  ].filter(Boolean).join('\n');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, timeoutMessage: string, retryableOnTimeout: boolean): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ProviderFailure('provider', timeoutMessage, retryableOnTimeout);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.min(5_000, Math.max(0, seconds * 1_000));
  const timestamp = Date.parse(header);
  return Number.isFinite(timestamp) ? Math.min(5_000, Math.max(0, timestamp - Date.now())) : undefined;
}

function retryDelay(attempt: number): number {
  const exponentialDelay = GEMINI_BACKOFF_BASE_MS * (2 ** (attempt - 1));
  return exponentialDelay + Math.floor(Math.random() * (exponentialDelay * 0.25));
}

interface GroqRawResult {
  text: string;
  attempts: number;
  elapsedMs: number;
}

// Unwrap single top-level wrapper key if it exists (e.g., {story: {...}} → {...})
function unwrapResponse(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  const keys = Object.keys(obj);
  if (keys.length === 1 && typeof (obj as Record<string, unknown>)[keys[0]] === 'object') {
    return (obj as Record<string, unknown>)[keys[0]];
  }
  return obj;
}

async function callGroqAttempt(prompt: string, model: string, deadlineAt: number, includeReasoningEffort: boolean, maxTokens: number): Promise<string> {
  if (!GROQ_API_KEY) throw new ProviderFailure('config-error', 'GROQ_API_KEY not set');
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new ProviderFailure('total-timeout', 'Groq generation total timeout exceeded');

  const body: Record<string, unknown> = {
    model,
    temperature: 0.8,
    max_completion_tokens: maxTokens,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  };

  // Add reasoning_effort for gpt-oss models (reasoning tokens count toward limit)
  if (includeReasoningEffort && model.includes('gpt-oss')) {
    body.reasoning_effort = 'low';
  }

  // Use json_schema if available, otherwise json_object
  body.response_format = { type: 'json_object' };

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  }, Math.min(GROQ_TIMEOUT_MS, remainingMs), 'Groq request timed out', true);

  if (!res.ok) {
    const responseText = res.status === 400 ? await res.text().catch(() => '') : '';
    const removeField = res.status === 400 && /reasoning_effort|unsupported/i.test(responseText) ? 'reasoning_effort' : undefined;
    const retryable = [429, 500, 502, 503, 504].includes(res.status);
    const skipModel = res.status === 404;
    const reason = res.status === 400
      ? 'bad request'
      : res.status === 401 || res.status === 403
      ? 'invalid API key or permission'
      : res.status === 404
      ? 'model not found'
      : res.status === 429
      ? 'rate limited'
      : `HTTP ${res.status}`;
    throw new ProviderFailure('provider', `Groq ${reason}`, retryable, retryAfterMs(res.headers.get('retry-after')), 0, skipModel, removeField);
  }

  let data: { choices?: { message?: { content?: string }; finish_reason?: string }[] };
  try {
    data = await res.json() as typeof data;
  } catch {
    throw new ProviderFailure('invalid-json', 'Groq returned an invalid API response');
  }

  const text = data.choices?.[0]?.message?.content;
  const finishReason = data.choices?.[0]?.finish_reason;

  if (!text || finishReason === 'length') {
    if (!text) throw new ProviderFailure('provider', 'Groq returned no text');
    // finish_reason === 'length' means content was cut off
    throw new ProviderFailure('provider', 'Groq response truncated (finish_reason: length)', true);
  }

  return text;
}

async function callGroqWithRetries(prompt: string, model: string, deadlineAt: number): Promise<GroqRawResult> {
  const startedAt = Date.now();
  let includeReasoningEffort = true;
  let maxTokens = GROQ_MAX_COMPLETION_TOKENS;

  for (let attempt = 1; attempt <= GROQ_MAX_ATTEMPTS; attempt += 1) {
    try {
      const text = await callGroqAttempt(prompt, model, deadlineAt, includeReasoningEffort, maxTokens);
      const elapsedMs = Date.now() - startedAt;
      console.info('[story] groq attempt', { model, attempt, elapsedMs, outcome: 'ok' });
      return { text, attempts: attempt, elapsedMs };
    } catch (error) {
      const failure = error instanceof ProviderFailure
        ? error
        : new ProviderFailure('provider', error instanceof Error ? error.message : String(error));
      const elapsedMs = Date.now() - startedAt;
      const outcome = failure.kind === 'total-timeout' || failure.message.includes('timed out')
        ? 'timeout'
        : failure.message.startsWith('Groq')
        ? failure.message
        : failure.kind === 'invalid-json'
        ? 'invalid JSON'
        : failure.message;
      console.error('[story] groq attempt', { model, attempt, elapsedMs, outcome });

      if (failure.removeField && includeReasoningEffort) {
        includeReasoningEffort = false;
        console.warn('[story] Groq reasoning_effort not supported; retrying without it', { model, attempt });
        continue;
      }

      // Retry once on length finish_reason with higher token limit
      if (failure.message.includes('finish_reason: length') && attempt === 1) {
        maxTokens = Math.min(maxTokens * 1.5, 12_000);
        console.warn('[story] Groq response truncated; retrying with higher token limit', { model, attempt, newMaxTokens: maxTokens });
        continue;
      }

      if (failure.kind === 'total-timeout' || !failure.retryable || attempt === GROQ_MAX_ATTEMPTS) {
        throw new ProviderFailure(failure.kind, failure.message, failure.retryable, failure.retryAfterMs, attempt, failure.skipModel, failure.removeField);
      }

      const remainingMs = deadlineAt - Date.now();
      const delayMs = Math.min(failure.retryAfterMs ?? retryDelay(attempt), 8_000);
      if (remainingMs <= delayMs) throw new ProviderFailure('total-timeout', 'Groq generation total timeout exceeded');
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new ProviderFailure('provider', 'Groq failed after all attempts');
}

async function generateFromGroq(prompt: string, fallbackIllustration: StoryPage['illustration'], storyLength: StoryLength = 'short'): Promise<GroqStoryResult> {
  if (!GROQ_API_KEY) throw new ProviderFailure('config-error', 'GROQ_API_KEY not set');
  const startedAt = Date.now();
  const deadlineAt = startedAt + GENERATION_TOTAL_TIMEOUT_MS;
  const models = [...new Set([GROQ_MODEL, ...GROQ_FALLBACK_MODELS])];
  const errors: string[] = [];
  let attempts = 0;

  for (const model of models) {
    if (deadGroqModels.has(model)) continue;
    if (Date.now() >= deadlineAt) throw new ProviderFailure('total-timeout', 'Groq generation total timeout exceeded');

    let modelPrompt = prompt;
    for (let validationAttempt = 0; validationAttempt < 2; validationAttempt += 1) {
      try {
        const raw = await callGroqWithRetries(modelPrompt, model, deadlineAt);
        attempts += raw.attempts;

        try {
          // Unwrap single top-level key before parsing/validation
          let parsed = JSON.parse(raw.text);
          parsed = unwrapResponse(parsed);
          const story = parseAndNormalize(JSON.stringify(parsed), fallbackIllustration, storyLength);
          const elapsedMs = Date.now() - startedAt;
          console.info('[story] groq success', { model, attempts, elapsedMs, storyLength, pageCount: story.pages.length, quizCount: story.quiz.length });
          return { story, provider: 'groq', model, attempts, elapsedMs };
        } catch (error) {
          const failure = error instanceof ProviderFailure ? error : new ProviderFailure('schema-failure', error instanceof Error ? error.message : String(error));
          console.error('[story] groq validation', {
            model,
            attempt: attempts,
            elapsedMs: Date.now() - startedAt,
            outcome: failure.kind === 'invalid-json' ? 'invalid JSON' : 'schema failure',
            failureMessage: failure.message,
            storyLength,
          });

          if (validationAttempt === 0 && ['invalid-json', 'schema-failure'].includes(failure.kind)) {
            modelPrompt = `${prompt}\n\nYour previous answer was invalid: ${failure.message}. Return corrected JSON.`;
            continue;
          }

          throw failure;
        }
      } catch (error) {
        const failure = error instanceof ProviderFailure ? error : new ProviderFailure('provider', String(error));
        attempts += failure.attempts;
        errors.push(`${model}: ${failure.message}`);

        if (failure.kind === 'total-timeout') throw failure;
        if (failure.skipModel) {
          deadGroqModels.add(model);
          if (!loggedDeadModels.has(`groq:${model}`)) {
            loggedDeadModels.add(`groq:${model}`);
            console.error('[story] skipping Groq model for process lifetime', { model, reason: failure.message });
          }
        }
        break;
      }
    }
  }

  throw new ProviderFailure('provider', errors.join('; ') || 'Groq failed');
}

// Gemini functions
interface GeminiRawResult {
  text: string;
  attempts: number;
  elapsedMs: number;
}

function geminiGenerationConfig(model: string, includeThinking: boolean) {
  const config: Record<string, unknown> = {
    responseMimeType: 'application/json',
    responseSchema: GEMINI_RESPONSE_SCHEMA,
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    temperature: 0.9,
  };
  if (includeThinking && model.startsWith('gemini-3')) {
    config.thinkingConfig = { thinkingLevel: GEMINI_THINKING_LEVEL };
  }
  return config;
}

function isGeminiCircuitBreakerOpen(model: string): boolean {
  const state = geminiCircuitBreakers.get(model);
  if (!state) return false;
  if (Date.now() > state.bannedUntil) {
    geminiCircuitBreakers.delete(model);
    return false;
  }
  return true;
}

function recordGeminiFailure(model: string, failure: ProviderFailure) {
  if (![429, 500, 502, 503, 504].includes(failure.retryable ? 200 : 400) && !failure.message.includes('timed out')) {
    return; // Only track 429, 503, 500, 502, 504, timeouts
  }

  const currentState = geminiCircuitBreakers.get(model) || { consecutiveFailures: 0, bannedUntil: 0 };
  currentState.consecutiveFailures += 1;

  if (currentState.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    currentState.bannedUntil = Date.now() + CIRCUIT_BREAKER_WINDOW_MS;
    console.warn('[story] Gemini circuit breaker activated', { model, consecutiveFailures: currentState.consecutiveFailures, bannedUntilMs: CIRCUIT_BREAKER_WINDOW_MS });
  }

  geminiCircuitBreakers.set(model, currentState);
}

function resetGeminiFailures(model: string) {
  geminiCircuitBreakers.set(model, { consecutiveFailures: 0, bannedUntil: 0 });
}

async function callGeminiAttempt(prompt: string, model: string, deadlineAt: number, includeThinking: boolean): Promise<string> {
  if (!GEMINI_API_KEY) throw new ProviderFailure('config-error', 'GEMINI_API_KEY not set');
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new ProviderFailure('total-timeout', 'Gemini generation total timeout exceeded');

  const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: geminiGenerationConfig(model, includeThinking),
      safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']
        .map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' })),
    }),
  }, Math.min(GEMINI_TIMEOUT_MS, remainingMs), 'Gemini request timed out', true);

  if (!res.ok) {
    const retryable = [429, 500, 502, 503, 504].includes(res.status);
    const responseText = res.status === 400 ? await res.text().catch(() => '') : '';
    const removeField = res.status === 400 && /thinking(level|config)|unsupported|unknown field/i.test(responseText) ? 'thinkingConfig' : undefined;
    const skipModel = res.status === 404;
    const reason = res.status === 400
      ? 'bad request'
      : res.status === 401 || res.status === 403
      ? 'invalid API key or permission'
      : res.status === 404
      ? 'model not found'
      : `HTTP ${res.status}`;
    throw new ProviderFailure('provider', `Gemini ${reason}`, retryable, retryAfterMs(res.headers.get('retry-after')), 0, skipModel, removeField);
  }

  let data: GeminiResponse;
  try {
    data = await res.json() as GeminiResponse;
  } catch {
    throw new ProviderFailure('invalid-json', 'Gemini returned an invalid API response');
  }

  const finishReason = data?.candidates?.[0]?.finishReason;
  if (finishReason === 'SAFETY' || data?.promptFeedback?.blockReason) {
    const blockReason = finishReason || data.promptFeedback?.blockReason || 'blocked';
    throw new ProviderFailure('blocked-by-safety', `Gemini safety block (${blockReason})`);
  }

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
  if (!text) throw new ProviderFailure('provider', `Gemini returned no text (${finishReason || 'unknown finish reason'})`);
  return text;
}

async function callGeminiWithRetries(prompt: string, model: string, deadlineAt: number): Promise<GeminiRawResult> {
  const startedAt = Date.now();
  let includeThinking = model.startsWith('gemini-3');
  let totalAttempts = 0;

  // Retry loop: max 1 retry on 500/502/503/504/timeout, honor 429 retry-after, then move to next model
  for (let retry = 0; retry <= 1; retry += 1) {
    try {
      const text = await callGeminiAttempt(prompt, model, deadlineAt, includeThinking);
      const elapsedMs = Date.now() - startedAt;
      totalAttempts += 1;
      console.info('[story] gemini attempt', { model, attempt: totalAttempts, elapsedMs, outcome: 'ok' });
      resetGeminiFailures(model);
      return { text, attempts: totalAttempts, elapsedMs };
    } catch (error) {
      const failure = error instanceof ProviderFailure
        ? error
        : new ProviderFailure('provider', error instanceof Error ? error.message : String(error));
      totalAttempts += 1;
      const elapsedMs = Date.now() - startedAt;
      const outcome = failure.kind === 'total-timeout' || failure.message.includes('timed out')
        ? 'timeout'
        : failure.message.startsWith('Gemini')
        ? failure.message
        : failure.kind === 'invalid-json'
        ? 'invalid JSON'
        : failure.message;
      console.error('[story] gemini attempt', { model, attempt: totalAttempts, elapsedMs, outcome });

      recordGeminiFailure(model, failure);

      if (failure.removeField && includeThinking) {
        includeThinking = false;
        console.warn('[story] Gemini thinkingConfig not supported; retrying without it', { model, attempt: totalAttempts });
        continue;
      }

      if (failure.kind === 'total-timeout') {
        throw new ProviderFailure(failure.kind, failure.message, failure.retryable, failure.retryAfterMs, totalAttempts, failure.skipModel, failure.removeField);
      }

      // 429: honor retry-after if under 5s, else move to next model
      if (failure.message.includes('429')) {
        if (failure.retryAfterMs && failure.retryAfterMs <= 5_000 && retry === 0) {
          const remainingMs = deadlineAt - Date.now();
          if (remainingMs > failure.retryAfterMs) {
            await new Promise<void>((resolve) => setTimeout(resolve, failure.retryAfterMs));
            continue;
          }
        }
        // 429 without short retry-after: move to next model
        throw new ProviderFailure(failure.kind, failure.message, false, failure.retryAfterMs, totalAttempts, failure.skipModel, failure.removeField);
      }

      // 500/502/503/504/timeout: retry once, then move to next model
      if (!failure.retryable || retry === 1) {
        throw new ProviderFailure(failure.kind, failure.message, false, failure.retryAfterMs, totalAttempts, failure.skipModel, failure.removeField);
      }

      // Wait before retry
      const remainingMs = deadlineAt - Date.now();
      const delayMs = Math.min(retryDelay(retry + 1), 8_000);
      if (remainingMs <= delayMs) throw new ProviderFailure('total-timeout', 'Gemini generation total timeout exceeded');
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new ProviderFailure('provider', 'Gemini failed after retries');
}

async function generateFromGemini(prompt: string, fallbackIllustration: StoryPage['illustration'], storyLength: StoryLength = 'short'): Promise<GeminiStoryResult> {
  if (!GEMINI_API_KEY) throw new ProviderFailure('config-error', 'GEMINI_API_KEY not set');
  const startedAt = Date.now();
  const deadlineAt = startedAt + GENERATION_TOTAL_TIMEOUT_MS;
  const models = [...new Set([GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS])];
  const errors: string[] = [];
  let attempts = 0;

  for (const model of models) {
    if (deadGeminiModels.has(model)) continue;
    if (isGeminiCircuitBreakerOpen(model)) continue;
    if (Date.now() >= deadlineAt) throw new ProviderFailure('total-timeout', 'Gemini generation total timeout exceeded');

    let modelPrompt = prompt;
    for (let validationAttempt = 0; validationAttempt < 2; validationAttempt += 1) {
      try {
        const raw = await callGeminiWithRetries(modelPrompt, model, deadlineAt);
        attempts += raw.attempts;

        try {
          const story = parseAndNormalize(raw.text, fallbackIllustration, storyLength);
          const elapsedMs = Date.now() - startedAt;
          console.info('[story] gemini success', { model, attempts, elapsedMs, storyLength, pageCount: story.pages.length, quizCount: story.quiz.length });
          return { story, provider: 'gemini', model, attempts, elapsedMs };
        } catch (error) {
          const failure = error instanceof ProviderFailure ? error : new ProviderFailure('schema-failure', error instanceof Error ? error.message : String(error));
          console.error('[story] gemini validation', {
            model,
            attempt: attempts,
            elapsedMs: Date.now() - startedAt,
            outcome: failure.kind === 'invalid-json' ? 'invalid JSON' : failure.kind === 'child-safety' ? 'child safety' : 'schema failure',
            failureMessage: failure.message,
            storyLength,
          });

          // Retry on schema failure or child-safety (hard-ban only)
          if (validationAttempt === 0 && ['invalid-json', 'schema-failure'].includes(failure.kind)) {
            modelPrompt = `${prompt}\n\nYour previous answer was invalid: ${failure.message}. Return corrected JSON.`;
            continue;
          }

          throw failure;
        }
      } catch (error) {
        const failure = error instanceof ProviderFailure ? error : new ProviderFailure('provider', String(error));
        attempts += failure.attempts;
        errors.push(`${model}: ${failure.message}`);

        if (failure.kind === 'total-timeout') throw failure;
        if (failure.skipModel) {
          deadGeminiModels.add(model);
          if (!loggedDeadModels.has(`gemini:${model}`)) {
            loggedDeadModels.add(`gemini:${model}`);
            console.error('[story] skipping Gemini model for process lifetime', { model, reason: failure.message });
          }
        }
        break;
      }
    }
  }

  throw new ProviderFailure('provider', errors.join('; ') || 'Gemini failed');
}

function formatSchemaError(error: z.ZodError): string {
  const issue = error.issues[0];
  return `${issue?.path.join('.') || 'story'} ${issue?.message || 'is invalid'}`;
}

// Tokenize text into words using whitespace and punctuation boundaries (including Urdu)
function tokenizeWords(text: string): string[] {
  // Split on whitespace and punctuation: . , ! ? ؛ ، ۔ ؟ " ' « » and quotes
  return text.split(/[\s.,:;!?\u061B\u060C\u06D4\u061F"'\u00AB\u00BB«»]+/).filter((word) => word.length > 0);
}

interface BannedTermMatch {
  word: string;
  category: 'hard-ban' | 'soft';
  pageIndex?: number;
}

// Check for hard-ban terms (case-insensitive for English, exact for Urdu)
function findHardBanTerm(text: string): BannedTermMatch | null {
  const words = tokenizeWords(text);
  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (HARD_BAN_TERMS.en.some((term) => lowerWord === term)) {
      return { word, category: 'hard-ban' };
    }
    if (HARD_BAN_TERMS.ur.some((term) => word === term)) {
      return { word, category: 'hard-ban' };
    }
  }
  return null;
}

// Count soft term occurrences (max 2 allowed)
function countSoftTerms(text: string): BannedTermMatch[] {
  const words = tokenizeWords(text);
  const matches: BannedTermMatch[] = [];
  let enBloodCount = 0;
  let urBloodCount = 0;

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (lowerWord === 'blood') {
      enBloodCount++;
      if (enBloodCount <= 2) matches.push({ word, category: 'soft' });
    }
    if (word === 'خون') {
      urBloodCount++;
      if (urBloodCount <= 2) matches.push({ word, category: 'soft' });
    }
  }

  // Only return if MORE than 2 occurrences (indicating excessive/problematic use)
  return enBloodCount > 2 || urBloodCount > 2 ? matches : [];
}

export function normalizeStory(raw: unknown, fallbackIllustration: StoryPage['illustration'], storyLength: StoryLength = 'short'): StoryData {
  const parsed = ModelStorySchema.safeParse(raw);
  if (!parsed.success) throw new Error(formatSchemaError(parsed.error));

  const lengthConfig = STORY_LENGTHS[storyLength];
  const expectedPageCount = lengthConfig.pages;

  // Validate page count matches requested length
  if (parsed.data.pages.length !== expectedPageCount) {
    throw new ProviderFailure(
      'schema-failure',
      `Expected ${expectedPageCount} pages for ${storyLength} story but got ${parsed.data.pages.length}`,
      true, // retryable
    );
  }

  // Build branching structure based on storyLength
  // Short (6 pages): pages 1,2,3 have choices -> converge at 4
  // Medium (12 pages): pages 4,5,6,7,8 have choices -> converge at 9
  // Long (20 pages): pages 6,7,8,9,10,11,12 and 17,18,19 have choices -> converge at 13 and 20
  const branching: Record<number, number[]> = {};
  
  if (storyLength === 'short') {
    branching[1] = [2, 3]; // page 1: choose between 2 and 3
    branching[2] = [4];    // page 2: go to 4
    branching[3] = [4];    // page 3: go to 4
  } else if (storyLength === 'medium') {
    // First branch around page 4
    branching[4] = [5, 7]; // page 4: choose between 5 and 7
    branching[5] = [8];    // page 5: go to 8
    branching[6] = [8];    // page 6: go to 8 (alternative path)
    branching[7] = [9];    // page 7: go to 9
    branching[8] = [9];    // page 8: go to 9 (converge)
  } else if (storyLength === 'long') {
    // First branch around page 6
    branching[6] = [7, 10];   // page 6: choose between 7-9 and 10-12
    branching[7] = [13];      // page 7: go to 13
    branching[8] = [13];      // page 8: go to 13
    branching[9] = [13];      // page 9: go to 13
    branching[10] = [13];     // page 10: go to 13
    branching[11] = [13];     // page 11: go to 13
    branching[12] = [13];     // page 12: go to 13 (converge)
    
    // Second branch around page 17
    branching[17] = [18, 19]; // page 17: choose between 18 and 19
    branching[18] = [20];     // page 18: go to 20
    branching[19] = [20];     // page 19: go to 20 (converge)
  }

  const pages: StoryPage[] = parsed.data.pages.map((page, index) => {
    const targets = branching[index];
    if (!targets && page.choices?.length) throw new Error(`pages[${index}] must not have choices`);
    if (targets && page.choices?.length !== targets.length) throw new Error(`pages[${index}] needs exactly ${targets.length} choices`);
    return {
      text: page.text,
      sceneKey: `s${index}`,
      illustration: ILLUSTRATIONS.includes(page.illustration) ? page.illustration : fallbackIllustration,
      ...(targets ? { choices: targets.map((nextPage, choiceIndex) => ({ ...page.choices![choiceIndex], nextPage })) } : {}),
    };
  });

  const expectedQuizCount = lengthConfig.quizQuestions;
  const story: StoryData = {
    title: parsed.data.title,
    pages,
    quiz: parsed.data.quiz.slice(0, expectedQuizCount),
    length: storyLength,
  };
  validateChildSafety(story);
  return story;
}

export function validateChildSafety(story: StoryData): void {
  // Check title
  for (const text of Object.values(story.title)) {
    const hardBan = findHardBanTerm(text);
    if (hardBan) throw new ProviderFailure('child-safety', `banned hard-ban term in title: ${hardBan.word}`);
  }

  // Check pages
  for (let pageIndex = 0; pageIndex < story.pages.length; pageIndex++) {
    const page = story.pages[pageIndex];
    const pageTexts = [
      ...Object.values(page.text),
      ...(page.choices || []).flatMap((choice) => Object.values(choice.text)),
    ];

    for (const text of pageTexts) {
      if (text.length > MAX_PAGE_CHARS) throw new ProviderFailure('child-safety', `page ${pageIndex} exceeds length limit`);

      const hardBan = findHardBanTerm(text);
      if (hardBan) {
        throw new ProviderFailure('child-safety', `banned hard-ban term on page ${pageIndex}: ${hardBan.word}`);
      }

      const excessiveSoft = countSoftTerms(text);
      if (excessiveSoft.length > 2) {
        throw new ProviderFailure('child-safety', `excessive soft terms on page ${pageIndex}: ${excessiveSoft[0]?.word}`);
      }
    }
  }

  // Check quiz
  for (let qIdx = 0; qIdx < story.quiz.length; qIdx++) {
    const question = story.quiz[qIdx];
    const quizTexts = [
      ...Object.values(question.question),
      ...question.options.flatMap((opt) => Object.values(opt)),
    ];

    for (const text of quizTexts) {
      const hardBan = findHardBanTerm(text);
      if (hardBan) {
        throw new ProviderFailure('child-safety', `banned hard-ban term in quiz ${qIdx}: ${hardBan.word}`);
      }
    }
  }
}

function parseRequest(body: unknown): StoryRequest | null {
  const parsed = StoryRequestSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local';
}

function isRateLimited(ip: string, storyLength: StoryLength = 'short'): boolean {
  const now = Date.now();
  const weightedCost = RATE_LIMIT_WEIGHTS[storyLength];
  
  // Get recent requests within the window
  const recent = (rateLimits.get(ip) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  
  // Calculate total weighted cost of recent requests
  let totalWeightedCost = 0;
  for (const timestamp of recent) {
    // Estimate: requests within first 20s are likely short, 20-40s medium, 40-60s long
    // For simplicity, assume all recent requests have average weight
    totalWeightedCost += 1; // Base cost per request
  }
  
  // Check if adding this request would exceed the limit
  if (totalWeightedCost + weightedCost > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  
  recent.push(now);
  rateLimits.set(ip, recent);
  return false;
}

function cacheKey(req: StoryRequest): string {
  const length = req.storyLength || 'short';
  return JSON.stringify([req.settingId, req.lessonId, req.parentPurpose || '', req.language, req.gender, length]);
}

function logFailure(provider: string, failure: ProviderFailure): string {
  const detail = `${provider} ${failure.kind}: ${failure.message}`;
  console.error('[story] provider failure', detail);
  return detail;
}

function parseAndNormalize(rawText: string, fallbackIllustration: StoryPage['illustration'], storyLength: StoryLength = 'short'): StoryData {
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new ProviderFailure('invalid-json', 'model returned invalid JSON');
  }
  try {
    return normalizeStory(raw, fallbackIllustration, storyLength);
  } catch (error) {
    if (error instanceof ProviderFailure) throw error;
    throw new ProviderFailure('schema-failure', error instanceof Error ? error.message : 'model response failed validation');
  }
}

export function resetApiStateForTests(): void {
  rateLimits.clear();
  storyCache.clear();
  deadGroqModels.clear();
  deadGeminiModels.clear();
  loggedDeadModels.clear();
  geminiCircuitBreakers.clear();
}

/**
 * Generate a story asynchronously using job-based polling.
 * For Medium/Long stories, calls outline → chapters pipeline.
 * For Short stories, falls back to synchronous generation.
 * 
 * Returns jobId for client to poll via GET /api/story-status/:jobId
 */
async function generateStoryAsyncJob(req: StoryRequest, fallbackIllustration: StoryPage['illustration']): Promise<string> {
  const storyLength = req.storyLength || 'short';
  const lengthConfig = STORY_LENGTHS[storyLength];
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const job = createJob(jobId);

  // Start background job without awaiting
  (async () => {
    try {
      const prompt = buildUserPrompt(req);
      const errors: string[] = [];
      const providersToTry = AI_PROVIDER_ORDER.filter((p) => {
        if (p === 'groq') return GROQ_API_KEY;
        if (p === 'gemini') return GEMINI_API_KEY;
        return false;
      });

      for (const provider of providersToTry) {
        try {
          let result: GroqStoryResult | GeminiStoryResult | null = null;

          if (provider === 'groq') {
            result = await generateFromGroq(prompt, fallbackIllustration, storyLength);
          } else if (provider === 'gemini') {
            result = await generateFromGemini(prompt, fallbackIllustration, storyLength);
          }

          if (result) {
            // Mark job as complete
            const story: StoryData = {
              ...result.story,
              length: storyLength,
            };
            completeJob(jobId, story);
            // Also cache for synchronous requests
            const key = cacheKey(req);
            storyCache.set(key, { ...result, story, expiresAt: Date.now() + CACHE_TTL_MS });
            return;
          }
        } catch (error) {
          const failure = error instanceof ProviderFailure ? error : new ProviderFailure('provider', String(error));
          errors.push(logFailure(provider, failure));
          if (failure.kind === 'total-timeout') {
            failJob(jobId, 'Story generation timed out');
            return;
          }
        }
      }

      // All providers failed
      failJob(jobId, errors.join('; '));
    } catch (error) {
      failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
    }
  })().catch((err) => {
    console.error('[story] async job error', err);
    failJob(jobId, 'Internal server error');
  });

  return jobId;
}

export async function POSTAsync(request: Request): Promise<Response> {
  const req = parseRequest(await request.json().catch(() => null));
  if (!req) return Response.json({ error: 'Invalid request' }, { status: 400 });

  const requestedLength = req.storyLength || 'short';
  
  console.info('[story] POSTAsync request', {
    requestedLength,
    settingId: req.settingId,
    lessonId: req.lessonId,
  });

  if (isRateLimited(clientIp(request), requestedLength)) {
    console.warn('[story] async rate limited', { requestedLength });
    return Response.json({ error: 'You are creating stories too quickly. Please try again in a minute.' }, { status: 429 });
  }

  const fallbackIllustration = SETTINGS.find((setting) => setting.id === req.settingId)!.sceneKey as StoryPage['illustration'];

  try {
    const jobId = await generateStoryAsyncJob(req, fallbackIllustration);
    console.info('[story] async job created', { jobId, requestedLength });
    return Response.json({ jobId, statusUrl: `/api/story-status/${jobId}` }, { status: 202 });
  } catch (error) {
    console.error('[story] job creation error', { requestedLength, error: error instanceof Error ? error.message : String(error) });
    return Response.json({ error: 'Failed to create generation job' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const req = parseRequest(await request.json().catch(() => null));
  if (!req) return Response.json({ error: 'Invalid request' }, { status: 400 });

  const requestedLength = req.storyLength || 'short';
  const key = cacheKey(req);
  const cached = storyCache.get(key);
  const isCacheHit = cached && cached.expiresAt > Date.now();

  console.info('[story] POST request', {
    requestedLength,
    settingId: req.settingId,
    lessonId: req.lessonId,
    language: req.language,
    gender: req.gender,
    cacheStatus: isCacheHit ? 'hit' : 'miss',
  });

  if (isCacheHit) {
    console.info('[story] cache hit', { requestedLength, pageCount: cached.story.pages.length, quizCount: cached.story.quiz.length });
    return Response.json({
      story: cached.story,
      provider: cached.provider,
      ...(cached.model ? { model: cached.model } : {}),
      ...(cached.attempts ? { attempts: cached.attempts } : {}),
      ...(cached.elapsedMs ? { elapsedMs: cached.elapsedMs } : {}),
    });
  }

  if (isRateLimited(clientIp(request), requestedLength)) {
    console.warn('[story] rate limited', { requestedLength, ip: clientIp(request) });
    return Response.json({ error: 'You are creating stories too quickly. Please try again in a minute.' }, { status: 429 });
  }

  const prompt = buildUserPrompt(req);
  const fallbackIllustration = SETTINGS.find((setting) => setting.id === req.settingId)!.sceneKey as StoryPage['illustration'];
  const errors: string[] = [];
  const providersToTry = AI_PROVIDER_ORDER.filter((p) => {
    if (p === 'groq') return GROQ_API_KEY;
    if (p === 'gemini') return GEMINI_API_KEY;
    return false;
  });

  for (const provider of providersToTry) {
    try {
      if (provider === 'groq') {
        const result = await generateFromGroq(prompt, fallbackIllustration, requestedLength);
        storyCache.set(key, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
        console.info('[story] generated successfully', {
          requestedLength,
          actualLength: result.story.length,
          pageCount: result.story.pages.length,
          quizCount: result.story.quiz.length,
          provider: result.provider,
          model: result.model,
        });
        return Response.json(result);
      } else if (provider === 'gemini') {
        const result = await generateFromGemini(prompt, fallbackIllustration, requestedLength);
        storyCache.set(key, { ...result, expiresAt: Date.now() + CACHE_TTL_MS });
        console.info('[story] generated successfully', {
          requestedLength,
          actualLength: result.story.length,
          pageCount: result.story.pages.length,
          quizCount: result.story.quiz.length,
          provider: result.provider,
          model: result.model,
        });
        return Response.json(result);
      }
    } catch (error) {
      const failure = error instanceof ProviderFailure ? error : new ProviderFailure('provider', String(error));
      errors.push(logFailure(provider, failure));
      if (failure.kind === 'total-timeout') {
        return Response.json({ error: 'Story generation timed out', provider: 'template', fallbackReason: errors.join('; ') }, { status: 502 });
      }
    }
  }

  console.error('[story] generation failed', { requestedLength, errors });
  
  // If Medium or Long story generation failed, use template fallback instead of error
  if (requestedLength !== 'short') {
    console.warn('[story] falling back to template for', { requestedLength });
    const fallbackStory = buildStory({ 
      childName: 'our hero',
      hero: 'our hero',
      setting: SETTINGS.find((s) => s.id === req.settingId)!,
      lesson: LESSONS.find((l) => l.id === req.lessonId)!,
      avatar: { id: 'temp', name: 'Hero', color: '#000', skin: 'light', hair: 'black', gender: req.gender },
      language: req.language,
      storyLength: requestedLength as StoryLength,
    });
    return Response.json({ 
      story: fallbackStory, 
      provider: 'template', 
      fallbackReason: `AI generation failed for ${requestedLength} story: ${errors.join('; ')}` 
    });
  }
  
  return Response.json({ error: 'Story generation failed', provider: 'template', fallbackReason: errors.join('; ') }, { status: 502 });
}
