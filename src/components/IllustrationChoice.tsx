import React, { useState } from 'react';
import { ArrowLeft, Image, Palette, Sparkles } from 'lucide-react';
import { Button, Card, FloatingDecor } from './ui';
import type { StoryData } from '../data/storyData';

interface IllustrationChoiceProps {
  story: StoryData;
  onGenerate: () => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
}

export const IllustrationChoice: React.FC<IllustrationChoiceProps> = ({ story, onGenerate, onSkip, onBack }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [completed, setCompleted] = useState(0);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await onGenerate();
    setCompleted(story.pages.length);
    setIsGenerating(false);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-sky2-200 via-sky2-100 to-sky2-50">
      <FloatingDecor />
      <main className="relative mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12">
        <Card className="w-full p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sky2-100">
            <Palette className="h-8 w-8 text-sky2-600" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-gray-800">Add a little more magic?</h1>
          <p className="mx-auto mt-3 max-w-md text-gray-600">
            Qissa can try to create a gentle scene image for each page. Your story will work beautifully with the built-in illustrations if you skip this step.
          </p>
          {isGenerating && (
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-sky2-700">
              <Sparkles className="h-4 w-4 animate-pulse" /> Creating page {Math.min(completed + 1, story.pages.length)} of {story.pages.length}…
            </p>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={handleGenerate} disabled={isGenerating} icon={<Image className="h-5 w-5" />}>Generate Scene Images</Button>
            <Button variant="ghost" onClick={onSkip} disabled={isGenerating}>Use Built-in Scenes</Button>
          </div>
          <button onClick={onBack} disabled={isGenerating} className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-sky2-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </Card>
      </main>
    </div>
  );
};
