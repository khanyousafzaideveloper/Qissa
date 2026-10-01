import { z } from 'zod';

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || '';
const IMAGE_TIMEOUT_MS = 25_000;

const IllustrationRequestSchema = z.object({
  sceneKey: z.string().min(1),
  illustration: z.enum(['mountain', 'village', 'bazaar', 'eid', 'forest', 'school', 'night', 'journey']),
}).strict();

const SCENE_PROMPTS: Record<string, string> = {
  mountain: 'a bright, gentle Swat Valley mountain landscape',
  village: 'a warm Punjabi village with trees, homes, and a sunny path',
  bazaar: 'a colorful, friendly Peshawar bazaar with small shops',
  eid: 'a joyful Pakistani Eid celebration with lanterns and decorations',
  forest: 'a safe, sunny forest clearing with friendly birds',
  school: 'a welcoming Pakistani school courtyard with flowers',
  night: 'a calm, starry Pakistani village evening with a crescent moon',
  journey: 'a cheerful winding path through a Pakistani countryside landscape',
};

const imageCache = new Map<string, { expiresAt: number; imageUrl: string }>();
const CACHE_TTL_MS = 24 * 60 * 60_000;

function promptFor(illustration: string): string {
  return `Create a colorful, child-safe picture-book illustration of ${SCENE_PROMPTS[illustration] || 'a cheerful Pakistani story setting'}. Use soft shapes, warm natural light, culturally respectful details, no text, no logos, no violence, no frightening imagery, and no identifiable real people. Landscape 4:3 composition.`;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = IllustrationRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid illustration request' }, { status: 400 });

  const cached = imageCache.get(parsed.data.sceneKey);
  if (cached && cached.expiresAt > Date.now()) return Response.json({ imageUrl: cached.imageUrl, cached: true });
  if (!IMAGE_MODEL) return Response.json({ error: 'AI illustrations are not configured' }, { status: 503 });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: 'GEMINI_API_KEY not set' }, { status: 503 });

  try {
    const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        instances: [{ prompt: promptFor(parsed.data.illustration) }],
        parameters: { sampleCount: 1, aspectRatio: '4:3' },
      }),
    });
    if (!response.ok) return Response.json({ error: `Image model HTTP ${response.status}` }, { status: 502 });
    const data = await response.json() as { predictions?: { bytesBase64Encoded?: string; mimeType?: string }[] };
    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) return Response.json({ error: 'Image model returned no image' }, { status: 502 });
    const imageUrl = `data:${prediction.mimeType || 'image/png'};base64,${prediction.bytesBase64Encoded}`;
    imageCache.set(parsed.data.sceneKey, { imageUrl, expiresAt: Date.now() + CACHE_TTL_MS });
    return Response.json({ imageUrl, cached: false });
  } catch (error) {
    console.error('[illustration] generation failed', error instanceof Error ? error.message : String(error));
    return Response.json({ error: 'AI illustration unavailable' }, { status: 502 });
  }
}
