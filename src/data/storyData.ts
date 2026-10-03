import { choiceTargets } from '../lib/story-topology.js';

export type Language = 'english' | 'urdu' | 'pashto';
export type LanguageKey = 'en' | 'ur' | 'ps';
export type LocalizedText = Record<LanguageKey, string>;
export type StoryLength = 'short' | 'medium' | 'long';

export const LANGUAGE_KEYS: Record<Language, LanguageKey> = {
  english: 'en',
  urdu: 'ur',
  pashto: 'ps',
};

export const LANGUAGE_META: Record<Language, { label: string; native: string; speechLocale: string; rtl: boolean }> = {
  english: { label: 'English', native: 'English', speechLocale: 'en-US', rtl: false },
  urdu: { label: 'Urdu', native: 'اردو', speechLocale: 'ur-PK', rtl: true },
  pashto: { label: 'Pashto', native: 'پښتو', speechLocale: 'ps-PK', rtl: true },
};

export function languageKey(language: Language): LanguageKey {
  return LANGUAGE_KEYS[language];
}

export function isRtlLanguage(language: Language): boolean {
  return LANGUAGE_META[language].rtl;
}

export const STORY_LENGTHS: Record<StoryLength, { pages: number; quizQuestions: number; label: string }> = {
  short: { pages: 6, quizQuestions: 3, label: 'Short story (6 pages)' },
  medium: { pages: 12, quizQuestions: 4, label: 'Medium story (12 pages)' },
  long: { pages: 20, quizQuestions: 5, label: 'Long story (20 pages)' },
};

/**
 * Infer story length from page count.
 * Backward compatible: 6 pages → 'short', 12 → 'medium', 20 → 'long'
 * Default to 'short' if page count doesn't match exactly.
 */
export function inferStoryLength(pageCount: number): StoryLength {
  if (pageCount === 12) return 'medium';
  if (pageCount === 20) return 'long';
  return 'short'; // Default for 6-page or unknown counts
}

export type AnimalKind = 'lion' | 'cat' | 'bunny' | 'panda' | 'fox' | 'owl' | 'elephant' | 'markhor';
export type HeroGender = 'girl' | 'boy';

export interface Avatar {
  id: AnimalKind;
  name: string;
  nameUrdu: string;
  /** Soft background tint behind the animal. */
  color: string;
}

export interface StorySetting {
  id: string;
  label: string;
  labelUrdu: string;
  labelPashto: string;
  emoji: string;
  gradient: string;
  sceneKey: string;
}

export interface StoryLesson {
  id: string;
  label: string;
  labelUrdu: string;
  labelPashto: string;
  emoji: string;
}

export interface StoryPage {
  text: LocalizedText;
  sceneKey: string;
  illustration: 'mountain' | 'village' | 'bazaar' | 'eid' | 'forest' | 'school' | 'night' | 'journey';
  imageUrl?: string;
  choices?: { text: LocalizedText; nextPage: number }[];
}

export interface StoryData {
  title: LocalizedText;
  pages: StoryPage[];
  quiz: { question: LocalizedText; options: LocalizedText[]; answer: number }[];
  length?: StoryLength; // optional; inferred from page count if absent
}

export interface StoryConfig {
  childName: string;
  avatar: Avatar;
  /** Needed for Urdu/Pashto verb agreement now that avatars are animals. */
  heroGender?: HeroGender;
  language: Language;
  hero: string;
  setting: StorySetting;
  lesson: StoryLesson;
  parentPurpose?: string;
  storyLength?: StoryLength; // default 'medium' for new stories
}

const text = (en: string, ur: string, ps: string): LocalizedText => ({ en, ur, ps });

export const AVATARS: Avatar[] = [
  { id: 'lion', name: 'Lion', nameUrdu: 'شیر', color: '#fef3c7' },
  { id: 'cat', name: 'Cat', nameUrdu: 'بلی', color: '#ffedd5' },
  { id: 'bunny', name: 'Bunny', nameUrdu: 'خرگوش', color: '#fce7f3' },
  { id: 'panda', name: 'Panda', nameUrdu: 'پانڈا', color: '#dcfce7' },
  { id: 'fox', name: 'Fox', nameUrdu: 'لومڑی', color: '#fee2e2' },
  { id: 'owl', name: 'Owl', nameUrdu: 'الو', color: '#ede9fe' },
  { id: 'elephant', name: 'Elephant', nameUrdu: 'ہاتھی', color: '#e0f2fe' },
  { id: 'markhor', name: 'Markhor', nameUrdu: 'مارخور', color: '#ecfccb' },
];

// Stories saved before animal avatars used child avatars a1–a6.
export const LEGACY_AVATAR_ANIMALS: Record<string, AnimalKind> = {
  a1: 'bunny', a2: 'lion', a3: 'cat', a4: 'fox', a5: 'owl', a6: 'panda',
};

export const SETTINGS: StorySetting[] = [
  { id: 'peshawar', label: 'Peshawar Bazaar', labelUrdu: 'پشاور بازار', labelPashto: 'د پېښور بازار', emoji: '🕌', gradient: 'from-saffron-400 to-rose2-500', sceneKey: 'bazaar' },
  { id: 'swat', label: 'Swat Valley', labelUrdu: 'سوات وادی', labelPashto: 'د سوات دره', emoji: '🏔️', gradient: 'from-sky2-400 to-emerald2-500', sceneKey: 'mountain' },
  { id: 'village', label: 'Punjabi Village', labelUrdu: 'پنجابی گاؤں', labelPashto: 'پنجابي کلی', emoji: '🏡', gradient: 'from-emerald2-400 to-amber2-500', sceneKey: 'village' },
  { id: 'eid', label: 'Eid Celebration', labelUrdu: 'عید کی خوشی', labelPashto: 'د اختر خوشحالي', emoji: '🌙', gradient: 'from-rose2-400 to-saffron-500', sceneKey: 'eid' },
];

export const LESSONS: StoryLesson[] = [
  { id: 'courage', label: 'Being Brave', labelUrdu: 'بہادری', labelPashto: 'زړورتیا', emoji: '🦁' },
  { id: 'kindness', label: 'Kindness', labelUrdu: 'مہربانی', labelPashto: 'مهرباني', emoji: '💝' },
  { id: 'honesty', label: 'Honesty', labelUrdu: 'ایمانداری', labelPashto: 'رښتینولي', emoji: '🌟' },
  { id: 'sharing', label: 'Sharing', labelUrdu: 'بانٹنا', labelPashto: 'شریکول', emoji: '🤝' },
];

export const PARENT_PURPOSES = [
  { id: 'darkness', label: 'Fear of the Dark', emoji: '🌙' },
  { id: 'school', label: 'Starting New School', emoji: '🏫' },
  { id: 'sharing', label: 'Learning to Share', emoji: '🤝' },
  { id: 'bullying', label: 'Dealing with Unkindness', emoji: '💪' },
];

export function buildStory(config: StoryConfig): StoryData {
  const { childName, setting, lesson, storyLength = 'short' } = config;
  const name = childName || 'our hero';
  const lessonText = text(lesson.label, lesson.labelUrdu, lesson.labelPashto);
  const pageText = (en: string, ur: string, ps: string): LocalizedText => text(en, ur, ps);
  const lengthConfig = STORY_LENGTHS[storyLength];

  // Base 6-page template
  const basePage: StoryPage[] = [
    {
      text: pageText(
        `Once upon a time, in beautiful ${setting.label}, lived a cheerful child named ${name}. ${name} was ready for a bright adventure!`,
        `ایک دن، خوبصورت ${setting.labelUrdu} میں، ${name} نام کا ایک خوش بچہ رہتا تھا۔ ${name} ایک روشن مہم کے لیے تیار تھا!`,
        `یو وخت، په ښکلي ${setting.labelPashto} کې، د ${name} په نوم یو خوشاله ماشوم اوسېده. ${name} د یوې ښکلې سفر لپاره چمتو و!`,
      ),
      sceneKey: 's0', illustration: setting.sceneKey as StoryPage['illustration'],
    },
    {
      text: pageText(
        `One sunny morning, ${name} heard a little bird asking for help. ${name} remembered the lesson of ${lesson.label} and promised to help.`,
        `ایک دھوپ صبح، ${name} نے ایک چھوٹی چڑیا کو مدد مانگتے سنا۔ ${name} کو ${lesson.labelUrdu} کا سبق یاد آیا اور اس نے مدد کا وعدہ کیا۔`,
        `یوه لمرینه سهار، ${name} د یوې وړې مرغۍ د مرستې غږ واورېد. ${name} د ${lesson.labelPashto} درس یاد کړ او د مرستې ژمنه یې وکړه.`,
      ),
      sceneKey: 's1', illustration: setting.sceneKey as StoryPage['illustration'],
      choices: [
        { text: text('Follow the bird to the old bazaar', 'چڑیا کے ساتھ پرانے بازار جاؤ', 'مرغۍ پسې زاړه بازار ته لاړ شه'), nextPage: 2 },
        { text: text('Ask a wise grandparent first', 'پہلے دانا دادا سے پوچھو', 'لومړی له هوښیار نیکه وپوښته'), nextPage: 3 },
      ],
    },
    {
      text: pageText(
        `${name} searched the colorful bazaar with a friend. The search became a chance to practice ${lesson.label}.`,
        `${name} نے ایک دوست کے ساتھ رنگین بازار تلاش کیا۔ یہ تلاش ${lesson.labelUrdu} پر عمل کرنے کا موقع بن گئی۔`,
        `${name} له یوه ملګري سره رنګین بازار وپلټه. دا لټون د ${lesson.labelPashto} د عملي کولو فرصت شو.`,
      ),
      sceneKey: 's2a', illustration: 'bazaar',
      choices: [{ text: text('Search together with care', 'مل کر احتیاط سے تلاش کرو', 'په پاملرنې سره یوځای ولټوئ'), nextPage: 4 }],
    },
    {
      text: pageText(
        `A wise grandparent shared a gentle idea with ${name}. It helped ${name} understand why ${lesson.label} matters.`,
        `دانا دادا نے ${name} کو ایک پیارا خیال بتایا۔ اس سے ${name} کو سمجھ آیا کہ ${lesson.labelUrdu} کیوں ضروری ہے۔`,
        `هوښیار نیکه له ${name} سره یو ښه فکر شریک کړ. ${name} پوه شو چې ${lesson.labelPashto} ولې مهم دی.`,
      ),
      sceneKey: 's2b', illustration: 'village',
      choices: [{ text: text('Follow the kind idea', 'اس اچھے خیال پر عمل کرو', 'د ښه فکر په لار لاړ شه'), nextPage: 4 }],
    },
    {
      text: pageText(
        `${name} solved the problem with ${lesson.label}. The little bird found its way home, and everyone felt happy.`,
        `${name} نے ${lesson.labelUrdu} کے ساتھ مسئلہ حل کیا۔ چھوٹی چڑیا کو اپنا گھر مل گیا اور سب خوش ہوئے۔`,
        `${name} ستونزه د ${lesson.labelPashto} په مرسته حل کړه. وړې مرغۍ خپل کور وموند او ټول خوشاله شول.`,
      ),
      sceneKey: 's4', illustration: 'eid',
    },
    {
      text: pageText(
        `Everyone cheered for ${name}. The adventure showed that ${lesson.label} can make an ordinary day shine.`,
        `سب نے ${name} کے لیے خوشی منائی۔ اس مہم نے دکھایا کہ ${lesson.labelUrdu} عام دن کو بھی روشن بنا سکتی ہے۔`,
        `ټولو د ${name} لپاره خوشالي وکړه. دې سفر وښوده چې ${lesson.labelPashto} یوه عادي ورځ هم روښانه کولی شي.`,
      ),
      sceneKey: 's5', illustration: 'eid',
    },
  ];

  // For medium and long, extend with varied continuation chapters
  const pages: StoryPage[] = basePage;
  if (storyLength === 'medium' || storyLength === 'long') {
    const illustrations: readonly StoryPage['illustration'][] = ['mountain', 'village', 'bazaar', 'eid', 'forest', 'school', 'night', 'journey'];
    const additionalCount = lengthConfig.pages - basePage.length;
    
    // Varied continuation scenarios for medium/long stories
    const continuationScenarios = [
      {
        en: `The next day, ${name} heard about a friend in trouble. Without hesitation, ${name} decided to help right away.`,
        ur: `اگلے دن، ${name} نے ایک دوست کی خبر سنی جو مسئلے میں تھا۔ بغیر کسی تامل کے، ${name} نے فوری مدد کا فیصلہ کیا۔`,
        ps: `بل ورځ، ${name} د یو ملګري خبر واورېد چې سخت حالت کې و. ${name} بې ځنډې د مرستې فیصله کړه۔`,
      },
      {
        en: `${name} gathered some friends to form a team. Together, they set out to find a way to spread ${lesson.label}.`,
        ur: `${name} نے کچھ دوستوں کو جمع کیا۔ ایک ٹیم بناتے ہوئے، وہ سب ${lesson.labelUrdu} پھیلانے کے لیے نکلے۔`,
        ps: `${name} چند ملګري یوځای کړل. یو ټیم جوړ کوونکي، ټول د ${lesson.labelPashto} د نشر کولو لپاره لاړل۔`,
      },
      {
        en: `In a small garden, ${name} met an elderly person who shared wisdom about ${lesson.label}. The words touched ${name}'s heart deeply.`,
        ur: `ایک چھوٹے باغ میں، ${name} نے ایک بزرگ سے ملاقات کی جو ${lesson.labelUrdu} کی حکمت بیان کرتے تھے۔ یہ بات ${name} کے دل تک پہنچی۔`,
        ps: `په یوه کوچنۍ باغ کې، ${name} یو زاړه کس سره لیدل چې د ${lesson.labelPashto} حکمت یې وویل۔ دا کلمې د ${name} د زړه ته رسې.`,
      },
      {
        en: `${name} realized that small acts of ${lesson.label} create big changes. Even one kind gesture can make someone smile.`,
        ur: `${name} نے سمجھا کہ چھوٹے کام بھی بڑی تبدیلی لاتے ہیں۔ ایک اچھا کام کسی کو خوش کر سکتا ہے۔`,
        ps: `${name} وپوهېده چې کوچنۍ کار د ${lesson.labelPashto} د ستونزې لپاره لوی بدلون رامنځته کوي. یوه نیکه کار د کس مخ ښکتا کولی شي.`,
      },
      {
        en: `The community noticed ${name}'s kindness and wanted to help too. More and more people joined in spreading ${lesson.label}.`,
        ur: `معاشرے نے ${name} کی دانائی کو دیکھا اور خود مدد کے لیے تیار ہو گئے۔ زیادہ سے زیادہ لوگ ${lesson.labelUrdu} میں شامل ہو گئے۔`,
        ps: `کمونټه د ${name} د نیکۍ خبر پیدا کړ او ټولو مرسته کولو ته چمتو شول. تر پایه د ${lesson.labelPashto} نشر کولو کې برخه اخستل۔`,
      },
      {
        en: `As the sun set, ${name} reflected on the day's journey. Every moment brought new lessons about ${lesson.label}.`,
        ur: `جیسے سورج غروب ہوا، ${name} نے دن کی یادوں پر غور کیا۔ ہر لمحہ ${lesson.labelUrdu} کا نیا سبق لایا۔`,
        ps: `لکه څنګه چې لمر ودیده، ${name} د ورځې سفر په فکر کې ورغیږیدل۔ هر ساعت د ${lesson.labelPashto} نوی درس راوړ۔`,
      },
      {
        en: `${name}'s heart grew warmer with each act of ${lesson.label}. The adventure had transformed ${name} into a true helper.`,
        ur: `${name} کا دل ہر عمل سے زیادہ گرم ہو رہا تھا۔ یہ مہم ${name} کو سچا مددگار بنا دیا۔`,
        ps: `د ${name} زړه هر عمل سره ګرم شو. دا سفر د ${name} یو ښه مددګار بنایه.`,
      },
      {
        en: `One final adventure awaited. ${name} understood that ${lesson.label} was not just for one day—it was a way to live.`,
        ur: `ایک آخری مہم انتظار میں تھی۔ ${name} کو سمجھ آیا کہ ${lesson.labelUrdu} ہر دن کا کام ہے۔`,
        ps: `یوه وروستنۍ سفر انتظار کې وه. ${name} پوهېده چې ${lesson.labelPashto} یوازې یوه ورځ نه وو بلکه یوه ژوند وه.`,
      },
    ];

    for (let i = 0; i < additionalCount; i++) {
      const illIndex = (i + 2) % illustrations.length;
      const scenario = continuationScenarios[i % continuationScenarios.length];
      const newPage: StoryPage = {
        text: pageText(scenario.en, scenario.ur, scenario.ps),
        sceneKey: `s${i + 6}`,
        illustration: illustrations[illIndex],
      };
      pages.push(newPage);
    }

    // Add the longer stories' decision points from the shared topology.
    const branchChoices = [
      text('Help right away', 'فوراً مدد کرو', 'سمدستي مرسته وکړه'),
      text('Ask a friend for an idea', 'کسی دوست سے مشورہ لو', 'له ملګري مشوره واخله'),
    ];
    const continueChoice = text('Continue the adventure', 'مہم جاری رکھو', 'سفر ته دوام ورکړه');
    for (const [index, targets] of Object.entries(choiceTargets(storyLength))) {
      pages[Number(index)].choices = targets.map((nextPage, i) => ({
        text: targets.length === 2 ? branchChoices[i] : continueChoice,
        nextPage,
      }));
    }
  }

  // Build quiz questions based on length
  const baseQuiz = [
    {
      question: text('Who did the hero help?', 'ہیرو نے کس کی مدد کی؟', 'اتل له چا سره مرسته وکړه؟'),
      options: [
        text('A little bird', 'ایک چھوٹی چڑیا', 'یوه وړه مرغۍ'),
        text('A toy', 'ایک کھلونا', 'یوه لوبتکه'),
        text('A cloud', 'ایک بادل', 'یو ورېځ'),
      ],
      answer: 0,
    },
    {
      question: text(`What lesson did ${name} practice?`, `${name} نے کون سا سبق اپنایا؟`, `${name} کوم درس عملي کړ؟`),
      options: [lessonText, text('Running fast', 'تیز دوڑنا', 'چټک منډه'), text('Eating sweets', 'مٹھائی کھانا', 'خواږه خوړل')],
      answer: 0,
    },
    {
      question: text('How did the story end?', 'کہانی کا اختتام کیسے ہوا؟', 'کیسه څنګه پای ته ورسېده؟'),
      options: [text('Everyone felt happy', 'سب خوش ہوئے', 'ټول خوشاله شول'), text('Everyone went home sad', 'سب اداس گھر گئے', 'ټول خفه کور ته لاړل'), text('The adventure stopped', 'مہم رک گئی', 'سفر ودرېد')],
      answer: 0,
    },
  ];

  let quiz = baseQuiz;
  if (storyLength === 'medium' || storyLength === 'long') {
    const extraQuestions = [
      {
        question: text(`Where did ${name}'s adventure take place?`, `${name} کا مہم کہاں ہوا؟`, `د ${name} سفر چېرې شوه؟`),
        options: [
          text(setting.label, setting.labelUrdu, setting.labelPashto),
          text('In the sky', 'آسمان میں', 'آسمان کې'),
          text('Under the sea', 'سمندر کے نیچے', 'سمندر لاندې'),
        ],
        answer: 0,
      },
      {
        question: text(`What did ${name} learn?`, `${name} نے کیا سیکھا؟`, `${name} څه زده کړه؟`),
        options: [
          lessonText,
          text('How to fly', 'اڑنا', 'الوتل'),
          text('How to swim', 'تیرنا', 'لوتې کول'),
        ],
        answer: 0,
      },
    ];
    quiz = [...baseQuiz, ...extraQuestions.slice(0, lengthConfig.quizQuestions - 3)];
  }

  return {
    title: text(
      `${name} and the ${setting.label} Adventure`,
      `${name} اور ${setting.labelUrdu} کی کہانی`,
      `${name} او د ${setting.labelPashto} کیسه`,
    ),
    pages,
    quiz,
    length: storyLength,
  };
}
