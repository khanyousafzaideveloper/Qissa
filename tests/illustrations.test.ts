import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateIllustrations, illustrationCacheKey } from '../src/data/illustrations';
import { AVATARS, LESSONS, SETTINGS, buildStory, type StoryConfig } from '../src/data/storyData';

const config: StoryConfig = {
  childName: 'Ayesha',
  avatar: AVATARS[0],
  language: 'english',
  hero: 'Ayesha',
  setting: SETTINGS[0],
  lesson: LESSONS[0],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('optional illustrations', () => {
  it('creates stable cache keys from scene data', () => {
    expect(illustrationCacheKey('s2', 'bazaar')).toBe('s2:bazaar');
  });

  it('caches generated images locally and reuses them', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ imageUrl: 'data:image/png;base64,test' }), { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);
    const story = buildStory(config);

    const first = await generateIllustrations(story);
    expect(first.pages.every((page) => page.imageUrl === 'data:image/png;base64,test')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(story.pages.length);

    const second = await generateIllustrations(story);
    expect(second.pages.every((page) => page.imageUrl === 'data:image/png;base64,test')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(story.pages.length);
  });

  it('keeps the SVG fallback when image generation fails', async () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    const story = buildStory(config);

    const result = await generateIllustrations(story);
    expect(result.pages.some((page) => page.imageUrl)).toBe(false);
  });
});
