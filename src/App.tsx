import React, { useEffect, useState } from 'react';
import { Landing } from './components/Landing';
import { MyStories } from './components/MyStories';
import { StoryCreator } from './components/StoryCreator';
import { StoryReader } from './components/StoryReader';
import { StoryQuiz } from './components/StoryQuiz';
import { StoryGenerationError } from './components/StoryGenerationError';
import { IllustrationChoice } from './components/IllustrationChoice';
import { Logo, Button, Card, FloatingDecor } from './components/ui';
import { PARENT_PURPOSES, StoryConfig, StoryData } from './data/storyData';
import { generateStory } from './data/generateStory';
import { generateIllustrations } from './data/illustrations';
import { deleteStory, loadStories, saveStory, setStoryFavorite, SavedStory } from './data/storyHistory';
import { Heart, ArrowLeft, Moon, School, Share2, ShieldCheck, Sparkles } from 'lucide-react';

type View = 'landing' | 'creator' | 'loading' | 'generation-error' | 'illustrations' | 'reader' | 'quiz' | 'parent' | 'stories';
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
  const [chapterProgress, setChapterProgress] = useState<{ status: 'generating' | 'complete' | 'failed'; count: number }>({ status: 'generating', count: 0 });

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
    if (result.provider === 'template') {
      finishStory(result, cfg);
      return;
    }
    setPendingResult(result);
    setView('illustrations');
  };

  const handleCreate = async (cfg: StoryConfig) => {
    setConfig(cfg);
    setPendingResult(null);
    setLoadingStep(0);
    setChapterProgress({ status: 'generating', count: 0 });
    setView('loading');
    const result = await generateStory(cfg, (status, count) => {
      setChapterProgress({ status, count });
    });
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
    setParentPurpose(purposeId);
    setView('creator');
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
        onCreate={() => { setParentPurpose(undefined); setView('creator'); }}
        onParentMode={() => setView('parent')}
        onMyStories={() => setView('stories')}
      />
    );
  }

  if (view === 'stories') {
    return (
      <MyStories
        stories={savedStories}
        onCreate={() => { setParentPurpose(undefined); setView('creator'); }}
        onOpen={handleOpenStory}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteStory}
        onHome={() => setView('landing')}
      />
    );
  }

  if (view === 'parent') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky2-50 via-sky2-100 to-emerald2-50">
        <FloatingDecor />
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
            <span className="inline-flex items-center gap-2 rounded-full bg-sky2-100 px-4 py-1.5 text-sm font-bold text-sky2-700">
              <Heart className="w-4 h-4" /> For Parents
            </span>
            <h1 className="mt-4 text-4xl font-extrabold text-gray-800">Parent Purpose Mode</h1>
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
      </div>
    );
  }

  if (view === 'creator') {
    return (
      <StoryCreator
        onComplete={handleCreate}
        onBack={() => setView('landing')}
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
    const expectedChapters = config?.storyLength === 'short' ? 6 : config?.storyLength === 'medium' ? 12 : 20;
    const progressPercent = expectedChapters > 0 ? Math.min(100, (chapterProgress.count / expectedChapters) * 100) : 0;
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-sky2-900 via-sky2-800 to-indigo-900 px-4 text-center">
        <Sparkles className="w-12 h-12 text-saffron-300 animate-bounce-soft" />
        <h1 className="text-2xl font-extrabold text-white">{loadingMessages[loadingStep][0]}</h1>
        <p className="font-urdu text-xl text-white/80" dir="rtl">{loadingMessages[loadingStep][1]}</p>
        <p className="text-sm text-white/60">Writing {config?.childName}&apos;s story…</p>
        
        {/* Chapter progress bar */}
        {chapterProgress.count > 0 && (
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-white/70">Progress</span>
              <span className="text-xs font-semibold text-saffron-300">{chapterProgress.count}/{expectedChapters}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-saffron-400 to-saffron-300 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
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
    <div className="min-h-screen flex items-center justify-center bg-saffron-50">
      <Button onClick={() => setView('landing')}>Go Home</Button>
    </div>
  );
}

export default App;
