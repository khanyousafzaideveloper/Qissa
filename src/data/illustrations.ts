import type { StoryData } from './storyData';

const IMAGE_CACHE_KEY = 'qissa.illustration-cache.v1';

type ImageCache = Record<string, string>;

function readCache(): ImageCache {
  if (typeof window === 'undefined') return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(IMAGE_CACHE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed as ImageCache : {};
  } catch {
    return {};
  }
}

function writeCache(cache: ImageCache): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // A full localStorage quota should not prevent SVG fallback rendering.
  }
}

export function illustrationCacheKey(sceneKey: string, illustration: string): string {
  return `${sceneKey}:${illustration}`;
}

export async function generateIllustrations(
  story: StoryData,
  onProgress?: (completed: number, total: number) => void,
): Promise<StoryData> {
  const cache = readCache();
  const pages = [...story.pages];
  const pending = pages.map(async (page, index) => {
    const key = illustrationCacheKey(page.sceneKey, page.illustration);
    if (cache[key]) {
      pages[index] = { ...page, imageUrl: cache[key] };
      onProgress?.(index + 1, pages.length);
      return;
    }
    try {
      const response = await fetch('/api/illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneKey: page.sceneKey, illustration: page.illustration }),
      });
      if (response.ok) {
        const data = await response.json() as { imageUrl?: string };
        if (data.imageUrl) {
          cache[key] = data.imageUrl;
          pages[index] = { ...page, imageUrl: data.imageUrl };
        }
      }
    } catch {
      // The reader keeps using its existing SVG illustration.
    } finally {
      onProgress?.(index + 1, pages.length);
    }
  });
  await Promise.all(pending);
  writeCache(cache);
  return { ...story, pages };
}
