import React, { useEffect, useState } from 'react';
import { Landing } from './components/Landing';
import { AvatarSvg } from './components/Illustrations';
import { MyStories } from './components/MyStories';
import { StoryCreator } from './components/StoryCreator';
import { StoryReader } from './components/StoryReader';
import { StoryQuiz } from './components/StoryQuiz';
import { StoryGenerationError } from './components/StoryGenerationError';
import { IllustrationChoice } from './components/IllustrationChoice';
import { SettingsScreen } from './components/SettingsScreen';
import { Logo, Button, Card, SkyPage, FloatingDecor } from './components/ui';
import { PARENT_PURPOSES, StoryConfig, StoryData } from './data/storyData';
import { generateStory } from './data/generateStory';
import { generateIllustrations } from './data/illustrations';
import { loadPreferences, savePreferences, type Preferences } from './data/preferences';
import { deleteStory, loadStories, saveStory, setStoryFavorite, SavedStory } from './data/storyHistory';
import { Heart, ArrowLeft, Moon, School, Share2, ShieldCheck, Sparkles } from 'lucide-react';

const ILLUSTRATIONS_ENABLED = import.meta.env.VITE_ENABLE_AI_ILLUSTRATIONS === 'true';

type View = 'landing' | 'settings' | 'creator' | 'loading' | 'generation-error' | 'illustrations' | 'reader' | 'quiz' | 'parent' | 'stories';
type GenerationResult = Awaited<ReturnType<typeof generateStory>>;

const PARENT_ICONS: Record<string, React.ElementType> = {
  darkness: Moon,
  school: School,
  sharing: Share2,
  bullying: ShieldCheck,
};

function App() {
  const [view, setView] = useState<View>('landing');
  const [config, setConfig] = useState<StoryConfig | null>(null);
  const [story, setStory] = useState<StoryData | null>(null);
  const [storyProvider, setStoryProvider] = useState<GenerationResult['provider'] | null>(null);
  const [pendingResult, setPendingResult] = useState<GenerationResult | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [parentPurpose, setParentPurpose] = useState<string | undefined>(undefined);
  const [preferences, setPreferences] = useState<Preferences>(loadPreferences);
  const [settingsReturnView, setSettingsReturnView] = useState<View>('landing');

  useEffect(() => {
    setSavedStories(loadStories());
  }, []);

  useEffect(() => {
    if (view !== 'loading') return undefined;
    const timer = window.setInterval(() => setLoadingStep((step) => (step + 1) % 3), 1800);
    return () => window.clearInterval(timer);
  }, [view]);

  const finishStory = (result: GenerationResult, cfg: StoryConfig) => {
    setSavedStories(saveStory(result.story, cfg, result.provider));
    setStory(result.story);
    setStoryProvider(result.provider);
    setPendingResult(null);
    setView('reader');
  };

  const openGeneratedStory = (result: GenerationResult, cfg: StoryConfig) => {
    // The "add scene images?" step only makes sense once an image model is configured.
    if (result.provider === 'template' || !ILLUSTRATIONS_ENABLED) {
      finishStory(result, cfg);
      return;
    }
    setPendingResult(result);
    setView('illustrations');
  };

  const openSettings = (returnTo: View) => {
    setSettingsReturnView(returnTo);
    setView('settings');
  };

  // First-time families set up the hero before the creator; afterwards it opens straight away.
  const openCreator = (purpose?: string) => {
    setParentPurpose(purpose);
    if (preferences.childName) setView('creator');
    else openSettings('creator');
  };

  const handleSaveSettings = (prefs: Preferences) => {
    setPreferences(prefs);
    savePreferences(prefs);
    setView(settingsReturnView);
  };

  const handleCreate = async (cfg: StoryConfig) => {
    const nextPrefs = { ...preferences, lastSettingId: cfg.setting.id };
    setPreferences(nextPrefs);
    savePreferences(nextPrefs);
    setConfig(cfg);
    setPendingResult(null);
    setLoadingStep(0);
    setView('loading');
    const result = await generateStory(cfg);
    openGeneratedStory(result, cfg);
  };

  const handleUseOfflineStory = () => {
    if (config && pendingResult) finishStory(pendingResult, config);
  };

  const handleGenerateIllustrations = async () => {
    if (!config || !pendingResult) return;
    const story = await generateIllustrations(pendingResult.story);
    finishStory({ ...pendingResult, story }, config);
  };

  const handleSkipIllustrations = () => {
    if (config && pendingResult) finishStory(pendingResult, config);
  };

  const handleOpenStory = (entry: SavedStory) => {
    setConfig(entry.config);
    setStory(entry.story);
    setStoryProvider(entry.provider);
    setView('reader');
  };

  const handleToggleFavorite = (entry: SavedStory) => {
    setSavedStories(setStoryFavorite(entry.id, !entry.favorite));
  };

  const handleDeleteStory = (entry: SavedStory) => {
    if (window.confirm(`Delete "${entry.story.title.en}" from this device?`)) {
      setSavedStories(deleteStory(entry.id));
    }
  };

  const handleParentSelect = (purposeId: string) => {
    openCreator(purposeId);
  };

  const handleQuizComplete = () => {
    setView('quiz');
  };

  const handleReplay = () => {
    if (story) setView('reader');
  };

  if (view === 'landing') {
    return (
      <Landing
        onCreate={() => openCreator()}
        onParentMode={() => setView('parent')}
        onMyStories={() => setView('stories')}
        onSettings={() => openSettings('landing')}
      />
    );
  }

  if (view === 'settings') {
    return (
      <SettingsScreen
        preferences={preferences}
        isOnboarding={!preferences.childName}
        onSave={handleSaveSettings}
        onBack={() => setView(settingsReturnView === 'creator' && !preferences.childName ? 'landing' : settingsReturnView)}
      />
    );
  }

  if (view === 'stories') {
    return (
      <MyStories
        stories={savedStories}
        onCreate={() => openCreator()}
        onOpen={handleOpenStory}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteStory}
        onHome={() => setView('landing')}
      />
    );
  }

  if (view === 'parent') {
    return (
      <SkyPage>
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-sky2-100">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Logo size={32} />
            <button onClick={() => setView('landing')} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-sky2-600 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </nav>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-bold text-sky2-700 shadow-sm">
              <Heart className="w-4 h-4" /> For Parents
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-sky2-900">Parent Purpose Mode</h1>
            <p className="mt-3 text-lg text-gray-600">
              Choose a topic and Qissa will create a gentle story to help your child with a big feeling. The story weaves the lesson naturally into a fun adventure.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {PARENT_PURPOSES.map((p) => {
              const Icon = PARENT_ICONS[p.id] || Heart;
              return (
                <Card key={p.id} className="p-6 cursor-pointer group" onClick={() => handleParentSelect(p.id)}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky2-100 transition-colors group-hover:bg-sky2-500">
                      <Icon className="w-6 h-6 text-sky2-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{p.label}</h3>
                      <p className="mt-1 text-sm text-gray-600">Create a story that gently addresses this topic.</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-sky2-600 group-hover:text-sky2-700">
                        Create Story →
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="mt-8 rounded-2xl bg-emerald2-50 p-4 text-center text-sm text-emerald2-700">
            <ShieldCheck className="inline w-4 h-4 mr-1.5" />
            All stories are safe, positive, and age-appropriate. We never collect children's photos.
          </div>
        </div>
      </SkyPage>
    );
  }

  if (view === 'creator') {
    return (
      <StoryCreator
        preferences={preferences}
        onComplete={handleCreate}
        onBack={() => setView('landing')}
        onOpenSettings={() => openSettings('creator')}
        initialParentPurpose={parentPurpose}
      />
    );
  }

  if (view === 'loading') {
    const loadingMessages = [
      ['Finding a bright idea', 'اچھی کہانی کا خیال آ رہا ہے'],
      ['Adding a little wonder', 'کہانی میں جادو شامل ہو رہا ہے'],
      ['Polishing the pages', 'صفحات تیار ہو رہے ہیں'],
    ];
    return (
      <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-sky2-500 via-sky2-400 to-sky2-200 px-4 text-center">
        <FloatingDecor />
        <div className="relative rounded-full bg-white/90 p-3 shadow-xl animate-bounce-soft">
          {config && <AvatarSvg avatar={config.avatar} size={88} />}
        </div>
        <Sparkles className="relative w-10 h-10 text-amber2-300 animate-twinkle" />
        <h1 className="relative text-3xl font-extrabold text-white text-shadow-soft">{loadingMessages[loadingStep][0]}</h1>
        <p className="relative font-urdu text-xl text-white" dir="rtl">{loadingMessages[loadingStep][1]}</p>
        <p className="relative font-bold text-sky2-900/70">Writing {config?.childName}&apos;s story…</p>
        
      </div>
    );
  }

  if (view === 'generation-error') {
    return (
      <StoryGenerationError
        childName={config?.childName}
        reason={pendingResult?.fallbackReason}
        onRetry={() => config && handleCreate(config)}
        onUseOffline={handleUseOfflineStory}
        onBack={() => { setPendingResult(null); setView('creator'); }}
      />
    );
  }

  if (view === 'illustrations' && pendingResult) {
    return (
      <IllustrationChoice
        story={pendingResult.story}
        onGenerate={handleGenerateIllustrations}
        onSkip={handleSkipIllustrations}
        onBack={() => { setPendingResult(null); setView('creator'); }}
      />
    );
  }

  if (view === 'reader' && story && config) {
    return (
      <StoryReader
        story={story}
        config={config}
        isOffline={storyProvider === 'template'}
        preferences={preferences}
        onComplete={handleQuizComplete}
        onHome={() => setView('landing')}
      />
    );
  }

  if (view === 'quiz' && story && config) {
    return (
      <StoryQuiz
        story={story}
        config={config}
        onHome={() => setView('landing')}
        onReplay={handleReplay}
      />
    );
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-sky2-50">
      <Button onClick={() => setView('landing')}>Go Home</Button>
    </div>
  );
}

export default App;
