import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVATARS, LESSONS, SETTINGS, buildStory } from '../src/data/storyData';

const requestBody = JSON.stringify({ settingId: 'swat', lessonId: 'courage', language: 'urdu', gender: 'girl' });

const geminiStoryResponse = () => {
  const built = buildStory({ childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu', hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] });
  const raw = {
    title: built.title,
    pages: built.pages.map((page) => ({ text: page.text, illustration: page.illustration, ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}) })),
    quiz: built.quiz,
  };
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] }, finishReason: 'STOP' }] }), { status: 200 });
};

// Fresh module per test so env stubs (read at import time) take effect.
async function loadApi() {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_MODEL', 'gemini-primary');
  vi.stubEnv('GEMINI_FALLBACK_MODELS', 'gemini-primary');
  vi.stubEnv('GROQ_API_KEY', '');
  vi.resetModules();
  const api = await import('../api/story');
  api.resetApiStateForTests();
  return api;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Gemini retry policy', () => {
  it('retries a retryable HTTP failure once on the same model', async () => {
    vi.useFakeTimers();
    const { POST } = await loadApi();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockImplementationOnce(() => Promise.resolve(geminiStoryResponse()));
    vi.stubGlobal('fetch', fetchMock);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; attempts?: number };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('gemini');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const attemptLogs = errorLog.mock.calls.filter((call) => call[0] === '[story] gemini attempt');
    expect(attemptLogs).toHaveLength(1);
    expect(attemptLogs[0][1]).toMatchObject({ model: 'gemini-primary', attempt: 1, outcome: 'Gemini HTTP 503' });
  });

  it.each([400, 401, 403])('does not retry HTTP %s failures', async (status) => {
    vi.useFakeTimers();
    const { POST } = await loadApi();
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}', { status })));
    vi.stubGlobal('fetch', fetchMock);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody }));
    await vi.runAllTimersAsync();
    await responsePromise;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const expected = status === 400 ? 'Gemini bad request' : 'Gemini invalid API key or permission';
    expect(errorLog.mock.calls.some((call) => call[0] === '[story] gemini attempt' && (call[1] as { outcome: string }).outcome === expected)).toBe(true);
  });

  it('uses the next configured model after all primary attempts fail', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-primary');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', 'gemini-fallback');
    vi.stubEnv('GROQ_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('gemini-primary')) return Promise.resolve(new Response('{}', { status: 503 }));
      const rawStory = JSON.parse(JSON.stringify(buildStory({ childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu', hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] })));
      rawStory.pages = rawStory.pages.map((page: { text: unknown; illustration: string; choices?: { text: unknown }[] }) => ({
        text: page.text,
        illustration: page.illustration,
        ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}),
      }));
      return Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: rawStory.title, pages: rawStory.pages, quiz: rawStory.quiz }) }] } }] }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; model?: string; attempts?: number };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('gemini');
    expect(body.model).toBe('gemini-fallback');
    expect(body.attempts).toBe(3); // 2 on the primary (one retry), 1 on the fallback
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns the fallback signal when the total timeout ceiling is reached', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-primary');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', 'gemini-fallback');
    vi.stubEnv('GEMINI_TIMEOUT_MS', '20');
    vi.stubEnv('GENERATION_TOTAL_TIMEOUT_MS', '50');
    vi.stubEnv('GROQ_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    vi.stubGlobal('fetch', fetchMock);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; fallbackReason?: string };

    expect(response.status).toBe(502);
    expect(body.provider).toBe('template');
    expect(body.fallbackReason).toContain('total timeout');
  });

  it('skips a model after a 404 for the rest of the process', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'dead-model');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', 'next-model');
    vi.stubEnv('GROQ_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const makeRequest = () => new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } });
    const first = POST(makeRequest());
    await vi.runAllTimersAsync();
    await first;
    const firstCallCount = fetchMock.mock.calls.length;
    const second = POST(makeRequest());
    await vi.runAllTimersAsync();
    await second;

    expect(fetchMock.mock.calls.slice(0, firstCallCount).filter(([url]) => String(url).includes('dead-model'))).toHaveLength(1);
    expect(fetchMock.mock.calls.slice(firstCallCount).every(([url]) => !String(url).includes('dead-model'))).toBe(true);
  });

  it('retries once on the same model after a schema failure', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'schema-model');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', '');
    vi.stubEnv('GROQ_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();
    const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
    const built = buildStory(config);
    const raw = {
      title: built.title,
      pages: built.pages.map((page) => ({ text: page.text, illustration: page.illustration, ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}) })),
      quiz: built.quiz,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ...raw, quiz: [] }) }] } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; model?: string; attempts?: number };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('gemini');
    expect(body.model).toBe('schema-model');
    expect(body.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
