import React, { useState, useEffect } from 'react';
import { Logo, Button, Card, FloatingDecor } from './ui';
import { AvatarSvg, StarTwinkle } from './Illustrations';
import { StoryData, StoryConfig, languageKey, isRtlLanguage, STORY_LENGTHS, inferStoryLength } from '../data/storyData';
import { Check, X, Star, Download, Share2, Home, RotateCcw, Trophy, Sparkles } from 'lucide-react';

interface QuizProps {
  story: StoryData;
  config: StoryConfig;
  onHome: () => void;
  onReplay: () => void;
}

export const StoryQuiz: React.FC<QuizProps> = ({ story, config, onHome, onReplay }) => {
  const [phase, setPhase] = useState<'quiz' | 'reward'>('quiz');
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [stars, setStars] = useState(0);
  const [showStarAnim, setShowStarAnim] = useState(false);

  // Determine expected number of questions based on story length
  const storyLength = story.length || inferStoryLength(story.pages.length);
  const expectedQuestionsCount = STORY_LENGTHS[storyLength].quizQuestions;
  
  // Only show questions up to the expected count for this story length
  const quizQuestions = story.quiz.slice(0, expectedQuestionsCount);
  const question = quizQuestions[qIdx];
  const isRtl = isRtlLanguage(config.language);
  const language = languageKey(config.language);

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === question.answer) {
      setStars((s) => s + 1);
      setShowStarAnim(true);
      setTimeout(() => setShowStarAnim(false), 1500);
    }
  };

  const handleNext = () => {
    if (qIdx < quizQuestions.length - 1) {
      setQIdx(qIdx + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setPhase('reward');
    }
  };

  if (phase === 'reward') {
    return <RewardScreen stars={stars} total={quizQuestions.length} story={story} config={config} onHome={onHome} onReplay={onReplay} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber2-50 via-saffron-50 to-rose2-50">
      <FloatingDecor />
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-saffron-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo size={28} />
          <button onClick={onHome} className="rounded-full bg-white/60 p-2 text-gray-500 hover:text-saffron-600 transition-colors">
            <Home className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Stars earned */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {Array.from({ length: quizQuestions.length }).map((_, i) => (
            <Star
              key={i}
              className={`w-8 h-8 transition-all duration-300 ${
                i < stars ? 'text-amber2-400 fill-amber2-400 scale-110' : 'text-gray-300'
              }`}
            />
          ))}
        </div>

        <div key={qIdx} className="animate-pop-in">
          <div className="mb-4 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber2-100 px-4 py-1.5 text-sm font-bold text-amber2-700">
              <Trophy className="w-4 h-4" /> Question {qIdx + 1} of {quizQuestions.length}
            </span>
          </div>

          <Card className="p-8">
            {/* Avatar + question */}
            <div className="mb-6 flex items-center gap-4">
              <AvatarSvg avatar={config.avatar} size={56} />
              <h2 className={`text-2xl font-extrabold text-gray-800 ${isRtl ? 'font-script' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
                {question.question[language]}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((opt, i) => {
                const isCorrect = i === question.answer;
                const isSelected = i === selected;
                let stateClass = 'bg-white ring-2 ring-saffron-100 hover:ring-saffron-300 hover:shadow-md';
                if (answered) {
                  if (isCorrect) stateClass = 'bg-emerald2-100 ring-2 ring-emerald2-400';
                  else if (isSelected) stateClass = 'bg-rose2-100 ring-2 ring-rose2-400';
                  else stateClass = 'bg-white ring-1 ring-gray-200 opacity-60';
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left font-bold text-gray-700 transition-all duration-300 ${stateClass} ${!answered ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      answered && isCorrect ? 'bg-emerald2-500 text-white' :
                      answered && isSelected ? 'bg-rose2-500 text-white' :
                      'bg-saffron-100 text-saffron-600'
                    }`}>
                      {answered && isCorrect ? <Check className="w-5 h-5" /> :
                       answered && isSelected ? <X className="w-5 h-5" /> :
                       String.fromCharCode(65 + i)}
                    </div>
                    {opt[language]}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {answered && (
              <div className={`mt-6 rounded-2xl p-4 text-center font-bold animate-fade-up ${
                selected === question.answer ? 'bg-emerald2-100 text-emerald2-700' : 'bg-rose2-100 text-rose2-700'
              }`}>
                {selected === question.answer ? (
                  <span className="flex items-center justify-center gap-2">
                    <Star className="w-6 h-6 fill-amber2-400 text-amber2-400" /> Correct! You earned a star!
                  </span>
                ) : (
                  <span>Almost! The correct answer is highlighted in green.</span>
                )}
              </div>
            )}

            {/* Next button */}
            {answered && (
              <div className="mt-6 text-center">
                <Button onClick={handleNext} icon={<Sparkles className="w-5 h-5" />}>
                  {qIdx < quizQuestions.length - 1 ? 'Next Question' : 'See My Stars!'}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Star burst animation */}
        {showStarAnim && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <div className="relative">
              <Star className="w-32 h-32 text-amber2-400 fill-amber2-400 animate-pop-in drop-shadow-2xl" />
              <StarTwinkle className="absolute -top-4 -left-8 animate-twinkle" size={32} />
              <StarTwinkle className="absolute -bottom-4 -right-8 animate-twinkle" size={28} style={{ animationDelay: '0.3s' } as React.CSSProperties} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================= Reward Screen =========================

interface RewardProps {
  stars: number;
  total: number;
  story: StoryData;
  config: StoryConfig;
  onHome: () => void;
  onReplay: () => void;
}

const RewardScreen: React.FC<RewardProps> = ({ stars, total, story, config, onHome, onReplay }) => {
  const [showStars, setShowStars] = useState(false);
  const [shared, setShared] = useState(false);
  const isPerfect = stars === total;

  useEffect(() => {
    const t = setTimeout(() => setShowStars(true), 300);
    return () => clearTimeout(t);
  }, []);

  const handleDownload = () => {
    // Generate a simple printable story page
    const win = window.open('', '_blank');
    if (!win) return;
    const pages = story.pages.map((p, i) => `
      <div style="page-break-after:always;margin-bottom:20px;">
        <h3 style="color:#c44407;">Page ${i + 1}</h3>
        <p style="font-size:18px;line-height:1.8;">${p.text.en}</p>
        <p style="font-size:16px;color:#666;direction:rtl;font-family:serif;">${p.text.ur}</p>
        <p style="font-size:16px;color:#666;direction:rtl;font-family:serif;">${p.text.ps}</p>
      </div>
    `).join('');
    win.document.write(`
      <html><head><title>${story.title.en}</title></head>
      <body style="font-family:sans-serif;max-width:700px;margin:30px auto;padding:20px;">
        <h1 style="color:#fb7a0f;text-align:center;">${story.title.en}</h1>
        <h2 style="color:#666;text-align:center;direction:rtl;font-family:serif;">${story.title.ur}</h2>
        <h2 style="color:#666;text-align:center;direction:rtl;font-family:serif;">${story.title.ps}</h2>
        <hr/>
        ${pages}
        <div style="text-align:center;margin-top:30px;">
          <h2 style="color:#f59e0b;">⭐ ${stars} out of ${total} stars! ⭐</h2>
          <p>Created with Qissa — Stories Where Your Child Is the Hero</p>
        </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const handleShare = async () => {
    const shareText = `My child ${config.childName} just read "${story.title[languageKey(config.language)]}" on Qissa and earned ${stars}/${total} stars! Create your own personalized story at Qissa.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Qissa Story', text: shareText });
      } catch {
        return;
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        return;
      }
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-amber2-100 via-saffron-50 to-rose2-50">
      <FloatingDecor />
      {/* Confetti stars */}
      {showStars && (
        <div className="pointer-events-none absolute inset-0 z-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <StarTwinkle
              key={i}
              className="absolute animate-twinkle"
              size={Math.random() * 24 + 12}
              color={['#fbbf24', '#f93c6a', '#31a3eb', '#1eb549', '#fb7a0f'][i % 5]}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-saffron-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo size={28} />
          <button onClick={onHome} className="rounded-full bg-white/60 p-2 text-gray-500 hover:text-saffron-600 transition-colors">
            <Home className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-12 text-center">
        {/* Trophy + stars */}
        <div className="animate-pop-in">
          <div className="relative mx-auto inline-block">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-amber2-300 to-saffron-500 shadow-2xl shadow-saffron-300/50">
              <Trophy className="w-14 h-14 text-white" />
            </div>
            <StarTwinkle className="absolute -top-2 -right-2 animate-twinkle" size={28} />
            <StarTwinkle className="absolute -bottom-2 -left-2 animate-twinkle" size={24} style={{ animationDelay: '0.5s' } as React.CSSProperties} />
          </div>
        </div>

        <h1 className="mt-8 text-4xl font-extrabold text-gray-800 animate-fade-up">
          {isPerfect ? 'Perfect Score!' : 'Well Done!'}
        </h1>
        <p className="mt-3 text-xl text-gray-600 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {config.childName} earned stars in the story quiz!
        </p>

        {/* Stars display */}
        <div className="mt-8 flex justify-center gap-3 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="transition-all duration-500"
              style={{
                transform: showStars ? 'scale(1)' : 'scale(0)',
                transitionDelay: `${i * 200 + 500}ms`,
              }}
            >
              <Star className={`w-16 h-16 ${i < stars ? 'text-amber2-400 fill-amber2-400 drop-shadow-lg' : 'text-gray-300'}`} />
            </div>
          ))}
        </div>

        {/* Avatar celebration */}
        <div className="mt-8 flex justify-center animate-bounce-soft">
          <div className="rounded-3xl bg-white p-4 shadow-xl ring-1 ring-saffron-100">
            <AvatarSvg avatar={config.avatar} size={72} />
            <p className="mt-2 text-sm font-bold text-gray-600">{config.childName}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald2-500 to-sky2-500 p-5 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            <Download className="w-6 h-6" />
            <div className="text-left">
              <div className="text-lg">Download PDF</div>
              <div className="text-xs opacity-90">Save this story forever</div>
            </div>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-saffron-500 to-rose2-500 p-5 font-bold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            <Share2 className="w-6 h-6" />
            <div className="text-left">
              <div className="text-lg">{shared ? 'Copied!' : 'Share Story'}</div>
              <div className="text-xs opacity-90">Tell friends about Qissa</div>
            </div>
          </button>
        </div>

        {/* Secondary actions */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="ghost" size="md" onClick={onReplay} icon={<RotateCcw className="w-5 h-5" />}>
            Read Again
          </Button>
          <Button variant="ghost" size="md" onClick={onHome} icon={<Home className="w-5 h-5" />}>
            New Story
          </Button>
        </div>

        {/* Encouragement */}
        <Card className="mt-10 p-6">
          <p className="text-lg text-gray-700">
            {isPerfect
              ? `MashaAllah! ${config.childName} answered every question correctly. What a bright star!`
              : `Great job, ${config.childName}! Every star is a step toward learning. Read again to collect them all!`}
          </p>
        </Card>
      </div>
    </div>
  );
};
