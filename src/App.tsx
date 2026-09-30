import React, { useState } from 'react';
import { Landing } from './components/Landing';
import { StoryCreator } from './components/StoryCreator';
import { StoryReader } from './components/StoryReader';
import { StoryQuiz } from './components/StoryQuiz';
import { Logo, Button, Card, FloatingDecor } from './components/ui';
import { PARENT_PURPOSES, StoryConfig, buildStory, StoryData } from './data/storyData';
import { Heart, ArrowLeft, Moon, School, Share2, ShieldCheck } from 'lucide-react';

type View = 'landing' | 'creator' | 'reader' | 'quiz' | 'parent';

const PARENT_ICONS: Record<string, React.FC<any>> = {
  darkness: Moon,
  school: School,
  sharing: Share2,
  bullying: ShieldCheck,
};

function App() {
  const [view, setView] = useState<View>('landing');
  const [config, setConfig] = useState<StoryConfig | null>(null);
  const [story, setStory] = useState<StoryData | null>(null);
  const [parentPurpose, setParentPurpose] = useState<string | undefined>(undefined);

  const handleCreate = (cfg: StoryConfig) => {
    setConfig(cfg);
    setStory(buildStory(cfg));
    setView('reader');
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

  if (view === 'reader' && story && config) {
    return (
      <StoryReader
        story={story}
        config={config}
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
