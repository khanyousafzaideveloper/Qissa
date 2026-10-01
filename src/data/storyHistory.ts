import type { StoryConfig, StoryData } from './storyData';

export const STORY_HISTORY_KEY = 'qissa.story-history.v1';
const MAX_SAVED_STORIES = 50;

export interface SavedStory {
  id: string;
  story: StoryData;
  config: StoryConfig;
  provider: 'gemini' | 'groq' | 'template';
  createdAt: string;
  favorite: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function loadStories(storage: StorageLike | null = browserStorage()): SavedStory[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORY_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as SavedStory[] : [];
  } catch {
    return [];
  }
}

function writeStories(stories: SavedStory[], storage: StorageLike | null): SavedStory[] {
  if (!storage) return stories;
  storage.setItem(STORY_HISTORY_KEY, JSON.stringify(stories.slice(0, MAX_SAVED_STORIES)));
  return stories.slice(0, MAX_SAVED_STORIES);
}

export function saveStory(
  story: StoryData,
  config: StoryConfig,
  provider: SavedStory['provider'],
  storage: StorageLike | null = browserStorage(),
): SavedStory[] {
  const entry: SavedStory = {
    id: makeId(),
    story,
    config,
    provider,
    createdAt: new Date().toISOString(),
    favorite: false,
  };
  return writeStories([entry, ...loadStories(storage)], storage);
}

export function setStoryFavorite(
  id: string,
  favorite: boolean,
  storage: StorageLike | null = browserStorage(),
): SavedStory[] {
  return writeStories(loadStories(storage).map((entry) => entry.id === id ? { ...entry, favorite } : entry), storage);
}

export function deleteStory(id: string, storage: StorageLike | null = browserStorage()): SavedStory[] {
  return writeStories(loadStories(storage).filter((entry) => entry.id !== id), storage);
}
