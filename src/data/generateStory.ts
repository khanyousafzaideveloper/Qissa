import { StoryConfig, StoryData, buildStory } from './storyData';

const HERO = '{{HERO}}';
const REQUEST_TIMEOUT_MS = 55_000;

function fillHero<T>(value: T, name: string): T {
  if (typeof value === 'string') return value.split(HERO).join(name) as T;
  if (Array.isArray(value)) return value.map((v) => fillHero(v, name)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillHero(v, name)])) as T;
  }
  return value;
}

// Asks the server for an AI story; falls back to the built-in template if anything goes wrong.
export async function generateStory(config: StoryConfig): Promise<{ story: StoryData; source: 'ai' | 'template' }> {
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
        gender: config.avatar.gender,
      }),
    });
    if (!res.ok) throw new Error(`Story API ${res.status}`);
    const { story } = (await res.json()) as { story: StoryData };
    if (!story?.pages?.length) throw new Error('Empty story');
    return { story: fillHero(story, config.childName || 'our hero'), source: 'ai' };
  } catch (err) {
    console.warn('AI story unavailable, using template', err);
    return { story: buildStory(config), source: 'template' };
  }
}
