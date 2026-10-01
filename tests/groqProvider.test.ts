import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVATARS, LESSONS, SETTINGS, buildStory } from '../src/data/storyData';

const requestBody = JSON.stringify({ settingId: 'swat', lessonId: 'courage', language: 'urdu', gender: 'girl' });

const buildGroqSuccessResponse = () => {
  const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
  const built = buildStory(config);
  const raw = {
    title: built.title,
    pages: built.pages.map((page) => ({ text: page.text, illustration: page.illustration, ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}) })),
    quiz: built.quiz,
  };
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(raw) } }],
  }), { status: 200 });
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Groq provider', () => {
  it('succeeds with a valid story response', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'groq-primary');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const fetchMock = vi.fn().mockResolvedValue(buildGroqSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; model?: string; attempts?: number };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('groq');
    expect(body.model).toBe('groq-primary');
    expect(body.attempts).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('marks a model as dead after 404 and skips it in subsequent requests', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'dead-model');
    vi.stubEnv('GROQ_FALLBACK_MODELS', 'live-model');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.groq.com')) {
        const body = JSON.parse(arguments[1]?.body || '{}');
        if (JSON.stringify(body).includes('dead-model')) {
          return Promise.resolve(new Response('{}', { status: 404 }));
        }
        return Promise.resolve(buildGroqSuccessResponse());
      }
      return Promise.resolve(new Response('{}', { status: 500 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const makeRequest = () => new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } });

    // First request tries dead-model (404), then live-model (success)
    const firstResponse = await POST(makeRequest());
    await vi.runAllTimersAsync();
    const firstBody = await firstResponse.json() as { provider: string; model?: string };
    expect(firstBody.provider).toBe('groq');
    expect(firstBody.model).toBe('live-model');

    const firstCallCount = fetchMock.mock.calls.length;

    // Second request should skip dead-model entirely
    const secondResponse = await POST(makeRequest());
    await vi.runAllTimersAsync();
    const secondBody = await secondResponse.json() as { provider: string; model?: string };
    expect(secondBody.provider).toBe('groq');
    expect(secondBody.model).toBe('live-model');

    // Verify dead-model was only called once (in first request)
    const deadModelCalls = fetchMock.mock.calls
      .filter((call) => String(call[1]?.body || '').includes('dead-model'));
    expect(deadModelCalls).toHaveLength(1);
  });

  it('honors 429 Retry-After header and moves to next model if max retries exceeded', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'rate-limited-model');
    vi.stubEnv('GROQ_FALLBACK_MODELS', 'backup-model');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string || '{}');
      if (JSON.stringify(body).includes('rate-limited-model')) {
        return Promise.resolve(new Response('{}', { status: 429, headers: { 'retry-after': '1' } }));
      }
      return Promise.resolve(buildGroqSuccessResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; model?: string };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('groq');
    expect(body.model).toBe('backup-model');
  });

  it('retries once on the same model after a schema failure with error appended to prompt', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'schema-model');
    vi.stubEnv('GROQ_FALLBACK_MODELS', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call returns invalid quiz (< 3 items)
        const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
        const built = buildStory(config);
        const raw = {
          title: built.title,
          pages: built.pages.map((page) => ({ text: page.text, illustration: page.illustration, ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}) })),
          quiz: [], // Invalid: empty quiz
        };
        return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(raw) } }] }), { status: 200 }));
      }
      // Second call returns valid response
      return Promise.resolve(buildGroqSuccessResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; model?: string; attempts?: number };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('groq');
    expect(body.model).toBe('schema-model');
    expect(body.attempts).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Verify the second call's prompt includes the error message
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1]?.body as string || '{}');
    const secondCallPrompt = secondCallBody.messages[1]?.content || '';
    expect(secondCallPrompt).toContain('Your previous answer was invalid');
  });

  it('falls back to Gemini when all Groq models fail', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'groq-fail');
    vi.stubEnv('GROQ_FALLBACK_MODELS', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-success');
    vi.stubEnv('AI_PROVIDER_ORDER', 'groq,gemini');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.groq.com')) {
        return Promise.resolve(new Response('{}', { status: 503 }));
      }
      // Gemini success
      const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
      const built = buildStory(config);
      const raw = {
        title: built.title,
        pages: built.pages.map((page) => ({ text: page.text, illustration: page.illustration, ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}) })),
        quiz: built.quiz,
      };
      return Promise.resolve(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(raw) }] } }],
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; model?: string };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('gemini');
    expect(body.model).toBe('gemini-success');
  });

  it('returns template fallback when all providers are disabled', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('AI_PROVIDER_ORDER', 'groq,gemini');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    vi.stubGlobal('fetch', vi.fn());

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    const response = await responsePromise;
    const body = await response.json() as { provider: string; error?: string };

    expect(response.status).toBe(502);
    expect(body.provider).toBe('template');
    expect(body.error).toContain('Story generation failed');
  });

  it('respects AI_PROVIDER_ORDER configuration', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'groq-success');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-success');
    vi.stubEnv('AI_PROVIDER_ORDER', 'gemini,groq');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const fetchMock = vi.fn().mockResolvedValue(buildGroqSuccessResponse());
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string };

    expect(response.status).toBe(200);
    // Should use Gemini first since AI_PROVIDER_ORDER=gemini,groq
    expect(body.provider).toBe('gemini');
  });
});
