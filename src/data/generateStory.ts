import { StoryConfig, StoryData, StoryLength, buildStory } from './storyData';

const HERO = '{{HERO}}';
// A little longer than the server's own hard deadline for each length (see api/story.ts).
const REQUEST_TIMEOUT_MS: Record<StoryLength, number> = { short: 90_000, medium: 130_000, long: 190_000 };

export function fillHero<T>(value: T, name: string): T {
  if (typeof value === 'string') return value.split(HERO).join(name) as T;
  if (Array.isArray(value)) return value.map((v) => fillHero(v, name)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillHero(v, name)])) as T;
  }
  return value;
}

// Asks the server for an AI story; falls back to the built-in template if anything goes wrong.
export async function generateStory(
  config: StoryConfig,
): Promise<{ story: StoryData; provider: 'gemini' | 'groq' | 'template'; fallbackReason?: string }> {
  try {
    const res = await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS[config.storyLength ?? 'short']),
      // Only ids are sent — the child's name stays in the browser.
      body: JSON.stringify({
        settingId: config.setting.id,
        lessonId: config.lesson.id,
        parentPurpose: config.parentPurpose,
        language: config.language,
        gender: config.heroGender ?? 'girl',
        storyLength: config.storyLength,
      }),
    });
    if (!res.ok) throw new Error(`Story API ${res.status}`);

    const response = (await res.json()) as {
      story?: StoryData;
      provider?: 'gemini' | 'groq';
      fallbackReason?: string;
    };

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
    // Pass storyLength to buildStory for template fallback
    return { story: buildStory({ ...config, storyLength: config.storyLength }), provider: 'template', fallbackReason };
  }
}
