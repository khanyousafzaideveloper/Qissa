import { beforeEach, describe, expect, it } from 'vitest';
import { AVATARS, LESSONS, SETTINGS, buildStory, type StoryConfig } from '../src/data/storyData';
import { deleteStory, loadStories, saveStory, setStoryFavorite, STORY_HISTORY_KEY, type StorageLike } from '../src/data/storyHistory';

function makeStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
}

function makeConfig(name: string): StoryConfig {
  return {
    childName: name,
    avatar: AVATARS[0],
    language: 'english',
    hero: name,
    setting: SETTINGS[0],
    lesson: LESSONS[0],
  };
}

describe('local story history', () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = makeStorage();
  });

  it('saves and reloads stories locally in newest-first order', () => {
    const first = buildStory(makeConfig('Ayesha'));
    const second = buildStory(makeConfig('Bilal'));
    saveStory(first, makeConfig('Ayesha'), 'gemini', storage);
    const saved = saveStory(second, makeConfig('Bilal'), 'template', storage);

    expect(saved).toHaveLength(2);
    expect(loadStories(storage).map((entry) => entry.config.childName)).toEqual(['Bilal', 'Ayesha']);
    expect(loadStories(storage)[0].provider).toBe('template');
  });

  it('toggles favorites and deletes only the selected story', () => {
    const first = buildStory(makeConfig('Ayesha'));
    const second = buildStory(makeConfig('Bilal'));
    const saved = saveStory(first, makeConfig('Ayesha'), 'gemini', storage);
    saveStory(second, makeConfig('Bilal'), 'gemini', storage);

    const favorite = setStoryFavorite(saved[0].id, true, storage);
    expect(favorite.find((entry) => entry.id === saved[0].id)?.favorite).toBe(true);

    const remaining = deleteStory(saved[0].id, storage);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].config.childName).toBe('Bilal');
  });

  it('ignores malformed or non-array storage data', () => {
    const values = new Map([[STORY_HISTORY_KEY, '{broken']]);
    const malformed: StorageLike = { getItem: (key) => values.get(key) || null, setItem: () => undefined };
    expect(loadStories(malformed)).toEqual([]);

    values.set(STORY_HISTORY_KEY, JSON.stringify({ story: 'not-an-array' }));
    expect(loadStories(malformed)).toEqual([]);
  });
});
