import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Logo, Button, Card, FloatingDecor } from './ui';
import { ILLUSTRATION_MAP, AvatarSvg, StarTwinkle } from './Illustrations';
import { StoryData, StoryConfig, Language } from '../data/storyData';
import { ArrowLeft, ArrowRight, Volume2, Pause, Globe, Home, Sparkles, Star } from 'lucide-react';

interface ReaderProps {
  story: StoryData;
  config: StoryConfig;
  onComplete: () => void;
  onHome: () => void;
}

export const StoryReader: React.FC<ReaderProps> = ({ story, config, onComplete, onHome }) => {
  const [pageIdx, setPageIdx] = useState(0);
  const [lang, setLang] = useState<Language>(config.language);
  const [showBilingual, setShowBilingual] = useState(true);
  const [isNarrating, setIsNarrating] = useState(false);
  const [highlightedWord, setHighlightedWord] = useState(-1);
  const [chosenPath, setChosenPath] = useState<number[]>([0]);
  const narrationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordsRef = useRef<string[]>([]);

  const page = story.pages[pageIdx];
  const Scene = ILLUSTRATION_MAP[page.illustration] || ILLUSTRATION_MAP.mountain;

  const text = lang === 'urdu' ? page.textUrdu : page.text;
  const isUrdu = lang === 'urdu';
  const words = text.split(/\s+/);
  wordsRef.current = words;

  const stopNarration = useCallback(() => {
    if (narrationTimer.current) {
      clearInterval(narrationTimer.current);
      narrationTimer.current = null;
    }
    setIsNarrating(false);
    setHighlightedWord(-1);
  }, []);

  const startNarration = useCallback(() => {
    stopNarration();
    setIsNarrating(true);
    setHighlightedWord(0);
    let i = 0;
    const w = wordsRef.current;
    const speed = isUrdu ? 500 : 350;
    narrationTimer.current = setInterval(() => {
      i++;
      if (i >= w.length) {
        if (narrationTimer.current) clearInterval(narrationTimer.current);
        narrationTimer.current = null;
        setIsNarrating(false);
        setHighlightedWord(-1);
      } else {
        setHighlightedWord(i);
      }
    }, speed);
  }, [isUrdu, stopNarration]);

  useEffect(() => {
    stopNarration();
  }, [pageIdx, lang, stopNarration]);

  useEffect(() => () => stopNarration(), [stopNarration]);

  // Speech synthesis narration
  const speakNarration = useCallback(() => {
    if ('speechSynthesis' in window) {
      if (isNarrating) {
        speechSynthesis.cancel();
        stopNarration();
        return;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = isUrdu ? 'ur-PK' : 'en-US';
      utter.rate = 0.7;
      utter.pitch = 1.1;
      speechSynthesis.speak(utter);
      startNarration();
      utter.onend = () => stopNarration();
    } else {
      startNarration();
    }
  }, [text, isUrdu, isNarrating, startNarration, stopNarration]);

  const handleChoice = (nextPage: number) => {
    setChosenPath([...chosenPath, nextPage]);
    setPageIdx(nextPage);
  };

  const isLastPage = pageIdx === story.pages.length - 1 || (page.choices === undefined && pageIdx >= story.pages.length - 1);
  const canGoNext = !page.choices && pageIdx < story.pages.length - 1;
  const canGoPrev = pageIdx > 0;

  const IllustrationComponent = Scene;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky2-900 via-sky2-800 to-indigo-900">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-sky2-900/80 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button onClick={onHome} className="flex items-center gap-2 text-white">
            <Logo size={28} showText={false} />
            <span className="font-display text-lg font-bold text-white">Qissa</span>
          </button>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex rounded-full bg-white/10 p-1">
              <button
                onClick={() => setLang('english')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${lang === 'english' ? 'bg-white text-saffron-600' : 'text-white/70'}`}
              >EN</button>
              <button
                onClick={() => setLang('urdu')}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${lang === 'urdu' ? 'bg-white text-emerald2-600' : 'text-white/70'}`}
              >اردو</button>
            </div>
            {/* Bilingual toggle */}
            <button
              onClick={() => setShowBilingual(!showBilingual)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all ${showBilingual ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'}`}
            >
              <Globe className="w-4 h-4" /> Dual
            </button>
            <button onClick={onHome} className="rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 transition-colors">
              <Home className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Story title */}
        <div className="mb-4 text-center">
          <h1 className={`text-2xl font-extrabold text-white text-shadow-soft ${isUrdu ? 'font-urdu' : ''}`} dir={isUrdu ? 'rtl' : 'ltr'}>
            {isUrdu ? story.titleUrdu : story.title}
          </h1>
        </div>

        {/* Book spread */}
        <div key={pageIdx} className="animate-pop-in">
          <Card className="overflow-hidden">
            {/* Illustration */}
            <div className="relative h-56 overflow-hidden sm:h-72">
              <IllustrationComponent className="w-full h-full" />
              {/* Avatar overlay */}
              <div className="absolute bottom-3 right-3 animate-bounce-soft">
                <div className="rounded-full bg-white/80 p-1.5 backdrop-blur-sm">
                  <AvatarSvg avatar={config.avatar} size={56} />
                </div>
              </div>
              {/* Page number */}
              <div className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-gray-700 backdrop-blur-sm">
                Page {pageIdx + 1}
              </div>
              {/* Floating stars for ambiance */}
              <StarTwinkle className="absolute top-4 right-8 animate-twinkle" size={16} color="#fef3c7" />
              <StarTwinkle className="absolute top-8 right-20 animate-twinkle" size={12} color="#fff" style={{ animationDelay: '1s' } as any} />
            </div>

            {/* Text area */}
            <div className="bg-gradient-to-b from-white to-saffron-50 p-6 sm:p-8">
              {/* Primary language */}
              <div className={isUrdu ? 'font-urdu' : ''} dir={isUrdu ? 'rtl' : 'ltr'}>
                <p className={`text-xl leading-loose ${isUrdu ? 'text-right text-2xl' : ''}`}>
                  {words.map((w, i) => (
                    <span
                      key={i}
                      className={`transition-all duration-200 ${
                        i === highlightedWord
                          ? 'bg-saffron-200 rounded-lg px-1 text-saffron-800 scale-110 inline-block'
                          : 'text-gray-800'
                      }`}
                    >
                      {w}{' '}
                    </span>
                  ))}
                </p>
              </div>

              {/* Bilingual second language */}
              {showBilingual && (
                <div className={`mt-4 border-t-2 border-dashed border-saffron-200 pt-4 ${!isUrdu ? 'font-urdu' : ''}`} dir={!isUrdu ? 'rtl' : 'ltr'}>
                  <p className={`text-lg leading-loose text-gray-600 ${!isUrdu ? 'text-right text-xl' : ''}`}>
                    {!isUrdu ? page.textUrdu : page.text}
                  </p>
                </div>
              )}

              {/* Narration controls */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={speakNarration}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-bold transition-all duration-300 ${
                    isNarrating
                      ? 'bg-rose2-100 text-rose2-600 ring-2 ring-rose2-300'
                      : 'bg-saffron-100 text-saffron-700 hover:bg-saffron-200'
                  }`}
                >
                  {isNarrating ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  {isNarrating ? 'Stop' : 'Read to me'}
                </button>
              </div>

              {/* "What happens next?" choices */}
              {page.choices && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-rose2-500 animate-bounce-soft" />
                    <span className="font-display text-lg font-bold text-rose2-600">What happens next?</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {page.choices.map((choice, i) => (
                      <button
                        key={i}
                        onClick={() => handleChoice(choice.nextPage)}
                        className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-md ring-2 ring-saffron-100 transition-all duration-300 hover:ring-rose2-400 hover:shadow-lg hover:scale-105"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose2-100 font-bold text-rose2-600 group-hover:bg-rose2-500 group-hover:text-white transition-colors">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{isUrdu ? choice.textUrdu : choice.text}</div>
                          {showBilingual && (
                            <div className={`mt-0.5 text-sm text-gray-500 ${isUrdu ? '' : 'font-urdu'}`} dir={isUrdu ? 'ltr' : 'rtl'}>
                              {isUrdu ? choice.text : choice.textUrdu}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Navigation */}
              {!page.choices && (
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => canGoPrev && setPageIdx(pageIdx - 1)}
                    disabled={!canGoPrev}
                    className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 font-bold text-gray-600 shadow-md transition-all hover:shadow-lg disabled:opacity-40"
                  >
                    <ArrowLeft className="w-5 h-5" /> Prev
                  </button>
                  {canGoNext ? (
                    <button
                      onClick={() => setPageIdx(pageIdx + 1)}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-saffron-500 to-rose2-500 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:scale-105"
                    >
                      Next <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : isLastPage ? (
                    <button
                      onClick={onComplete}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald2-500 to-sky2-500 px-6 py-2.5 font-bold text-white shadow-lg transition-all hover:scale-105"
                    >
                      <Star className="w-5 h-5 fill-white" /> Quiz Time!
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {story.pages.map((_, i) => (
            <div
              key={i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === pageIdx ? 'w-8 bg-saffron-400' : 'w-2.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
