import { StoryConfig, StoryData, buildStory } from './storyData';

const HERO = '{{HERO}}';
const REQUEST_TIMEOUT_MS = 55_000;
const POLLING_INTERVAL_MS = 500;
const MAX_POLLING_ATTEMPTS = 120; // 60 seconds at 500ms intervals

export function fillHero<T>(value: T, name: string): T {
  if (typeof value === 'string') return value.split(HERO).join(name) as T;
  if (Array.isArray(value)) return value.map((v) => fillHero(v, name)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillHero(v, name)])) as T;
  }
  return value;
}

/**
 * Poll a job status endpoint until story is ready or fails.
 * Polls every POLLING_INTERVAL_MS with exponential backoff up to MAX_POLLING_ATTEMPTS.
 */
async function pollJobStatus(
  jobId: string,
  onProgress?: (status: 'generating' | 'complete' | 'failed', chaptersCount: number) => void,
): Promise<StoryData> {
  let attempt = 0;

  while (attempt < MAX_POLLING_ATTEMPTS) {
    attempt++;

    try {
      const res = await fetch(`/api/story-status/${jobId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Job not found or expired');
        }
        throw new Error(`Status API ${res.status}`);
      }

      const jobStatus = (await res.json()) as {
        jobId: string;
        status: 'generating' | 'complete' | 'failed';
        chapters: number;
        story?: StoryData;
        error?: string;
      };

      onProgress?.(jobStatus.status, jobStatus.chapters);

      if (jobStatus.status === 'complete') {
        if (!jobStatus.story?.pages?.length) {
          throw new Error('Received empty story from job');
        }
        return jobStatus.story;
      }

      if (jobStatus.status === 'failed') {
        throw new Error(jobStatus.error || 'Job failed without error message');
      }

      // Still generating, wait and retry
      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
    } catch (err) {
      if (err instanceof Error && err.message.includes('timeout')) {
        // Network timeout, retry
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL_MS));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Polling timeout: story generation took too long');
}

// Asks the server for an AI story; falls back to the built-in template if anything goes wrong.
export async function generateStory(
  config: StoryConfig,
  onProgress?: (status: 'generating' | 'complete' | 'failed', chaptersCount: number) => void,
): Promise<{ story: StoryData; provider: 'gemini' | 'groq' | 'template'; fallbackReason?: string }> {
  try {
    const res = await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      // Only ids are sent — the child's name stays in the browser.
      body: JSON.stringify({
        settingId: config.setting.id,
        lessonId: config.lesson.id,
        parentPurpose: config.parentPurpose,
        language: config.language,
        gender: config.avatar.gender,
        storyLength: config.storyLength,
      }),
    });
    if (!res.ok) throw new Error(`Story API ${res.status}`);

    const response = (await res.json()) as {
      story?: StoryData;
      provider?: 'gemini' | 'groq';
      fallbackReason?: string;
      jobId?: string;
      statusUrl?: string;
    };

    // Handle job-based response (async polling)
    if (response.jobId && response.statusUrl) {
      onProgress?.('generating', 0);
      const story = await pollJobStatus(response.jobId, onProgress);
      return { story: fillHero(story, config.childName || 'our hero'), provider: 'groq', fallbackReason: undefined };
    }

    // Handle synchronous response (direct story)
    if (response.story?.pages?.length) {
      return {
        story: fillHero(response.story, config.childName || 'our hero'),
        provider: response.provider || 'template',
        fallbackReason: response.fallbackReason,
      };
    }

    throw new Error('Empty story');
  } catch (err) {
    const fallbackReason = err instanceof Error ? err.message : String(err);
    console.warn('AI story unavailable, using template fallback', { reason: fallbackReason });
    onProgress?.('generating', 0);
    // Pass storyLength to buildStory for template fallback
    return { story: buildStory({ ...config, storyLength: config.storyLength }), provider: 'template', fallbackReason };
  }
}
