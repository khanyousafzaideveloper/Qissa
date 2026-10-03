import React from 'react';
import { ArrowLeft, CloudOff, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from './ui';

interface StoryGenerationErrorProps {
  childName?: string;
  reason?: string;
  onRetry: () => void;
  onUseOffline: () => void;
  onBack: () => void;
}

export const StoryGenerationError: React.FC<StoryGenerationErrorProps> = ({ childName, onRetry, onUseOffline, onBack }) => (
  <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky2-500 via-sky2-400 to-sky2-200 px-4 text-center text-white">
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center">
      <CloudOff className="h-14 w-14 text-amber2-300" />
      <h1 className="mt-5 text-3xl font-extrabold">We couldn&apos;t reach the story writer</h1>
      <p className="mt-3 text-white/75">
        {childName ? `${childName}'s story is ready as an offline story, or you can try the AI writer again.` : 'The offline story is ready, or you can try the AI writer again.'}
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <Button onClick={onRetry} icon={<RefreshCw className="h-5 w-5" />}>Try Again</Button>
        <Button variant="secondary" onClick={onUseOffline} icon={<Sparkles className="h-5 w-5" />}>Use Offline Story</Button>
      </div>
      <button onClick={onBack} className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-white/65 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to creator
      </button>
    </div>
  </div>
);
