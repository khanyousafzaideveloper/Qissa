import { afterEach, describe, expect, it, vi } from 'vitest';
import { callGemini } from '../api/story';
import { AVATARS, LESSONS, SETTINGS, buildStory } from '../src/data/storyData';

const successResponse = () => new Response(JSON.stringify({
  candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
}), { status: 200 });

const requestBody = JSON.stringify({ settingId: 'swat', lessonId: 'courage', language: 'urdu', gender: 'girl' });

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Gemini retry policy', () => {
  it('retries retryable HTTP failures up to three total attempts', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockImplementationOnce(() => Promise.resolve(successResponse()));
    vi.stubGlobal('fetch', fetchMock);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const resultPromise = callGemini('test prompt');
    await vi.runAllTimersAsync();
    await expect(resultPromise).resolves.toBe('{"ok":true}');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(errorLog).toHaveBeenCalledTimes(2);
    expect(errorLog.mock.calls[0][1]).toMatchObject({ model: 'gemini-3.5-flash-lite', attempt: 1, outcome: 'Gemini HTTP 429' });
    expect(errorLog.mock.calls[1][1]).toMatchObject({ model: 'gemini-3.5-flash-lite', attempt: 2, outcome: 'Gemini HTTP 503' });
  });

  it.each([400, 401, 403])('does not retry HTTP %s failures', async (status) => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(callGemini('test prompt')).rejects.toThrow(status === 400 ? 'bad request' : status === 401 || status === 403 ? 'invalid API key or permission' : `Gemini HTTP ${status}`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    expect(body.attempts).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(4);
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
