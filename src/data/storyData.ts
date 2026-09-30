export type Language = 'english' | 'urdu' | 'pashto';

export interface Avatar {
  id: string;
  name: string;
  color: string;
  skin: string;
  hair: string;
}

export interface StorySetting {
  id: string;
  label: string;
  labelUrdu: string;
  emoji: string;
  gradient: string;
  sceneKey: string;
}

export interface StoryLesson {
  id: string;
  label: string;
  labelUrdu: string;
  emoji: string;
}

export interface StoryPage {
  text: string;
  textUrdu: string;
  sceneKey: string;
  illustration: 'mountain' | 'village' | 'bazaar' | 'eid' | 'forest' | 'school' | 'night' | 'journey';
  choices?: { text: string; textUrdu: string; nextPage: number }[];
}

export interface StoryData {
  title: string;
  titleUrdu: string;
  pages: StoryPage[];
  quiz: { question: string; questionUrdu: string; options: string[]; answer: number }[];
}

export interface StoryConfig {
  childName: string;
  avatar: Avatar;
  language: Language;
  hero: string;
  setting: StorySetting;
  lesson: StoryLesson;
  parentPurpose?: string;
}

export const AVATARS: Avatar[] = [
  { id: 'a1', name: 'Ayesha', color: '#f93c6a', skin: '#f4c4a0', hair: '#2d1810' },
  { id: 'a2', name: 'Bilal', color: '#31a3eb', skin: '#e8b890', hair: '#1a1a1a' },
  { id: 'a3', name: 'Fatima', color: '#1eb549', skin: '#f0b888', hair: '#3d2317' },
  { id: 'a4', name: 'Hassan', color: '#fb7a0f', skin: '#d4a070', hair: '#1a1a1a' },
  { id: 'a5', name: 'Zainab', color: '#f59e0b', skin: '#f4c4a0', hair: '#2d1810' },
  { id: 'a6', name: 'Omar', color: '#e01f50', skin: '#c89060', hair: '#1a1a1a' },
];

export const SETTINGS: StorySetting[] = [
  { id: 'peshawar', label: 'Peshawar Bazaar', labelUrdu: 'پشاور بازار', emoji: '🕌', gradient: 'from-saffron-400 to-rose2-500', sceneKey: 'bazaar' },
  { id: 'swat', label: 'Swat Valley', labelUrdu: 'سوات وادی', emoji: '🏔️', gradient: 'from-sky2-400 to-emerald2-500', sceneKey: 'mountain' },
  { id: 'village', label: 'Punjabi Village', labelUrdu: 'پنجابی گاؤں', emoji: '🏡', gradient: 'from-emerald2-400 to-amber2-500', sceneKey: 'village' },
  { id: 'eid', label: 'Eid Celebration', labelUrdu: 'عید کی خوشی', emoji: '🌙', gradient: 'from-rose2-400 to-saffron-500', sceneKey: 'eid' },
];

export const LESSONS: StoryLesson[] = [
  { id: 'courage', label: 'Being Brave', labelUrdu: 'بہادری', emoji: '🦁' },
  { id: 'kindness', label: 'Kindness', labelUrdu: 'مهربانی', emoji: '💝' },
  { id: 'honesty', label: 'Honesty', labelUrdu: 'ایمانداری', emoji: '🌟' },
  { id: 'sharing', label: 'Sharing', labelUrdu: 'بانٹنا', emoji: '🤝' },
];

export const PARENT_PURPOSES = [
  { id: 'darkness', label: 'Fear of the Dark', emoji: '🌙' },
  { id: 'school', label: 'Starting New School', emoji: '🏫' },
  { id: 'sharing', label: 'Learning to Share', emoji: '🤝' },
  { id: 'bullying', label: 'Dealing with Unkindness', emoji: '💪' },
];

export function buildStory(config: StoryConfig): StoryData {
  const { childName, setting, lesson } = config;
  const name = childName || 'our hero';
  const sLabel = setting.label;

  return {
    title: `${name} and the ${sLabel} Adventure`,
    titleUrdu: `${name} اور ${setting.labelUrdu} کی کہانی`,
    pages: [
      {
        text: `Once upon a time, in the beautiful ${sLabel}, lived a bright and cheerful child named ${name}. ${name} woke up each morning with a big smile, ready for adventure!`,
        textUrdu: `ایک دن، خوبصورت ${setting.labelUrdu} میں، ایک چھوٹا بچہ رہتا تھا جس کا نام ${name} تھا۔ ${name} ہر صبح بڑی مسکرات کے ساتھ اٹھتا، نئی مہم کے لیے تیار!`,
        sceneKey: 's0',
        illustration: setting.sceneKey as any,
      },
      {
        text: `One sunny morning, ${name} heard a little bird singing a worried song. "Chirp chirp! Can you help me?" the bird asked. ${name} loved helping others and said, "Of course, little friend!"`,
        textUrdu: `ایک دھوپ صبح، ${name} کو ایک چھوٹی چڑی ملی جو پریشان تھی۔ "چہ چہ! مجھے مدد کرو?" چڑی نے کہا۔ ${name} نے کہا، "بالکل، میرے دوست!"`,
        sceneKey: 's1',
        illustration: setting.sceneKey as any,
        choices: [
          { text: 'Follow the bird to the old bazaar', textUrdu: 'چڑی کے ساتھ پرانے بازار میں جاؤ', nextPage: 2 },
          { text: 'Ask the wise old grandpa first', textUrdu: 'پہلے دانا دادا سے پوچھو', nextPage: 3 },
        ],
      },
      {
        text: `At the bustling bazaar, ${name} saw colorful shops and friendly faces. The bird led ${name} to a small tea shop where an old man had lost his special prayer beads. "I must find them before Eid!" he said sadly.`,
        textUrdu: `بازار میں، ${name} نے رنگین دکانیں اور دوستانہ چہرے دیکھے۔ چڑی نے ${name} کو ایک چائے کی دکان پر لے جایا، جہاں ایک بزرگ کو اپنی تسبیح گم ہوگئی تھی۔ "عید سے پہلے مل جائے!" انہوں نے کہا۔`,
        sceneKey: 's2a',
        illustration: 'bazaar',
        choices: [
          { text: 'Search the colorful bazaar together', textUrdu: 'ملتا جلتا بازار تلاش کرو', nextPage: 4 },
          { text: 'Ask the kind shopkeepers for help', textUrdu: 'دکان داروں سے مدد مانگو', nextPage: 4 },
        ],
      },
      {
        text: `Grandpa smiled wisely. "The beads are precious, ${name}. When you help someone, Allah's blessings are with you." He gave ${name} a warm pat on the head and a piece of sweet jalebi for energy.`,
        textUrdu: `دادا نے مسکراتے ہوئے کہا، "یہ تسبیح بہت قیمتی ہے، ${name}۔ جب تم کسی کی مدد کرتے ہو، اللہ کی رحمت تمہارے ساتھ ہوتی ہے۔" اور ${name} کو جلیبی دی۔`,
        sceneKey: 's2b',
        illustration: 'village',
        choices: [
          { text: 'Head to the bazaar to search', textUrdu: 'تلاش کے لیے بازار چلو', nextPage: 4 },
        ],
      },
      {
        text: `After a long search, ${name} found the beads near the mosque, sparkling in the sunlight! The old man was so happy he blessed ${name}. "You have a heart of gold, ${name}!" Everyone cheered.`,
        textUrdu: `تلاش کے بعد، ${name} کو تسبیح مسجد کے قریب ملی، دھوپ میں چمکتی ہوئی! بزرگ بہت خوش ہوئے اور دعا دی۔ "تمہارا دل سونے جیسا ہے، ${name}!" سب نے خوشی منائی۔`,
        sceneKey: 's4',
        illustration: 'eid',
      },
    ],
    quiz: [
      {
        question: `What did ${name} find for the old man?`,
        questionUrdu: `${name} نے بزرگ کے لیے کیا ڈھونڈا؟`,
        options: ['Prayer beads', 'A toy car', 'A book'],
        answer: 0,
      },
      {
        question: 'What did Grandpa give for energy?',
        questionUrdu: 'دادا نے توانائی کے لیے کیا دیا؟',
        options: ['A candy', 'Sweet jalebi', 'An apple'],
        answer: 1,
      },
      {
        question: 'What lesson did the story teach?',
        questionUrdu: 'کہانی نے کیا سبق دیا؟',
        options: ['Helping others', 'Running fast', 'Eating sweets'],
        answer: 0,
      },
    ],
  };
}
