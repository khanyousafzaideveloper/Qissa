import { afterEach, describe, expect, it, vi } from 'vitest';
import { AVATARS, LESSONS, SETTINGS, buildStory } from '../src/data/storyData';

const requestBody = JSON.stringify({ settingId: 'swat', lessonId: 'courage', language: 'urdu', gender: 'girl' });

const buildValidStory = () => {
  const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
  const built = buildStory(config);
  return {
    title: built.title,
    pages: built.pages.map((page) => ({ text: page.text, illustration: page.illustration, ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}) })),
    quiz: built.quiz,
  };
};

const buildGroqSuccessResponse = (story?: unknown) => {
  const storyData = story || buildValidStory();
  return new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify(storyData) }, finish_reason: 'stop' }],
  }), { status: 200 });
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Groq gpt-oss improvements', () => {
  it('unwraps single top-level wrapper key before validation', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-120b');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const story = buildValidStory();
    const wrappedResponse = { story }; // Single-key wrapper
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(wrappedResponse) }, finish_reason: 'stop' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('groq');
  });

  it('retries on finish_reason=length with higher token limit', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-120b');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: truncated response
        return Promise.resolve(new Response(JSON.stringify({
          choices: [{ message: { content: '{"title":{"en":"T"}}' }, finish_reason: 'length' }],
        }), { status: 200 }));
      }
      // Second call: full response
      return Promise.resolve(buildGroqSuccessResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string };

    expect(response.status).toBe(200);
    expect(body.provider).toBe('groq');
    // Should have made 2 calls: first truncated, second with higher tokens
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('skips dead Groq model (404) for remaining requests', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'dead-model');
    vi.stubEnv('GROQ_FALLBACK_MODELS', 'openai/gpt-oss-120b');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string || '{}');
      if (JSON.stringify(body).includes('dead-model')) {
        return Promise.resolve(new Response('{}', { status: 404 }));
      }
      return Promise.resolve(buildGroqSuccessResponse());
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const makeRequest = () => new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } });

    // First request tries dead-model (404), then fallback (success)
    { const pending = POST(makeRequest()); await vi.runAllTimersAsync(); await pending; }

    // Second request should skip dead-model entirely
    { const pending = POST(makeRequest()); await vi.runAllTimersAsync(); await pending; }

    const deadModelCalls = fetchMock.mock.calls
      .filter((call) => String(call[1]?.body || '').includes('dead-model'));
    expect(deadModelCalls).toHaveLength(1); // Only called once (in first request)
  });
});

describe('Child-safety improvements', () => {
  it('does not reject innocent words containing Urdu banned-term letters', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-120b');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
    const built = buildStory(config);
    const story = {
      title: built.title,
      pages: built.pages.map((page) => ({
        text: { ...page.text, ur: page.text.ur + ' کھونا' }, // 'khona' contains letters from خون but is not the word
        illustration: page.illustration,
        ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}),
      })),
      quiz: built.quiz,
    };

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(story) }, finish_reason: 'stop' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200); // Should not reject innocent word
  });

  it('allows soft term (blood) up to 2 mentions', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-120b');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
    const built = buildStory(config);
    const story = {
      title: built.title,
      pages: built.pages.map((page, idx) => ({
        text: idx === 0 ? { ...page.text, en: page.text.en + ' She had a scraped knee with a little blood.' } : page.text,
        illustration: page.illustration,
        ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}),
      })),
      quiz: built.quiz,
    };

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(story) }, finish_reason: 'stop' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200); // Should accept soft term mention
  });

  it('rejects hard-ban term (kill) with clear error message', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', 'test-key');
    vi.stubEnv('GROQ_MODEL', 'openai/gpt-oss-120b');
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const config = { childName: 'Ayesha', avatar: AVATARS[0], language: 'urdu' as const, hero: 'Ayesha', setting: SETTINGS[1], lesson: LESSONS[0] };
    const built = buildStory(config);
    const story = {
      title: built.title,
      pages: built.pages.map((page, idx) => ({
        text: idx === 0 ? { ...page.text, en: 'The villain tried to kill the hero.' } : page.text,
        illustration: page.illustration,
        ...(page.choices ? { choices: page.choices.map((choice) => ({ text: choice.text })) } : {}),
      })),
      quiz: built.quiz,
    };

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(story) }, finish_reason: 'stop' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(502); // Should reject and fallback
    // Verify error was logged
    const errorCalls = errorLog.mock.calls.filter((call) => String(call).includes('hard-ban'));
    expect(errorCalls.length).toBeGreaterThan(0);
  });
});

describe('Gemini circuit breaker', () => {
  it('blocks model after 2 consecutive 503 failures for 60s', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-flaky');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', 'gemini-backup');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('gemini-flaky')) {
        return Promise.resolve(new Response('{}', { status: 503 }));
      }
      // backup succeeds
      const story = buildValidStory();
      return Promise.resolve(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(story) }] } }],
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const makeRequest = () => new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } });

    // First request: flaky fails once, then succeeds on backup
    { const pending = POST(makeRequest()); await vi.runAllTimersAsync(); await pending; }

    // Second request: flaky fails again (second time), circuit breaker activates
    { const pending = POST(makeRequest()); await vi.runAllTimersAsync(); await pending; }

    // Third request: within 60s window, flaky should be skipped entirely (circuit breaker open)
    vi.advanceTimersByTime(30_000); // 30s passed, still within window
    const thirdRequestCalls = fetchMock.mock.calls.length;
    { const pending = POST(makeRequest()); await vi.runAllTimersAsync(); await pending; }

    // Verify flaky model was skipped in 3rd request (no new calls to it)
    const flakyCallsInThirdRequest = fetchMock.mock.calls.slice(thirdRequestCalls)
      .filter((call) => String(call[0]).includes('gemini-flaky'));
    expect(flakyCallsInThirdRequest).toHaveLength(0); // Should be skipped
  });
});

describe('Gemini smart retry strategy', () => {
  it('retries 503 once then moves to next model', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-fails');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', 'gemini-works');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    let model1CallCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('gemini-fails')) {
        model1CallCount++;
        return Promise.resolve(new Response('{}', { status: 503 }));
      }
      const story = buildValidStory();
      return Promise.resolve(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(story) }] } }],
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;
    const body = await response.json() as { provider: string; model?: string };

    expect(response.status).toBe(200);
    expect(body.model).toBe('gemini-works');
    expect(model1CallCount).toBe(2); // Should retry once on same model, then move to next
  });

  it('honors Retry-After under 5s for 429', async () => {
    vi.useFakeTimers();
    vi.stubEnv('GROQ_API_KEY', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', 'gemini-limited');
    vi.stubEnv('GEMINI_FALLBACK_MODELS', '');
    vi.resetModules();
    const { POST, resetApiStateForTests } = await import('../api/story');
    resetApiStateForTests();

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }));
      }
      const story = buildValidStory();
      return Promise.resolve(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(story) }] } }],
      }), { status: 200 }));
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const responsePromise = POST(new Request('http://localhost/api/story', { method: 'POST', body: requestBody, headers: { 'content-type': 'application/json' } }));
    await vi.runAllTimersAsync();
    const response = await responsePromise;

    expect(response.status).toBe(200);
    expect(callCount).toBe(2); // Should retry after honoring Retry-After
  });
});
