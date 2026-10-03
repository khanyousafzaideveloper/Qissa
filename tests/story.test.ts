import { describe, expect, it } from 'vitest';
import { normalizeStory, StoryRequestSchema, validateChildSafety } from '../api/story';
import { fillHero } from '../src/data/generateStory';
import { AVATARS, LESSONS, SETTINGS, buildStory, type LocalizedText, type StoryConfig } from '../src/data/storyData';

const text = (en: string, ur: string, ps: string): LocalizedText => ({ en, ur, ps });

function validModelStory() {
  return {
    title: text('{{HERO}} and the Kind Valley', '{{HERO}} اور مہربان وادی', '{{HERO}} او مهربانه دره'),
    pages: [
      { text: text('{{HERO}} visits a sunny valley.', '{{HERO}} ایک روشن وادی میں جاتا ہے۔', '{{HERO}} یوې روښانه درې ته ځي.'), illustration: 'mountain' },
      {
        text: text('A little bird needs help.', 'ایک چھوٹی چڑیا کو مدد چاہیے۔', 'یوه وړه مرغۍ مرستې ته اړتیا لري.'), illustration: 'mountain',
        choices: [
          { text: text('Look near the stream', 'ندی کے پاس دیکھو', 'د ویالې خواته وګوره') },
          { text: text('Ask Ammi for help', 'امی سے مدد مانگو', 'له مور څخه مرسته وغواړه') },
        ],
      },
      {
        text: text('The stream sparkles in the sun.', 'ندی دھوپ میں چمکتی ہے۔', 'ویاله په لمر کې ځلېږي.'), illustration: 'journey',
        choices: [{ text: text('Search with a friend', 'دوست کے ساتھ تلاش کرو', 'له ملګري سره ولټوه') }],
      },
      {
        text: text('Ammi shares a kind idea.', 'امی ایک مہربان خیال بتاتی ہیں۔', 'مور یو مهربان نظر شریکوي.'), illustration: 'village',
        choices: [{ text: text('Follow the kind idea', 'مہربان خیال پر عمل کرو', 'د مهربان نظر په لار لاړ شه') }],
      },
      { text: text('{{HERO}} helps the bird find its nest.', '{{HERO}} چڑیا کو اس کا گھونسلہ ڈھونڈنے میں مدد دیتا ہے۔', '{{HERO}} له مرغۍ سره د خپل ځالې په موندلو کې مرسته کوي.'), illustration: 'forest' },
      { text: text('Everyone smiles and celebrates kindness.', 'سب مسکراتے ہیں اور مہربانی مناتے ہیں۔', 'ټول موسکي کېږي او مهرباني لمانځي.'), illustration: 'eid' },
    ],
    quiz: [
      { question: text('Who needed help?', 'کسے مدد چاہیے تھی؟', 'څوک مرستې ته اړتیا لرله؟'), options: [text('A bird', 'ایک چڑیا', 'یوه مرغۍ'), text('A tree', 'ایک درخت', 'یوه ونه'), text('A cloud', 'ایک بادل', 'یو ورېځ')], answer: 0 },
      { question: text('What did the hero show?', 'ہیرو نے کیا دکھایا؟', 'اتل څه وښودل؟'), options: [text('Kindness', 'مہربانی', 'مهرباني'), text('Speed', 'رفتار', 'چټکتیا'), text('Noise', 'شور', 'شور')], answer: 0 },
      { question: text('Where did the story happen?', 'کہانی کہاں ہوئی؟', 'کیسه چېرته وشوه؟'), options: [text('A valley', 'ایک وادی', 'یوه دره'), text('A city', 'ایک شہر', 'یو ښار'), text('A ship', 'ایک جہاز', 'یوه بېړۍ')], answer: 0 },
    ],
  };
}

describe('story API contracts', () => {
  it('rejects unknown request ids and unknown fields', () => {
    expect(StoryRequestSchema.safeParse({ settingId: 'unknown', lessonId: 'courage', language: 'pashto', gender: 'girl' }).success).toBe(false);
    expect(StoryRequestSchema.safeParse({ settingId: 'swat', lessonId: 'courage', language: 'pashto', gender: 'girl', extra: true }).success).toBe(false);
  });

  it('normalizes six pages and enforces the fixed branch targets', () => {
    const story = normalizeStory(validModelStory(), 'mountain');
    expect(story.pages).toHaveLength(6);
    expect(story.title.ps).toContain('دره');
    expect(story.pages[1].choices?.map((choice) => choice.nextPage)).toEqual([2, 3]);
    expect(story.pages[2].choices?.[0].nextPage).toBe(4);
    expect(story.pages[3].choices?.[0].nextPage).toBe(4);
    expect(story.pages[0].choices).toBeUndefined();
    expect(story.pages[4].choices).toBeUndefined();
    expect(story.pages[5].choices).toBeUndefined();
  });

  it('rejects unsafe story content', () => {
    const story = normalizeStory(validModelStory(), 'mountain');
    story.pages[0].text.en = 'A scary ghost appears.';
    expect(() => validateChildSafety(story)).toThrow('banned child-safety theme');
  });

  it('replaces the hero token recursively without changing other values', () => {
    const story = fillHero(validModelStory(), 'Ayesha');
    expect(story.title.en).toContain('Ayesha');
    expect(story.pages[4].text.ps).toContain('Ayesha');
    expect(JSON.stringify(story)).not.toContain('{{HERO}}');
  });

  it('makes the template fallback reflect every selected lesson in all languages', () => {
    for (const lesson of LESSONS) {
      const config: StoryConfig = {
        childName: 'Ayesha',
        avatar: AVATARS[0],
        language: 'pashto',
        hero: 'Ayesha',
        setting: SETTINGS[0],
        lesson,
      };
      const story = buildStory(config);
      expect(story.pages[1].text.en).toContain(lesson.label);
      expect(story.pages[1].text.ur).toContain(lesson.labelUrdu);
      expect(story.pages[1].text.ps).toContain(lesson.labelPashto);
      expect(story.quiz[1].options[0]).toEqual({ en: lesson.label, ur: lesson.labelUrdu, ps: lesson.labelPashto });
    }
  });

  it('generates stories of specified length', () => {
    const baseConfig: StoryConfig = {
      childName: 'Ayesha',
      avatar: AVATARS[0],
      language: 'english',
      hero: 'Ayesha',
      setting: SETTINGS[0],
      lesson: LESSONS[0],
    };

    // Short story
    const shortStory = buildStory({ ...baseConfig, storyLength: 'short' });
    expect(shortStory.pages).toHaveLength(6);
    expect(shortStory.quiz).toHaveLength(3);
    expect(shortStory.length).toBe('short');

    // Medium story
    const mediumStory = buildStory({ ...baseConfig, storyLength: 'medium' });
    expect(mediumStory.pages).toHaveLength(12);
    expect(mediumStory.quiz).toHaveLength(4);
    expect(mediumStory.length).toBe('medium');

    // Long story
    const longStory = buildStory({ ...baseConfig, storyLength: 'long' });
    expect(longStory.pages).toHaveLength(20);
    expect(longStory.quiz).toHaveLength(5);
    expect(longStory.length).toBe('long');
  });

  it('defaults to short when storyLength is not specified', () => {
    const config: StoryConfig = {
      childName: 'Ayesha',
      avatar: AVATARS[0],
      language: 'english',
      hero: 'Ayesha',
      setting: SETTINGS[0],
      lesson: LESSONS[0],
    };
    const story = buildStory(config);
    expect(story.pages).toHaveLength(6);
    expect(story.length).toBe('short');
  });
});
