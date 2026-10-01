import { Language, LANGUAGE_META } from '../../data/storyData';

export interface VoiceInfo {
  voice: SpeechSynthesisVoice;
  score: number; // Higher score = better match
}

/**
 * Map language to preferred locale codes (in priority order).
 * Prefer locales with Natural, Online, Neural, or Google quality indicators.
 */
export const LANGUAGE_LOCALE_MAP: Record<Language, string[]> = {
  english: ['en-PK', 'en-IN', 'en-GB', 'en-US'],
  urdu: ['ur-PK', 'ur-IN', 'ur'],
  pashto: ['ps-AF', 'ps'],
};

const QUALITY_KEYWORDS = ['natural', 'online', 'neural', 'google'];

/**
 * Calculate a match score for a voice (higher = better).
 * Exact locale match: 100 + quality bonus
 * Language prefix match: 50 + quality bonus
 * Any other: 0
 */
export function scoreVoice(
  voice: SpeechSynthesisVoice,
  targetLocales: string[],
): number {
  const voiceLang = voice.lang.toLowerCase();
  let score = 0;

  // Check for exact locale match
  for (let i = 0; i < targetLocales.length; i++) {
    if (voiceLang === targetLocales[i].toLowerCase()) {
      score = 100 + (targetLocales.length - i);
      break;
    }
  }

  // Check for language prefix match (e.g., 'ur' in 'ur-PK')
  if (score === 0) {
    const langPrefix = targetLocales[0]?.split('-')[0];
    if (langPrefix && voiceLang.startsWith(langPrefix.toLowerCase())) {
      score = 50;
    }
  }

  // Add quality bonus
  const voiceNameLower = voice.name.toLowerCase();
  if (QUALITY_KEYWORDS.some((kw) => voiceNameLower.includes(kw))) {
    score += 10;
  }

  return score;
}

/**
 * Wait for voices to load asynchronously.
 * The Web Speech API loads voices asynchronously, so we poll and wait up to 2 seconds.
 */
export async function waitForVoices(maxWaitMs = 2000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      // Keep checking; voices may load asynchronously
      setTimeout(checkVoices, 100);
    };

    const timeout = setTimeout(() => {
      // Timeout: return whatever voices are available
      resolve(window.speechSynthesis.getVoices());
    }, maxWaitMs);

    const onVoicesChanged = () => {
      clearTimeout(timeout);
      const voices = window.speechSynthesis.getVoices();
      resolve(voices);
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    checkVoices();
  });
}

/**
 * Get the best voice for a given language.
 * Returns VoiceInfo with the voice and its match score, or null if no voice found.
 */
export async function getBestVoiceForLanguage(
  language: Language,
): Promise<VoiceInfo | null> {
  const voices = await waitForVoices();
  const targetLocales = LANGUAGE_LOCALE_MAP[language];

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -1;

  for (const voice of voices) {
    const score = scoreVoice(voice, targetLocales);
    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  if (bestVoice && bestScore >= 0) {
    return { voice: bestVoice, score: bestScore };
  }

  return null;
}

/**
 * Get all available voices for a language, sorted by match quality.
 */
export async function getVoicesForLanguage(
  language: Language,
): Promise<VoiceInfo[]> {
  const voices = await waitForVoices();
  const targetLocales = LANGUAGE_LOCALE_MAP[language];

  const matches: VoiceInfo[] = voices
    .map((voice) => ({
      voice,
      score: scoreVoice(voice, targetLocales),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches;
}

/**
 * Get the locale string for a language (used for SpeechSynthesisUtterance).
 */
export function getLocaleForLanguage(language: Language): string {
  return LANGUAGE_META[language].speechLocale;
}
