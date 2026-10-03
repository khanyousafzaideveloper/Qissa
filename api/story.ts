import { z } from 'zod';
import { AVATARS, SETTINGS, LESSONS, PARENT_PURPOSES, STORY_LENGTHS, buildStory, type LocalizedText, type StoryData, type StoryPage, type StoryLength } from '../src/data/storyData.js';
import { choiceTargets, describeLayoutForPrompt } from '../src/lib/story-topology.js';

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
const GROQ_TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS) || Infinity;

// Gemini configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-3.5-flash')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean);
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || Infinity;
const GEMINI_THINKING_LEVEL = process.env.GEMINI_THINKING_LEVEL || 'low';

// Generation constraints
const GENERATION_TOTAL_TIMEOUT_MS = Number(process.env.GENERATION_TOTAL_TIMEOUT_MS) || Infinity;

// A trilingual story is large (Urdu/Pashto script costs many tokens), so output budgets and
// timeouts grow with length. The *_TIMEOUT_MS env vars can only lower these.
const LENGTH_BUDGETS: Record<StoryLength, { outputTokens: number; attemptMs: number; totalMs: number }> = {
  short: { outputTokens: 8_000, attemptMs: 30_000, totalMs: 60_000 },
  medium: { outputTokens: 16_000, attemptMs: 50_000, totalMs: 100_000 },
  long: { outputTokens: 28_000, attemptMs: 80_000, totalMs: 160_000 },
};
const attemptTimeoutMs = (length: StoryLength, envLimit: number) => Math.min(envLimit, LENGTH_BUDGETS[length].attemptMs);
const totalTimeoutMs = (length: StoryLength) => Math.min(GENERATION_TOTAL_TIMEOUT_MS, LENGTH_BUDGETS[length].totalMs);
const GEMINI_MAX_ATTEMPTS = 2; // one retry per model, then move on: a child is watching the loading screen
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
  // Unknown scene names fall back to the setting's scene in normalizeStory instead of failing the story.
  illustration: z.string(),
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

const localizedSchema = {
  type: 'object',
  properties: { en: { type: 'string' }, ur: { type: 'string' }, ps: { type: 'string' } },
  required: ['en', 'ur', 'ps'],
  additionalProperties: false,
};

/** JSON Schema for a story of the given length, sent to Gemini (via toGeminiSchema), which enforces it while generating. */
function storyJsonSchema(length: StoryLength): Record<string, unknown> {
  const { pages: pageCount, quizQuestions } = STORY_LENGTHS[length];
  const pages = { minItems: pageCount, maxItems: pageCount };
  const quiz = { minItems: quizQuestions, maxItems: quizQuestions };
  return {
    type: 'object',
    properties: {
      title: localizedSchema,
      pages: {
        type: 'array', ...pages,
        items: {
          type: 'object',
          properties: {
            text: localizedSchema,
            illustration: { type: 'string', enum: [...illustrationValues] },
            // Always present (strict schemas need every field); empty on pages without choices.
            choices: {
              type: 'array', minItems: 0, maxItems: 2,
              items: { type: 'object', properties: { text: localizedSchema }, required: ['text'], additionalProperties: false },
            },
          },
          required: ['text', 'illustration', 'choices'],
          additionalProperties: false,
        },
      },
      quiz: {
        type: 'array', ...quiz,
        items: {
          type: 'object',
          properties: {
            question: localizedSchema,
            options: { type: 'array', minItems: 3, maxItems: 3, items: localizedSchema },
            answer: { type: 'integer' },
          },
          required: ['question', 'options', 'answer'],
          additionalProperties: false,
        },
      },
    },
    required: ['title', 'pages', 'quiz'],
    additionalProperties: false,
  };
}

/** Gemini's responseSchema is an OpenAPI subset: upper-case types, no additionalProperties. */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== 'object') return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => key !== 'additionalProperties')
      .map(([key, value]) => [key, key === 'type' && typeof value === 'string' ? value.toUpperCase() : toGeminiSchema(value)]),
  );
}

// Banned terms: split into HARD-BAN (never allowed) and SOFT (allowed 1-2x if not repetitive/violent context)
const HARD_BAN_TERMS = {
  en: ['kill', 'death', 'dead', 'weapon', 'gun', 'knife', 'murder', 'suicide', 'romance', 'adult', 'drugs'],
  ur: ['قتل', 'بندوق', 'چاقو'],
} as const;

// Frightening themes the prompt forbids for ages 4-8. "scary"/"afraid" stay allowed: fear-of-the-dark stories need them.
const FRIGHTENING_THEMES = ['ghost', 'ghosts', 'demon', 'demons', 'horror', 'zombie', 'zombies', 'haunted'];

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

Return ONLY valid JSON in exactly this shape (every text is an object with "en", "ur" and "ps"):
{"title": {"en","ur","ps"}, "pages": [{"text": {"en","ur","ps"}, "illustration": one of ${illustrationValues.join('|')}, "choices": [{"text": {"en","ur","ps"}}]}], "quiz": [{"question": {"en","ur","ps"}, "options": [3 × {"en","ur","ps"}], "answer": 0-2}]}
"choices" is an empty array on pages without choices. The request tells you the exact number of pages, the page layout (which pages have choices), and the number of quiz questions. Each quiz question has exactly 3 options.

Page 0 introduces ${HERO} and the setting. The story is a small branching adventure: at each decision point the child picks one of two paths, both paths make sense on their own, and they rejoin later. Quiz questions must be answerable whichever path the child picks.`;

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
    `Story structure: Your response MUST contain exactly ${lengthConfig.pages} pages (numbered 0 to ${lengthConfig.pages - 1}) and exactly ${quizRequirement}. Page layout:\n${describeLayoutForPrompt(storyLength)}`,
    `For a ${lengthConfig.pages}-page story: expand the narrative with more chapters, deeper character development, and additional adventures. Do not pad with repetition.`,
    'Write a fresh, original story.',
  ].filter(Boolean).join('\n');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, timeoutMessage: string, retryableOnTimeout: boolean): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Read the whole body before clearing the timer: a slow body would otherwise wait forever.
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await res.text();
    return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
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

/** Groq's own error text for a 400, trimmed for logs (never contains our key or the story). */
function groqErrorMessage(responseText: string): string {
  try {
    const message = (JSON.parse(responseText) as { error?: { message?: string } }).error?.message;
    if (message) return message.slice(0, 200);
  } catch {
    // not JSON
  }
  return responseText.slice(0, 200) || 'no details';
}

async function callGroqAttempt(prompt: string, model: string, deadlineAt: number, includeReasoningEffort: boolean, maxTokens: number, storyLength: StoryLength): Promise<string> {
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
    // Longer stories need more planning to keep page count and branching straight.
    body.reasoning_effort = storyLength === 'short' ? 'low' : 'medium';
  }

  // Plain JSON mode: Groq's strict json_schema rejects a whole story over one bad field, so the
  // shape comes from the prompt and our own validation (with a corrective retry) checks it.
  body.response_format = { type: 'json_object' };

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  }, Math.min(attemptTimeoutMs(storyLength, GROQ_TIMEOUT_MS), remainingMs), 'Groq request timed out', true);

  if (!res.ok) {
    const responseText = res.status === 400 ? await res.text().catch(() => '') : '';
    const removeField = res.status === 400 && /reasoning_effort|unsupported/i.test(responseText) ? 'reasoning_effort' : undefined;
    const retryable = [429, 500, 502, 503, 504].includes(res.status);
    const skipModel = res.status === 404;
    const reason = res.status === 400
      ? `bad request (${groqErrorMessage(responseText)})`
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

async function callGroqWithRetries(prompt: string, model: string, deadlineAt: number, storyLength: StoryLength): Promise<GroqRawResult> {
  const startedAt = Date.now();
  let includeReasoningEffort = true;
  // gpt-oss reasoning tokens count toward this limit too
  let maxTokens = LENGTH_BUDGETS[storyLength].outputTokens;

  for (let attempt = 1; attempt <= GROQ_MAX_ATTEMPTS; attempt += 1) {
    try {
      const text = await callGroqAttempt(prompt, model, deadlineAt, includeReasoningEffort, maxTokens, storyLength);
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
        maxTokens = Math.round(Math.min(maxTokens * 1.5, LENGTH_BUDGETS[storyLength].outputTokens * 1.5));
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
  const deadlineAt = startedAt + totalTimeoutMs(storyLength);
  const models = [...new Set([GROQ_MODEL, ...GROQ_FALLBACK_MODELS])];
  const errors: string[] = [];
  let attempts = 0;

  for (const model of models) {
    if (deadGroqModels.has(model)) continue;
    if (Date.now() >= deadlineAt) throw new ProviderFailure('total-timeout', 'Groq generation total timeout exceeded');

    let modelPrompt = prompt;
    for (let validationAttempt = 0; validationAttempt < 2; validationAttempt += 1) {
      try {
        const raw = await callGroqWithRetries(modelPrompt, model, deadlineAt, storyLength);
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

function geminiGenerationConfig(model: string, includeThinking: boolean, storyLength: StoryLength) {
  const config: Record<string, unknown> = {
    responseMimeType: 'application/json',
    responseSchema: toGeminiSchema(storyJsonSchema(storyLength)),
    maxOutputTokens: LENGTH_BUDGETS[storyLength].outputTokens,
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
  // Only overload-type failures count: retryable means HTTP 429/500/502/503/504 (see callGeminiAttempt), plus timeouts.
  if (!failure.retryable && !failure.message.includes('timed out')) return;

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

async function callGeminiAttempt(prompt: string, model: string, deadlineAt: number, includeThinking: boolean, storyLength: StoryLength): Promise<string> {
  if (!GEMINI_API_KEY) throw new ProviderFailure('config-error', 'GEMINI_API_KEY not set');
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) throw new ProviderFailure('total-timeout', 'Gemini generation total timeout exceeded');

  const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: geminiGenerationConfig(model, includeThinking, storyLength),
      safetySettings: ['HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'HARM_CATEGORY_DANGEROUS_CONTENT']
        .map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' })),
    }),
  }, Math.min(attemptTimeoutMs(storyLength, GEMINI_TIMEOUT_MS), remainingMs), 'Gemini request timed out', true);

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

async function callGeminiWithRetries(prompt: string, model: string, deadlineAt: number, storyLength: StoryLength): Promise<GeminiRawResult> {
  const startedAt = Date.now();
  let includeThinking = model.startsWith('gemini-3');
  let totalAttempts = 0;

  // Retry loop: up to GEMINI_MAX_ATTEMPTS on 429/500/502/503/504/timeout, then move to the next model.
  // A 429 asking us to wait more than 5s moves on straight away.
  for (let retry = 0; retry < GEMINI_MAX_ATTEMPTS; retry += 1) {
    try {
      const text = await callGeminiAttempt(prompt, model, deadlineAt, includeThinking, storyLength);
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

      const isLastAttempt = retry === GEMINI_MAX_ATTEMPTS - 1;
      const longRetryAfter = failure.retryAfterMs !== undefined && failure.retryAfterMs > 5_000;
      if (!failure.retryable || isLastAttempt || longRetryAfter) {
        throw new ProviderFailure(failure.kind, failure.message, false, failure.retryAfterMs, totalAttempts, failure.skipModel, failure.removeField);
      }

      // Wait before retry (a short retry-after from a 429 wins over our own backoff)
      const remainingMs = deadlineAt - Date.now();
      const delayMs = failure.retryAfterMs ?? Math.min(retryDelay(retry + 1), 8_000);
      if (remainingMs <= delayMs) throw new ProviderFailure('total-timeout', 'Gemini generation total timeout exceeded');
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new ProviderFailure('provider', 'Gemini failed after retries');
}

async function generateFromGemini(prompt: string, fallbackIllustration: StoryPage['illustration'], storyLength: StoryLength = 'short'): Promise<GeminiStoryResult> {
  if (!GEMINI_API_KEY) throw new ProviderFailure('config-error', 'GEMINI_API_KEY not set');
  const startedAt = Date.now();
  const deadlineAt = startedAt + totalTimeoutMs(storyLength);
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
        const raw = await callGeminiWithRetries(modelPrompt, model, deadlineAt, storyLength);
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

// Written out by hand because some type-checkers (including Vercel's) infer z.object fields as optional.
interface ModelStory {
  title: LocalizedText;
  pages: { text: LocalizedText; illustration: StoryPage['illustration']; choices?: { text: LocalizedText }[] }[];
  quiz: { question: LocalizedText; options: LocalizedText[]; answer: number }[];
}

const DEFAULT_CHOICES: Record<'branch' | 'continue', LocalizedText[]> = {
  branch: [
    { en: 'Try the first idea', ur: 'پہلا خیال آزماؤ', ps: 'لومړی فکر وآزمایه' },
    { en: 'Try the second idea', ur: 'دوسرا خیال آزماؤ', ps: 'دویم فکر وآزمایه' },
  ],
  continue: [{ en: 'Continue the adventure', ur: 'مہم جاری رکھو', ps: 'سفر ته دوام ورکړه' }],
};

function defaultChoiceText(choiceCount: number, choiceIndex: number): LocalizedText {
  return choiceCount === 2 ? DEFAULT_CHOICES.branch[choiceIndex] : DEFAULT_CHOICES.continue[0];
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

  // Choices come from the shared topology so the AI story, the template story and the reader agree.
  // The model only supplies choice wording: missing wording gets a gentle default and stray choices
  // on other pages are dropped, rather than throwing away an otherwise good story.
  const branching = choiceTargets(storyLength);
  const data = parsed.data as ModelStory;

  const pages: StoryPage[] = data.pages.map((page, index) => {
    const targets = branching[index];
    return {
      text: page.text,
      sceneKey: `s${index}`,
      illustration: ILLUSTRATIONS.includes(page.illustration) ? page.illustration : fallbackIllustration,
      ...(targets
        ? {
            choices: targets.map((nextPage, choiceIndex) => ({
              text: page.choices?.[choiceIndex]?.text ?? defaultChoiceText(targets.length, choiceIndex),
              nextPage,
            })),
          }
        : {}),
    };
  });

  const expectedQuizCount = lengthConfig.quizQuestions;
  const story: StoryData = {
    title: data.title,
    pages,
    quiz: data.quiz.slice(0, expectedQuizCount),
    length: storyLength,
  };
  validateChildSafety(story);
  return story;
}

export function validateChildSafety(story: StoryData): void {
  for (const [pageIndex, page] of story.pages.entries()) {
    const theme = tokenizeWords(page.text.en).find((word) => FRIGHTENING_THEMES.includes(word.toLowerCase()));
    if (theme) throw new ProviderFailure('child-safety', `banned child-safety theme on page ${pageIndex}: ${theme}`);
  }

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
  
  // Each earlier request counts as 1 (their lengths aren't stored); this one counts by its own length.
  const totalWeightedCost = recent.length;
  
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

// Safety net: however the providers behave, a child never waits past this; they get the template story instead.
const HARD_DEADLINE_EXTRA_MS = 15_000;

export async function POST(request: Request): Promise<Response> {
  const bodyText = await request.text().catch(() => '');
  const req = parseRequest((() => { try { return JSON.parse(bodyText); } catch { return null; } })());
  if (!req) return Response.json({ error: 'Invalid request' }, { status: 400 });

  const storyLength = req.storyLength || 'short';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<Response>((resolve) => {
    timer = setTimeout(() => {
      console.error('[story] hard deadline reached; serving template', { storyLength });
      resolve(Response.json({ story: templateStory(req), provider: 'template', fallbackReason: 'Story generation took too long' }));
    }, totalTimeoutMs(storyLength) + HARD_DEADLINE_EXTRA_MS);
  });
  const work = handleStory(new Request(request.url, { method: 'POST', headers: request.headers, body: bodyText }));
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

function templateStory(req: StoryRequest): StoryData {
  // HERO token, not a name: the browser swaps in the child's name, as with AI stories.
  return buildStory({
    childName: HERO,
    hero: HERO,
    setting: SETTINGS.find((s) => s.id === req.settingId)!,
    lesson: LESSONS.find((l) => l.id === req.lessonId)!,
    avatar: AVATARS[0],
    heroGender: req.gender,
    language: req.language,
    storyLength: req.storyLength || 'short',
  });
}

async function handleStory(request: Request): Promise<Response> {
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
    const fallbackStory = templateStory(req);
    return Response.json({ 
      story: fallbackStory, 
      provider: 'template', 
      fallbackReason: `AI generation failed for ${requestedLength} story: ${errors.join('; ')}` 
    });
  }
  
  return Response.json({ error: 'Story generation failed', provider: 'template', fallbackReason: errors.join('; ') }, { status: 502 });
}
