import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateStory } from '../src/data/generateStory';
import { AVATARS, LESSONS, SETTINGS, type StoryConfig } from '../src/data/storyData';

const config: StoryConfig = {
  childName: 'Ayesha',
  avatar: AVATARS[0],
  language: 'urdu',
  hero: 'Ayesha',
  setting: SETTINGS[0],
  lesson: LESSONS[0],
  storyLength: 'medium',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateStory result states', () => {
  it('returns the AI provider and fills the hero token on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      provider: 'gemini',
      story: {
        title: { en: '{{HERO}} story', ur: '{{HERO}} کی کہانی', ps: '{{HERO}} کیسه' },
        pages: [{ text: { en: 'Hello', ur: 'ہیلو', ps: 'سلام' } }],
        quiz: [],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const result = await generateStory(config);
    expect(result.provider).toBe('gemini');
    expect(result.story.title.en).toBe('Ayesha story');
  });

  it('returns a template provider and reason when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'unavailable' }), { status: 503 })));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await generateStory(config);
    expect(result.provider).toBe('template');
    expect(result.fallbackReason).toBe('Story API 503');
    expect(warning).toHaveBeenCalledWith('AI story unavailable, using template fallback', { reason: 'Story API 503' });
  });
});
