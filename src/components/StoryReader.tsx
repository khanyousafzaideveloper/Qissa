import React, { useState, useEffect, useMemo } from 'react';
import { Logo, Card, FloatingDecor } from './ui';
import { ILLUSTRATION_MAP, AvatarSvg, StarTwinkle } from './Illustrations';
import { StoryData, StoryConfig, Language, LANGUAGE_META, languageKey, isRtlLanguage } from '../data/storyData';
import { ArrowLeft, ArrowRight, Volume2, Pause, Square, Globe, Home, Sparkles, Star, CloudOff } from 'lucide-react';
import { useNarration } from '../lib/tts/useNarration';
import { chunkText } from '../lib/tts/chunk';
import type { Preferences } from '../data/preferences';

interface ReaderProps {
  story: StoryData;
  config: StoryConfig;
  onComplete: () => void;
  onHome: () => void;
  isOffline?: boolean;
  preferences: Preferences;
}

const LANGUAGES: Language[] = ['english', 'urdu', 'pashto'];


export const StoryReader: React.FC<ReaderProps> = ({ story, config, onComplete, onHome, isOffline = false, preferences }) => {
  const [pageIdx, setPageIdx] = useState(() => {
    const saved = localStorage.getItem(`qissa-last-read-${story.title.en}`);
    return saved ? Math.min(parseInt(saved, 10), story.pages.length - 1) : 0;
  });
  const [lang, setLang] = useState<Language>(config.language);
  const [secondaryLang, setSecondaryLang] = useState<Language>(config.language === 'english' ? 'urdu' : 'english');
  const [showBilingual, setShowBilingual] = useState(true);
  const [chosenPath, setChosenPath] = useState<number[]>([0]);
  // Reading-aloud options come from Settings so the page itself stays simple for kids.
  const { autoRead: autoReadEnabled, useServerVoice, narrationSpeed } = preferences;

  const page = story.pages[pageIdx];
  const Scene = ILLUSTRATION_MAP[page.illustration] || ILLUSTRATION_MAP.mountain;

  const text = page.text[languageKey(lang)];
  const secondaryText = page.text[languageKey(secondaryLang)];
  const isRtl = isRtlLanguage(lang);
  const secondaryIsRtl = isRtlLanguage(secondaryLang);
  const textFontClass = isRtl ? 'font-script' : '';
  const words = text.split(/\s+/);

  // Use the new narration hook
  const narration = useNarration(text, lang, useServerVoice, narrationSpeed);

  // Narration speaks one sentence chunk at a time, so highlight that chunk's words as it's read.
  const chunkWordRanges = useMemo(() => {
    let start = 0;
    return chunkText(text).map((chunk) => {
      const count = chunk.split(/\s+/).filter(Boolean).length;
      const range = [start, start + count] as const;
      start += count;
      return range;
    });
  }, [text]);
  const activeRange = narration.status === 'playing' ? chunkWordRanges[narration.currentChunkIndex] : undefined;

  // Auto-read on page load if enabled and not reduced motion
  useEffect(() => {
    if (autoReadEnabled && narration.status === 'idle' && !narration.prefersReducedMotion) {
      narration.play();
    }
  }, [pageIdx, autoReadEnabled, narration]);

  const handlePrimaryLanguage = (next: Language) => {
    if (next === secondaryLang) setSecondaryLang(lang);
    setLang(next);
  };

  const handleSecondaryLanguage = (next: Language) => {
    if (next !== lang) setSecondaryLang(next);
  };

  const handleChoice = (nextPage: number) => {
    setChosenPath([...chosenPath, nextPage]);
    setPageIdx(nextPage);
  };

  // Save last-read position
  useEffect(() => {
    localStorage.setItem(`qissa-last-read-${story.title.en}`, String(pageIdx));
  }, [pageIdx, story.title.en]);

  const isLastPage = pageIdx === story.pages.length - 1 || (page.choices === undefined && pageIdx >= story.pages.length - 1);
  const canGoNext = !page.choices && pageIdx < story.pages.length - 1;
  const canGoPrev = pageIdx > 0;

  const IllustrationComponent = Scene;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-sky2-500 via-sky2-300 to-sky2-100">
      <FloatingDecor />
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-sky2-600 border-b border-white/20 shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button onClick={onHome} className="flex items-center gap-2 text-white">
            <Logo size={28} showText={false} />
            <span className="font-display text-lg font-bold text-white">Qissa</span>
          </button>
          <div className="flex items-center gap-2">
            {/* Primary language */}
            <div className="flex rounded-full bg-white/10 p-1">
              {LANGUAGES.map((language) => (
                <button
                  key={language}
                  onClick={() => handlePrimaryLanguage(language)}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${lang === language ? 'bg-white text-sky2-700 shadow' : 'text-white/80 hover:text-white'}`}
                >{LANGUAGE_META[language].native}</button>
              ))}
            </div>
            {/* Secondary language */}
            <div className="hidden rounded-full bg-white/10 p-1 sm:flex">
              {LANGUAGES.filter((language) => language !== lang).map((language) => (
                <button
                  key={language}
                  onClick={() => handleSecondaryLanguage(language)}
                  className={`rounded-full px-2 py-1 text-xs font-bold transition-all ${secondaryLang === language ? 'bg-white/30 text-white' : 'text-white/60'}`}
                >{LANGUAGE_META[language].native}</button>
              ))}
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
        
        {/* Progress bar */}
        <div className="mx-auto max-w-5xl px-4 py-2">
          <div className="h-2 w-full rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber2-300 to-amber2-400 transition-all duration-300"
              style={{ width: `${((pageIdx + 1) / story.pages.length) * 100}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs font-bold text-white/85">
            <span>Page {pageIdx + 1} of {story.pages.length}</span>
            <span>{Math.round(((pageIdx + 1) / story.pages.length) * 100)}%</span>
          </div>
        </div>
      </nav>

      <div className="relative mx-auto max-w-4xl px-4 py-6">
        {/* Story title */}
        <div className="mb-4 text-center">
          {isOffline && (
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber2-100 px-3 py-1 text-xs font-bold text-amber2-800">
              <CloudOff className="h-3.5 w-3.5" /> Offline story
            </span>
          )}
          <h1 className={`text-2xl font-extrabold text-white text-shadow-soft ${textFontClass}`} dir={isRtl ? 'rtl' : 'ltr'}>
            {story.title[languageKey(lang)]}
          </h1>
        </div>

        {/* Book spread */}
        <div key={pageIdx} className="animate-pop-in">
          <Card className="overflow-hidden">
            {/* Illustration */}
            <div className="relative h-56 overflow-hidden sm:h-72">
              {page.imageUrl ? (
                <img src={page.imageUrl} alt="Story scene" className="h-full w-full object-cover" />
              ) : (
                <IllustrationComponent className="w-full h-full" />
              )}
              {/* Avatar overlay */}
              <div className="absolute bottom-3 right-3 animate-bounce-soft">
                <div className="rounded-full bg-white/80 p-1.5 backdrop-blur-sm">
                  <AvatarSvg avatar={config.avatar} size={56} />
                </div>
              </div>
              {/* Page number */}
              <div className="absolute bottom-3 left-3 rounded-full bg-white/80 px-3 py-1 text-sm font-bold text-gray-700 backdrop-blur-sm">
                Chapter {pageIdx + 1}
              </div>
              {/* Floating stars for ambiance */}
              <StarTwinkle className="absolute top-4 right-8 animate-twinkle" size={16} color="#fef3c7" />
              <StarTwinkle className="absolute top-8 right-20 animate-twinkle" size={12} color="#fff" style={{ animationDelay: '1s' } as React.CSSProperties} />
            </div>

            {/* Text area */}
            <div className="bg-gradient-to-b from-white to-sky2-50 p-6 sm:p-8">
              {/* Primary language */}
              <div className={textFontClass} dir={isRtl ? 'rtl' : 'ltr'}>
                <p className={`text-xl leading-loose ${isRtl ? 'text-right text-2xl' : ''}`}>
                  {words.map((w, i) => (
                    <span
                      key={i}
                      className={`transition-all duration-200 ${
                        activeRange && i >= activeRange[0] && i < activeRange[1]
                          ? 'bg-amber2-200 rounded-md text-amber2-900'
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
                <div className={`mt-4 border-t-2 border-dashed border-sky2-200 pt-4 ${secondaryIsRtl ? 'font-script' : ''}`} dir={secondaryIsRtl ? 'rtl' : 'ltr'}>
                  <p className={`text-lg leading-loose text-gray-600 ${secondaryIsRtl ? 'text-right text-xl' : ''}`}>
                    {secondaryText}
                  </p>
                </div>
              )}

              {/* Narration controls */}
              <div className="mt-6 space-y-3">
                {/* Status message */}
                {narration.status === 'unsupported' && (
                  <p className="text-center text-sm text-amber2-600 font-semibold">
                    Read-aloud is not supported in your browser.
                  </p>
                )}
                {narration.status === 'no-voice' && (
                  <div className="rounded-lg bg-sky2-50 p-3 text-sm text-sky2-800">
                    <p className="font-semibold mb-2">Voice not installed for {LANGUAGE_META[lang].label}</p>
                    <p className="text-xs mb-2">Try Microsoft Edge, or install the language voice in system settings.</p>
                    {useServerVoice ? (
                      <p className="text-xs text-sky2-700">Using AI voice service instead.</p>
                    ) : (
                      <p className="text-xs">Or turn on &quot;Use AI voice&quot; in Settings.</p>
                    )}
                  </div>
                )}

                {/* Main controls */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {/* Play button */}
                  <button
                    onClick={() => narration.play()}
                    disabled={narration.status === 'unsupported' || narration.status === 'playing'}
                    className={`flex items-center gap-2 rounded-full px-6 py-3 font-display text-lg font-bold transition-all duration-300 ${
                      narration.status === 'playing'
                        ? 'bg-rose2-100 text-rose2-600 ring-2 ring-rose2-300'
                        : narration.status === 'unsupported' || narration.status === 'no-voice'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-sky2-500 text-white shadow-[0_4px_0_0_#1c6aa8] hover:brightness-110 active:translate-y-1 active:shadow-none'
                    }`}
                    aria-label="Play narration"
                  >
                    <Volume2 className="w-5 h-5" />
                    {narration.status === 'playing' ? 'Playing...' : 'Read to me'}
                  </button>

                  {/* Pause button (only show when playing) */}
                  {narration.status === 'playing' && (
                    <button
                      onClick={() => narration.pause()}
                      className="flex items-center gap-2 rounded-full bg-amber2-100 px-4 py-2.5 font-bold text-amber2-700 transition-all hover:bg-amber2-200"
                      aria-label="Pause narration"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  )}

                  {/* Resume button (only show when paused) */}
                  {narration.status === 'paused' && (
                    <>
                      <button
                        onClick={() => narration.resume()}
                        className="flex items-center gap-2 rounded-full bg-emerald2-100 px-4 py-2.5 font-bold text-emerald2-700 transition-all hover:bg-emerald2-200"
                        aria-label="Resume narration"
                      >
                        <Volume2 className="w-4 h-4" />
                        Resume
                      </button>
                    </>
                  )}

                  {/* Stop button (only show when playing or paused) */}
                  {(narration.status === 'playing' || narration.status === 'paused') && (
                    <button
                      onClick={() => narration.stop()}
                      className="flex items-center gap-2 rounded-full bg-gray-200 px-4 py-2.5 font-bold text-gray-700 transition-all hover:bg-gray-300"
                      aria-label="Stop narration"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Voice picker — only worth showing when there's a real choice */}
                {narration.availableVoices.length > 1 && narration.status !== 'unsupported' && (
                  <div className="flex items-center justify-center gap-2">
                    <label htmlFor="voice-select" className="text-xs font-semibold text-gray-500">Voice</label>
                    <select
                      id="voice-select"
                      value={narration.selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = narration.availableVoices.find((v) => v.name === e.target.value);
                        if (voice) narration.setSelectedVoice(voice);
                      }}
                      className="max-w-[14rem] truncate rounded-full border border-sky2-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {narration.availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* "What happens next?" choices */}
              {page.choices && (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber2-500 animate-bounce-soft" />
                    <span className="font-display text-xl font-bold text-sky2-700">What happens next?</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {page.choices.map((choice, i) => (
                      <button
                        key={i}
                        onClick={() => handleChoice(choice.nextPage)}
                        className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-md ring-2 ring-sky2-100 transition-all duration-300 hover:ring-sky2-400 hover:shadow-lg hover:scale-105"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky2-100 font-bold text-sky2-600 group-hover:bg-sky2-500 group-hover:text-white transition-colors">
                          {i + 1}
                        </div>
                        <div>
                          <div className={`font-bold text-gray-800 ${isRtl ? 'font-script' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>{choice.text[languageKey(lang)]}</div>
                          {showBilingual && (
                            <div className={`mt-0.5 text-sm text-gray-500 ${secondaryIsRtl ? 'font-script' : ''}`} dir={secondaryIsRtl ? 'rtl' : 'ltr'}>
                              {choice.text[languageKey(secondaryLang)]}
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
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-b from-sky2-400 to-sky2-600 px-6 py-2.5 font-display font-bold text-white shadow-[0_4px_0_0_#1c6aa8] transition-all hover:brightness-110 active:translate-y-1 active:shadow-none"
                    >
                      Next <ArrowRight className="w-5 h-5" />
                    </button>
                  ) : isLastPage ? (
                    <button
                      onClick={onComplete}
                      className="flex items-center gap-2 rounded-full bg-gradient-to-b from-amber2-300 to-amber2-400 px-6 py-2.5 font-display font-bold text-amber2-900 shadow-[0_4px_0_0_#d97706] transition-all hover:brightness-105 active:translate-y-1 active:shadow-none"
                    >
                      <Star className="w-5 h-5 fill-amber2-900" /> Quiz Time!
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
                i === pageIdx ? 'w-8 bg-sky2-500' : 'w-2.5 bg-sky2-300/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
