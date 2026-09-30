import React, { useState } from 'react';
import { Logo, Button, Card, FloatingDecor } from './ui';
import { AvatarSvg } from './Illustrations';
import { AVATARS, SETTINGS, LESSONS, PARENT_PURPOSES, Language, StoryConfig, Avatar, StorySetting, StoryLesson } from '../data/storyData';
import { ArrowLeft, ArrowRight, Check, Heart, Globe, User, MapPin, Sparkles, Star, BookOpen } from 'lucide-react';

interface CreatorProps {
  onComplete: (config: StoryConfig) => void;
  onBack: () => void;
  initialParentPurpose?: string;
}

const STEPS = ['name', 'avatar', 'language', 'setting', 'lesson', 'review'] as const;
const STEP_LABELS = [
  { label: 'Child Name', icon: User },
  { label: 'Avatar', icon: Sparkles },
  { label: 'Language', icon: Globe },
  { label: 'Setting', icon: MapPin },
  { label: 'Lesson', icon: Heart },
  { label: 'Review', icon: BookOpen },
];

const LANGUAGES: { id: Language; label: string; native: string; flag: string; color: string }[] = [
  { id: 'english', label: 'English', native: 'English', flag: '🇬🇧', color: 'sky2' },
  { id: 'urdu', label: 'Urdu', native: 'اردو', flag: '🇵🇰', color: 'emerald2' },
  { id: 'pashto', label: 'Pashto', native: 'پښتو', flag: '🇵🇰', color: 'saffron' },
];

export const StoryCreator: React.FC<CreatorProps> = ({ onComplete, onBack, initialParentPurpose }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [language, setLanguage] = useState<Language>('urdu');
  const [setting, setSetting] = useState<StorySetting | null>(null);
  const [lesson, setLesson] = useState<StoryLesson | null>(null);
  const [parentPurpose, setParentPurpose] = useState<string | undefined>(initialParentPurpose);

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return avatar !== null;
    if (step === 2) return language !== null;
    if (step === 3) return setting !== null;
    if (step === 4) return lesson !== null;
    if (step === 5) return true;
    return false;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      if (avatar && setting && lesson) {
        onComplete({ childName: name.trim(), avatar, language, hero: name.trim(), setting, lesson, parentPurpose });
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else onBack();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-saffron-50 via-rose2-50 to-sky2-50">
      <FloatingDecor />
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-saffron-100">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo size={32} />
          <button onClick={onBack} className="text-sm font-bold text-gray-500 hover:text-saffron-600 transition-colors">
            Cancel
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                    i < step ? 'bg-emerald2-500 text-white' :
                    i === step ? 'bg-gradient-to-r from-saffron-500 to-rose2-500 text-white scale-110 shadow-lg' :
                    'bg-white text-gray-400 ring-2 ring-gray-200'
                  }`}
                >
                  {i < step ? <Check className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-bold ${i === step ? 'text-saffron-600' : 'text-gray-400'}`}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-rose2-500 transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div key={step} className="animate-pop-in">
          {step === 0 && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-800">What's your hero's name?</h2>
              <p className="mt-2 text-gray-600">This will be the star of the story!</p>
              <div className="mx-auto mt-8 max-w-sm">
                <input
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canProceed() && handleNext()}
                  placeholder="Type a name..."
                  maxLength={20}
                  className="w-full rounded-2xl border-2 border-saffron-200 bg-white px-6 py-4 text-center text-2xl font-bold text-gray-800 outline-none transition-all focus:border-saffron-500 focus:ring-4 focus:ring-saffron-100"
                />
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['Ayesha', 'Bilal', 'Fatima', 'Hassan', 'Zainab'].map((n) => (
                    <button
                      key={n}
                      onClick={() => setName(n)}
                      className="rounded-full bg-saffron-100 px-4 py-2 text-sm font-bold text-saffron-700 hover:bg-saffron-200 transition-colors"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-800">Pick an avatar for {name || 'your hero'}!</h2>
              <p className="mt-2 text-gray-600">Choose a fun cartoon character. No photos needed!</p>
              <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-6">
                {AVATARS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAvatar(a)}
                    className={`group relative rounded-3xl p-4 transition-all duration-300 ${
                      avatar?.id === a.id
                        ? 'bg-white shadow-xl ring-4 ring-saffron-400 scale-105'
                        : 'bg-white/60 shadow-md ring-1 ring-saffron-100 hover:shadow-lg hover:scale-105'
                    }`}
                  >
                    <AvatarSvg avatar={a} size={64} className="mx-auto" />
                    <span className="mt-2 block text-xs font-bold text-gray-600">{a.name}</span>
                    {avatar?.id === a.id && (
                      <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald2-500 text-white shadow-lg">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-800">Which language for the story?</h2>
              <p className="mt-2 text-gray-600">You can switch between languages while reading!</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLanguage(l.id)}
                    className={`rounded-3xl p-6 transition-all duration-300 ${
                      language === l.id
                        ? 'bg-white shadow-xl ring-4 ring-saffron-400 scale-105'
                        : 'bg-white/60 shadow-md ring-1 ring-saffron-100 hover:shadow-lg hover:scale-105'
                    }`}
                  >
                    <div className="text-4xl">{l.flag}</div>
                    <div className="mt-3 text-lg font-extrabold text-gray-800">{l.label}</div>
                    <div className={`mt-1 text-2xl ${l.id === 'urdu' ? 'font-urdu' : ''} text-${l.color}-600`}>{l.native}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-800">Where should the story happen?</h2>
              <p className="mt-2 text-gray-600">Pick a familiar, magical place!</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {SETTINGS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSetting(s)}
                    className={`group relative overflow-hidden rounded-3xl p-1 transition-all duration-300 ${
                      setting?.id === s.id ? 'ring-4 ring-saffron-400 scale-105' : 'ring-1 ring-saffron-100 hover:scale-105'
                    }`}
                  >
                    <div className={`rounded-[1.4rem] bg-gradient-to-br ${s.gradient} p-6 text-left`}>
                      <div className="text-5xl">{s.emoji}</div>
                      <div className="mt-3 text-xl font-extrabold text-white text-shadow-soft">{s.label}</div>
                      <div className="mt-1 font-urdu text-lg text-white/90" dir="rtl">{s.labelUrdu}</div>
                    </div>
                    {setting?.id === s.id && (
                      <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg">
                        <Check className="w-5 h-5 text-emerald2-600" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-800">What should {name || 'the hero'} learn?</h2>
              <p className="mt-2 text-gray-600">Every great story teaches something beautiful.</p>
              {parentPurpose && (
                <div className="mx-auto mt-4 max-w-md rounded-2xl bg-sky2-100 p-3 text-sm font-bold text-sky2-700">
                  Parent Purpose: {PARENT_PURPOSES.find(p => p.id === parentPurpose)?.label}
                </div>
              )}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {LESSONS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLesson(l)}
                    className={`flex items-center gap-4 rounded-3xl p-5 text-left transition-all duration-300 ${
                      lesson?.id === l.id
                        ? 'bg-white shadow-xl ring-4 ring-saffron-400 scale-105'
                        : 'bg-white/60 shadow-md ring-1 ring-saffron-100 hover:shadow-lg hover:scale-105'
                    }`}
                  >
                    <div className="text-4xl">{l.emoji}</div>
                    <div>
                      <div className="text-lg font-extrabold text-gray-800">{l.label}</div>
                      <div className="font-urdu text-base text-gray-500" dir="rtl">{l.labelUrdu}</div>
                    </div>
                    {lesson?.id === l.id && (
                      <Check className="ml-auto w-6 h-6 text-emerald2-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-800">Ready for the adventure!</h2>
              <p className="mt-2 text-gray-600">Here's your story preview:</p>
              <Card className="mx-auto mt-8 max-w-lg p-6 text-left">
                <div className="flex items-center gap-4">
                  {avatar && <AvatarSvg avatar={avatar} size={64} />}
                  <div>
                    <div className="text-2xl font-extrabold text-gray-800">{name || 'Our Hero'}</div>
                    <div className="text-sm text-gray-500">the brave hero</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-gray-700"><Globe className="w-5 h-5 text-sky2-500" /> {LANGUAGES.find(l => l.id === language)?.label}</div>
                  <div className="flex items-center gap-2 text-gray-700"><MapPin className="w-5 h-5 text-emerald2-500" /> {setting?.label}</div>
                  <div className="flex items-center gap-2 text-gray-700"><Heart className="w-5 h-5 text-rose2-500" /> Lesson: {lesson?.label}</div>
                  {parentPurpose && (
                    <div className="flex items-center gap-2 text-gray-700"><Star className="w-5 h-5 text-amber2-500" /> Purpose: {PARENT_PURPOSES.find(p => p.id === parentPurpose)?.label}</div>
                  )}
                </div>
              </Card>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Sparkles className="w-4 h-4 text-saffron-500" />
                Tap "Create Story" to begin the magic!
              </div>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="mt-10 flex items-center justify-between">
          <Button variant="ghost" size="md" onClick={handleBack} icon={<ArrowLeft className="w-5 h-5" />}>
            Back
          </Button>
          <Button
            size="md"
            onClick={handleNext}
            className={canProceed() ? '' : 'opacity-50 pointer-events-none'}
            icon={step === STEPS.length - 1 ? <Sparkles className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
          >
            {step === STEPS.length - 1 ? 'Create Story!' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};
