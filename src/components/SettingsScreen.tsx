import React, { useState } from 'react';
import { ArrowLeft, Check, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import { Button, Card, Logo, SkyPage, Toggle } from './ui';
import { AvatarSvg } from './Illustrations';
import { AVATARS, LANGUAGE_META, STORY_LENGTHS, type Language, type StoryLength } from '../data/storyData';
import type { Preferences } from '../data/preferences';
import type { NarrationSpeed } from '../lib/tts/useNarration';

interface SettingsScreenProps {
  preferences: Preferences;
  /** First visit: the hero has no name yet, so this doubles as onboarding. */
  isOnboarding: boolean;
  onSave: (prefs: Preferences) => void;
  onBack: () => void;
}

const LANGUAGES: Language[] = ['urdu', 'english', 'pashto'];
const LENGTH_EMOJI: Record<StoryLength, string> = { short: '📗', medium: '📘', long: '📚' };
const LENGTH_NAME: Record<StoryLength, string> = { short: 'Short', medium: 'Medium', long: 'Long' };
const SPEEDS: { value: NarrationSpeed; label: string; emoji: string }[] = [
  { value: 0.7, label: 'Slow', emoji: '🐢' },
  { value: 0.85, label: 'Gentle', emoji: '🐰' },
  { value: 1.0, label: 'Normal', emoji: '🐦' },
];

const Section: React.FC<{ title: string; emoji: string; children: React.ReactNode }> = ({ title, emoji, children }) => (
  <Card className="p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-800">
      <span className="text-2xl" aria-hidden>{emoji}</span> {title}
    </h2>
    <div className="mt-4">{children}</div>
  </Card>
);

const choiceClass = (selected: boolean) =>
  `relative rounded-2xl p-3 text-center transition-all duration-200 ${
    selected ? 'bg-sky2-50 ring-4 ring-sky2-400 scale-[1.03]' : 'bg-white ring-2 ring-sky2-100 hover:ring-sky2-300'
  }`;

const SelectedTick = () => (
  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky2-500 text-white shadow">
    <Check className="h-4 w-4" />
  </span>
);

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ preferences, isOnboarding, onSave, onBack }) => {
  const [draft, setDraft] = useState<Preferences>(preferences);
  const update = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const canSave = draft.childName.trim().length > 0;

  return (
    <SkyPage>
      <nav className="sticky top-0 z-50 border-b border-sky2-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo size={32} />
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 transition-colors hover:text-sky2-600">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-8">
        <div className="text-center">
          {isOnboarding ? (
            <>
              <div className="text-5xl" aria-hidden>👋</div>
              <h1 className="mt-2 text-4xl font-extrabold text-sky2-900">Let&apos;s meet your hero!</h1>
              <p className="mt-2 text-gray-600">Set this up once. Every new story will use these choices, and you can change them any time.</p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-sky2-700 shadow-sm">
                <SettingsIcon className="h-4 w-4" /> Settings
              </span>
              <h1 className="mt-3 text-4xl font-extrabold text-sky2-900">Story Settings</h1>
              <p className="mt-2 text-gray-600">These are used for every new story.</p>
            </>
          )}
        </div>

        <div className="mt-8 space-y-5">
          <Section title="Hero's name" emoji="⭐">
            <input
              autoFocus={isOnboarding}
              type="text"
              value={draft.childName}
              onChange={(e) => update('childName', e.target.value)}
              placeholder="Type a name…"
              maxLength={20}
              className="w-full rounded-2xl border-2 border-sky2-200 bg-white px-5 py-3 text-center font-display text-2xl font-bold text-gray-800 outline-none transition-all focus:border-sky2-500 focus:ring-4 focus:ring-sky2-100"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {([['girl', '👧', 'Girl'], ['boy', '👦', 'Boy']] as const).map(([value, emoji, label]) => (
                <button key={value} onClick={() => update('heroGender', value)} className={choiceClass(draft.heroGender === value)}>
                  <span className="text-2xl" aria-hidden>{emoji}</span>
                  <span className="ml-2 font-display text-lg font-bold text-gray-800">{label}</span>
                  {draft.heroGender === value && <SelectedTick />}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-gray-500">Helps the Urdu and Pashto stories use the right words.</p>
          </Section>

          <Section title="Pick an animal friend" emoji="🐾">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {AVATARS.map((a) => (
                <button key={a.id} onClick={() => update('avatarId', a.id)} className={choiceClass(draft.avatarId === a.id)}>
                  <AvatarSvg avatar={a} size={64} className="mx-auto h-auto w-full max-w-[64px]" />
                  <span className="mt-1 block text-xs font-bold text-gray-700 sm:text-sm">{a.name}</span>
                  {draft.avatarId === a.id && <SelectedTick />}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-gray-500">Cartoon avatars only. We never ask for photos.</p>
          </Section>

          <Section title="Story language" emoji="🌍">
            <div className="grid grid-cols-3 gap-3">
              {LANGUAGES.map((l) => (
                <button key={l} onClick={() => update('language', l)} className={choiceClass(draft.language === l)}>
                  <div className={`text-2xl font-bold text-sky2-700 ${l === 'english' ? 'font-display' : 'font-script'}`}>{LANGUAGE_META[l].native}</div>
                  <div className="mt-1 text-xs font-bold text-gray-500">{LANGUAGE_META[l].label}</div>
                  {draft.language === l && <SelectedTick />}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Story length" emoji="📏">
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(STORY_LENGTHS) as StoryLength[]).map((len) => (
                <button key={len} onClick={() => update('storyLength', len)} className={choiceClass(draft.storyLength === len)}>
                  <div className="text-3xl" aria-hidden>{LENGTH_EMOJI[len]}</div>
                  <div className="mt-1 font-display text-lg font-bold text-gray-800">{LENGTH_NAME[len]}</div>
                  <div className="text-xs text-gray-500">{STORY_LENGTHS[len].pages} pages</div>
                  {draft.storyLength === len && <SelectedTick />}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Reading aloud" emoji="🔊">
            <div className="space-y-3">
              <div>
                <div className="mb-2 text-sm font-bold text-gray-600">Reading speed</div>
                <div className="grid grid-cols-3 gap-3">
                  {SPEEDS.map((s) => (
                    <button key={s.value} onClick={() => update('narrationSpeed', s.value)} className={choiceClass(draft.narrationSpeed === s.value)}>
                      <div className="text-2xl" aria-hidden>{s.emoji}</div>
                      <div className="text-sm font-bold text-gray-700">{s.label}</div>
                      {draft.narrationSpeed === s.value && <SelectedTick />}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle
                checked={draft.autoRead}
                onChange={(v) => update('autoRead', v)}
                label="Read each page automatically"
                description="Starts reading aloud when a new page opens."
              />
              <Toggle
                checked={draft.useServerVoice}
                onChange={(v) => update('useServerVoice', v)}
                label="Use AI voice"
                description="Better Urdu and Pashto voices. The story text, including the hero's name, is sent to a voice service."
              />
            </div>
          </Section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sky2-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="hidden text-sm text-gray-500 sm:block">{canSave ? 'Saved on this device only.' : 'Add a name to continue.'}</span>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={!canSave}
            onClick={() => onSave({ ...draft, childName: draft.childName.trim() })}
            icon={isOnboarding ? <Sparkles className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          >
            {isOnboarding ? "Let's make a story!" : 'Save settings'}
          </Button>
        </div>
      </div>
    </SkyPage>
  );
};
