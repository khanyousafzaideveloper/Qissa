import React, { useState } from 'react';
import { Button, Card, Logo, SkyPage } from './ui';
import { AvatarSvg } from './Illustrations';
import { SETTINGS, LESSONS, PARENT_PURPOSES, LANGUAGE_META, STORY_LENGTHS, StoryConfig, StorySetting, StoryLesson } from '../data/storyData';
import { avatarFor, settingFor, type Preferences } from '../data/preferences';
import { ArrowLeft, Check, Heart, Settings as SettingsIcon, Sparkles } from 'lucide-react';

interface CreatorProps {
  preferences: Preferences;
  onComplete: (config: StoryConfig) => void;
  onBack: () => void;
  onOpenSettings: () => void;
  initialParentPurpose?: string;
}

const LENGTH_NAME = { short: 'Short', medium: 'Medium', long: 'Long' } as const;

const LESSON_COLORS: Record<string, string> = {
  courage: 'from-amber2-300 to-amber2-400',
  kindness: 'from-rose2-300 to-rose2-400',
  honesty: 'from-sky2-300 to-sky2-500',
  sharing: 'from-emerald2-300 to-emerald2-500',
};

const StepTitle: React.FC<{ num: number; children: React.ReactNode }> = ({ num, children }) => (
  <h2 className="flex items-center gap-3 text-2xl font-extrabold text-sky2-900">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky2-500 font-display text-lg text-white shadow-md">{num}</span>
    {children}
  </h2>
);

const Tick = () => (
  <span className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sky2-600 shadow-lg">
    <Check className="h-5 w-5" strokeWidth={3} />
  </span>
);

// One screen per story: who it's for comes from Settings; only place and lesson are asked each time.
export const StoryCreator: React.FC<CreatorProps> = ({ preferences, onComplete, onBack, onOpenSettings, initialParentPurpose }) => {
  const [setting, setSetting] = useState<StorySetting>(settingFor(preferences));
  const [lesson, setLesson] = useState<StoryLesson | null>(null);
  const avatar = avatarFor(preferences);
  const name = preferences.childName;
  const purpose = PARENT_PURPOSES.find((p) => p.id === initialParentPurpose);

  const handleCreate = () => {
    if (!lesson) return;
    onComplete({
      childName: name,
      hero: name,
      avatar,
      heroGender: preferences.heroGender,
      language: preferences.language,
      storyLength: preferences.storyLength,
      setting,
      lesson,
      parentPurpose: initialParentPurpose,
    });
  };

  return (
    <SkyPage>
      <nav className="sticky top-0 z-50 border-b border-sky2-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo size={32} />
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 transition-colors hover:text-sky2-600">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 pb-32 pt-6">
        {/* Who the story is for — set once in Settings */}
        <Card className="flex items-center gap-4 p-4 sm:p-5">
          <div className="rounded-full bg-sky2-100 p-1.5">
            <AvatarSvg avatar={avatar} size={64} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-sky2-600">A new story for</div>
            <div className="truncate font-display text-2xl font-extrabold text-gray-800">{name}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-sky2-50 px-2.5 py-0.5 text-xs font-bold text-sky2-700">🌍 {LANGUAGE_META[preferences.language].label}</span>
              <span className="rounded-full bg-sky2-50 px-2.5 py-0.5 text-xs font-bold text-sky2-700">📏 {LENGTH_NAME[preferences.storyLength]} · {STORY_LENGTHS[preferences.storyLength].pages} pages</span>
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-sky2-100 px-3 py-2 text-sm font-bold text-sky2-700 transition-colors hover:bg-sky2-200"
          >
            <SettingsIcon className="h-4 w-4" /> <span className="hidden sm:inline">Change</span>
          </button>
        </Card>

        {purpose && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm font-bold text-sky2-800 ring-1 ring-sky2-200">
            <Heart className="h-4 w-4 text-rose2-500" /> Parent topic: {purpose.label}
          </div>
        )}

        <section className="mt-8">
          <StepTitle num={1}>Where should the adventure happen?</StepTitle>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {SETTINGS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSetting(s)}
                className={`relative overflow-hidden rounded-3xl text-left transition-all duration-200 ${
                  setting.id === s.id ? 'ring-4 ring-sky2-500 ring-offset-2 ring-offset-sky2-100 scale-[1.03] shadow-xl' : 'shadow-md hover:scale-[1.02] hover:shadow-lg'
                }`}
              >
                <div className={`h-full bg-gradient-to-br ${s.gradient} p-4 sm:p-5`}>
                  <div className="text-4xl sm:text-5xl" aria-hidden>{s.emoji}</div>
                  <div className="mt-2 font-display text-lg font-extrabold leading-tight text-white text-shadow-soft">{s.label}</div>
                  <div className="font-urdu text-sm text-white/90" dir="rtl">{s.labelUrdu}</div>
                </div>
                {setting.id === s.id && <Tick />}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <StepTitle num={2}>What should {name} learn?</StepTitle>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {LESSONS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLesson(l)}
                className={`relative overflow-hidden rounded-3xl text-left transition-all duration-200 ${
                  lesson?.id === l.id ? 'ring-4 ring-sky2-500 ring-offset-2 ring-offset-sky2-100 scale-[1.03] shadow-xl' : 'shadow-md hover:scale-[1.02] hover:shadow-lg'
                }`}
              >
                <div className={`h-full bg-gradient-to-br ${LESSON_COLORS[l.id] ?? 'from-sky2-300 to-sky2-500'} p-4 sm:p-5`}>
                  <div className="text-4xl sm:text-5xl" aria-hidden>{l.emoji}</div>
                  <div className="mt-2 font-display text-lg font-extrabold leading-tight text-white text-shadow-soft">{l.label}</div>
                  <div className="font-urdu text-sm text-white/90" dir="rtl">{l.labelUrdu}</div>
                </div>
                {lesson?.id === l.id && <Tick />}
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sky2-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <span className="hidden text-sm font-bold text-gray-500 sm:block">
            {lesson ? `${setting.emoji} ${setting.label} · ${lesson.emoji} ${lesson.label}` : 'Pick a lesson to begin'}
          </span>
          <Button size="lg" className="w-full sm:w-auto" disabled={!lesson} onClick={handleCreate} icon={<Sparkles className="h-5 w-5" />}>
            Create my story!
          </Button>
        </div>
      </div>
    </SkyPage>
  );
};
