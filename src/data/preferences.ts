import { AVATARS, SETTINGS, type Avatar, type HeroGender, type Language, type StoryLength, type StorySetting } from './storyData';
import type { NarrationSpeed } from '../lib/tts/useNarration';

export const PREFERENCES_KEY = 'qissa.preferences.v1';

// Things a family sets once; the per-story choices (place, lesson) live in the creator.
export interface Preferences {
  childName: string;
  avatarId: string;
  heroGender: HeroGender;
  language: Language;
  storyLength: StoryLength;
  autoRead: boolean;
  narrationSpeed: NarrationSpeed;
  useServerVoice: boolean;
  lastSettingId: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  childName: '',
  avatarId: AVATARS[0].id,
  heroGender: 'girl',
  language: 'urdu',
  storyLength: 'short',
  autoRead: false,
  narrationSpeed: 0.85,
  useServerVoice: false,
  lastSettingId: SETTINGS[0].id,
};

export function loadPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (raw) return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    // Carry over the reader toggles stored before preferences existed.
    const legacyAutoRead = window.localStorage.getItem('qissa-auto-read');
    const legacyServerVoice = window.localStorage.getItem('qissa-use-server-voice');
    return {
      ...DEFAULT_PREFERENCES,
      autoRead: legacyAutoRead ? JSON.parse(legacyAutoRead) === true : DEFAULT_PREFERENCES.autoRead,
      useServerVoice: legacyServerVoice ? JSON.parse(legacyServerVoice) === true : DEFAULT_PREFERENCES.useServerVoice,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
    // Private mode or blocked storage: settings still apply for this visit.
  }
}

export function avatarFor(prefs: Preferences): Avatar {
  return AVATARS.find((a) => a.id === prefs.avatarId) ?? AVATARS[0];
}

export function settingFor(prefs: Preferences): StorySetting {
  return SETTINGS.find((s) => s.id === prefs.lastSettingId) ?? SETTINGS[0];
}
