/**
 * Diagnostic script to test configured Groq and Gemini models
 * Usage: npm run check:ai
 * 
 * Tests each configured model with a tiny prompt and prints:
 * - Provider, model, status, latency, dead model flags (never prints API keys or request bodies)
 */

import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_FALLBACK_MODELS = (process.env.GROQ_FALLBACK_MODELS || 'openai/gpt-oss-20b')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const GROQ_TIMEOUT_MS = Math.min(Number(process.env.GROQ_TIMEOUT_MS || 20_000), 20_000);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash-lite,gemini-3.5-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const GEMINI_TIMEOUT_MS = Math.min(Number(process.env.GEMINI_TIMEOUT_MS || 25_000), 25_000);

const AI_PROVIDER_ORDER = (process.env.AI_PROVIDER_ORDER || 'groq,gemini')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const TEST_PROMPT = 'Return valid JSON with title: "Test", pages: [], quiz: []';
const GEMINI_TEST_PROMPT = 'Return the JSON {"title":{"en":"Test","ur":"ٹیسٹ","ps":"ٹیسٹ"},"pages":[],"quiz":[]}';

interface TestResult {
  provider: string;
  model: string;
  status: 'ok' | 'error' | 'timeout' | 'config-error' | '404-dead' | 'circuit-breaker';
  latencyMs?: number;
  message?: string;
}

async function testGroqModel(model: string): Promise<TestResult> {
  if (!GROQ_API_KEY) {
    return { provider: 'groq', model, status: 'config-error', message: 'GROQ_API_KEY not set' };
  }

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.8,
          max_tokens: 256,
          messages: [{ role: 'user', content: TEST_PROMPT }],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const statusMessage = res.status === 404
          ? 'model not found (DEAD: retire this model)'
          : res.status === 429
          ? 'rate limited'
          : res.status === 401 || res.status === 403
          ? 'invalid API key'
          : `HTTP ${res.status}`;
        const status = res.status === 404 ? '404-dead' : 'error';
        return { provider: 'groq', model, status, latencyMs: Date.now() - startedAt, message: statusMessage };
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        return { provider: 'groq', model, status: 'error', latencyMs: Date.now() - startedAt, message: 'no response text' };
      }

      return { provider: 'groq', model, status: 'ok', latencyMs: Date.now() - startedAt };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { provider: 'groq', model, status: 'timeout', latencyMs: GROQ_TIMEOUT_MS };
      }
      throw err;
    }
  } catch (error) {
    return {
      provider: 'groq',
      model,
      status: 'error',
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testGeminiModel(model: string): Promise<TestResult> {
  if (!GEMINI_API_KEY) {
    return { provider: 'gemini', model, status: 'config-error', message: 'GEMINI_API_KEY not set' };
  }

  const startedAt = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: GEMINI_TEST_PROMPT }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 256,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const statusMessage = res.status === 404
          ? 'model not found (DEAD: retire this model)'
          : res.status === 429
          ? 'rate limited'
          : res.status === 401 || res.status === 403
          ? 'invalid API key'
          : `HTTP ${res.status}`;
        const status = res.status === 404 ? '404-dead' : 'error';
        return { provider: 'gemini', model, status, latencyMs: Date.now() - startedAt, message: statusMessage };
      }

      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        return { provider: 'gemini', model, status: 'error', latencyMs: Date.now() - startedAt, message: 'no response text' };
      }

      return { provider: 'gemini', model, status: 'ok', latencyMs: Date.now() - startedAt };
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { provider: 'gemini', model, status: 'timeout', latencyMs: GEMINI_TIMEOUT_MS };
      }
      throw err;
    }
  } catch (error) {
    return {
      provider: 'gemini',
      model,
      status: 'error',
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function formatResult(result: TestResult): string {
  const provider = result.provider.padEnd(8);
  const model = result.model.padEnd(35);
  const statusText = result.status === '404-dead' ? 'DEAD-404' : result.status;
  const status = statusText.padEnd(12);
  const latency = result.latencyMs ? `${result.latencyMs}ms` : '-';
  const message = result.message ? ` | ${result.message}` : '';
  return `${provider} ${model} ${status} ${latency}${message}`;
}

async function main() {
  console.log('\n[check:ai] Testing configured AI providers...\n');
  console.log('Provider  Model                           Status       Latency');
  console.log('-'.repeat(80));

  const results: TestResult[] = [];

  // Test Groq models if enabled
  if (AI_PROVIDER_ORDER.includes('groq')) {
    if (!GROQ_API_KEY) {
      console.log(formatResult({ provider: 'groq', model: 'N/A', status: 'config-error', message: 'GROQ_API_KEY not set' }));
    } else {
      const groqModels = [GROQ_MODEL, ...GROQ_FALLBACK_MODELS];
      for (const model of groqModels) {
        const result = await testGroqModel(model);
        results.push(result);
        console.log(formatResult(result));
      }
    }
  }

  // Test Gemini models if enabled
  if (AI_PROVIDER_ORDER.includes('gemini')) {
    if (!GEMINI_API_KEY) {
      console.log(formatResult({ provider: 'gemini', model: 'N/A', status: 'config-error', message: 'GEMINI_API_KEY not set' }));
    } else {
      const geminiModels = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS];
      for (const model of geminiModels) {
        const result = await testGeminiModel(model);
        results.push(result);
        console.log(formatResult(result));
      }
    }
  }

  console.log('-'.repeat(80));

  const okCount = results.filter((r) => r.status === 'ok').length;
  const errorCount = results.filter((r) => r.status !== 'ok').length;
  console.log(`\nSummary: ${okCount} working, ${errorCount} failed\n`);

  if (okCount === 0 && results.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[check:ai] Fatal error:', error);
  process.exit(1);
});
