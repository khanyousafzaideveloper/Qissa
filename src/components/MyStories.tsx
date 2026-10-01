import React from 'react';
import { ArrowLeft, BookOpen, Heart, Home, Trash2 } from 'lucide-react';
import { Button, Card, FloatingDecor, Logo } from './ui';
import { languageKey } from '../data/storyData';
import type { SavedStory } from '../data/storyHistory';

interface MyStoriesProps {
  stories: SavedStory[];
  onCreate: () => void;
  onOpen: (entry: SavedStory) => void;
  onToggleFavorite: (entry: SavedStory) => void;
  onDelete: (entry: SavedStory) => void;
  onHome: () => void;
}

export const MyStories: React.FC<MyStoriesProps> = ({ stories, onCreate, onOpen, onToggleFavorite, onDelete, onHome }) => (
  <div className="min-h-screen bg-gradient-to-b from-saffron-50 via-rose2-50 to-emerald2-50">
    <FloatingDecor />
    <nav className="sticky top-0 z-50 border-b border-saffron-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Logo size={32} />
        <button onClick={onHome} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 transition-colors hover:text-saffron-600">
          <Home className="h-4 w-4" /> Home
        </button>
      </div>
    </nav>

    <main className="relative mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-saffron-100 px-4 py-1.5 text-sm font-bold text-saffron-700">
            <BookOpen className="h-4 w-4" /> Saved on this device
          </span>
          <h1 className="mt-4 text-4xl font-extrabold text-gray-800">My Stories</h1>
          <p className="mt-2 text-gray-600">Reopen a favorite adventure or make a new one.</p>
        </div>
        <Button onClick={onCreate} icon={<BookOpen className="h-5 w-5" />}>Create Story</Button>
      </div>

      {stories.length === 0 ? (
        <Card className="mt-10 p-10 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-saffron-400" />
          <h2 className="mt-4 text-2xl font-bold text-gray-800">Your story shelf is waiting</h2>
          <p className="mt-2 text-gray-600">Stories you create will stay privately on this device.</p>
          <Button className="mt-6" onClick={onCreate}>Create Your First Story</Button>
        </Card>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((entry) => {
            const language = languageKey(entry.config.language);
            return (
              <Card key={entry.id} className="flex h-full flex-col overflow-hidden">
                <button onClick={() => onOpen(entry)} className="flex-1 p-5 text-left transition-colors hover:bg-saffron-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-h-12 w-12 items-center justify-center rounded-2xl bg-saffron-100 text-2xl">
                      {entry.config.setting.emoji}
                    </div>
                    <span className="rounded-full bg-emerald2-50 px-2.5 py-1 text-xs font-bold text-emerald2-700">Saved locally</span>
                  </div>
                  <h2 className={`mt-5 text-xl font-extrabold text-gray-800 ${entry.config.language !== 'english' ? 'font-script' : ''}`} dir={entry.config.language !== 'english' ? 'rtl' : 'ltr'}>
                    {entry.story.title[language]}
                  </h2>
                  <p className="mt-2 text-sm font-bold text-gray-500">{entry.config.childName} · {entry.config.setting.label}</p>
                  <p className="mt-1 text-xs text-gray-400">{new Date(entry.createdAt).toLocaleDateString()}</p>
                </button>
                <div className="flex items-center justify-between border-t border-saffron-100 px-4 py-3">
                  <button
                    onClick={() => onToggleFavorite(entry)}
                    aria-label={entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
                    className="rounded-full p-2 text-rose2-500 transition-colors hover:bg-rose2-50"
                  >
                    <Heart className="h-5 w-5" fill={entry.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    onClick={() => onDelete(entry)}
                    aria-label={`Delete ${entry.story.title.en}`}
                    className="rounded-full p-2 text-gray-400 transition-colors hover:bg-rose2-50 hover:text-rose2-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button onClick={() => onOpen(entry)} className="inline-flex items-center gap-1 text-sm font-bold text-saffron-700 hover:text-saffron-800">
                    Read <ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </main>
  </div>
);
