import { describe, it, expect } from 'vitest';
import { normalizeStory, StoryRequestSchema } from '../api/story';

const validModelStory = {
  title: { en: 'Test Story', ur: 'ٹیسٹ کہانی', ps: 'ټست کیسه' },
  pages: Array.from({ length: 6 }, (_, i) => ({
    text: { en: `Page ${i}`, ur: `صفحہ ${i}`, ps: `پانه ${i}` },
    illustration: 'mountain' as const,
  })),
  quiz: [
    { question: { en: 'Q1?', ur: 'سوال 1؟', ps: 'پوښتنه 1؟' }, options: [{ en: 'A', ur: 'الف', ps: 'الف' }, { en: 'B', ur: 'ب', ps: 'ب' }, { en: 'C', ur: 'ج', ps: 'ج' }], answer: 0 },
    { question: { en: 'Q2?', ur: 'سوال 2؟', ps: 'پوښتنه 2؟' }, options: [{ en: 'A', ur: 'الف', ps: 'الف' }, { en: 'B', ur: 'ب', ps: 'ب' }, { en: 'C', ur: 'ج', ps: 'ج' }], answer: 0 },
    { question: { en: 'Q3?', ur: 'سوال 3؟', ps: 'پوښتنه 3؟' }, options: [{ en: 'A', ur: 'الف', ps: 'الف' }, { en: 'B', ur: 'ب', ps: 'ب' }, { en: 'C', ur: 'ج', ps: 'ج' }], answer: 0 },
  ],
};

describe('story length validation', () => {
  describe('request schema validation', () => {
    it('accepts valid storyLength values (short, medium, long)', () => {
      const request = {
        settingId: 'swat',
        lessonId: 'kindness',
        language: 'english',
        gender: 'girl',
        storyLength: 'long',
      };
      const result = StoryRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('rejects invalid storyLength values', () => {
      const request = {
        settingId: 'swat',
        lessonId: 'kindness',
        language: 'english',
        gender: 'girl',
        storyLength: 'extra-long',
      };
      const result = StoryRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('accepts requests without storyLength', () => {
      const request = {
        settingId: 'swat',
        lessonId: 'kindness',
        language: 'english',
        gender: 'girl',
      };
      const result = StoryRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.storyLength).toBeUndefined();
      }
    });

    it('rejects unknown fields', () => {
      const request = {
        settingId: 'swat',
        lessonId: 'kindness',
        language: 'english',
        gender: 'girl',
        storyLength: 'medium',
        unknownField: 'should fail',
      };
      const result = StoryRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('normalizeStory', () => {
    it('normalizes 6-page story correctly', () => {
      const story = normalizeStory(validModelStory, 'mountain', 'short');
      expect(story.pages).toHaveLength(6);
      expect(story.length).toBe('short');
      expect(story.quiz).toHaveLength(3);
    });

    it('preserves title and pages', () => {
      const story = normalizeStory(validModelStory, 'mountain', 'short');
      expect(story.title).toEqual(validModelStory.title);
      expect(story.pages[0].text).toEqual(validModelStory.pages[0].text);
    });

    it('enforces quiz slicing to 3 questions', () => {
      const story = normalizeStory(validModelStory, 'mountain', 'short');
      expect(story.quiz).toHaveLength(3);
      expect(story.quiz[0].question.en).toBe('Q1?');
    });
  });

  describe('branching structure', () => {
    it('validates choice targets for short stories', () => {
      const storyWithChoices = {
        ...validModelStory,
        pages: validModelStory.pages.map((p, i) => ({
          ...p,
          ...(i === 1 ? { choices: [{ text: { en: 'A', ur: 'الف', ps: 'الف' } }, { text: { en: 'B', ur: 'ب', ps: 'ب' } }] } : {}),
          ...(i === 2 ? { choices: [{ text: { en: 'C', ur: 'ج', ps: 'ج' } }] } : {}),
          ...(i === 3 ? { choices: [{ text: { en: 'D', ur: 'د', ps: 'د' } }] } : {}),
        })),
      };
      const story = normalizeStory(storyWithChoices, 'mountain', 'short');
      expect(story.pages[1].choices?.[0].nextPage).toBe(2);
      expect(story.pages[1].choices?.[1].nextPage).toBe(3);
      expect(story.pages[2].choices?.[0].nextPage).toBe(4);
      expect(story.pages[3].choices?.[0].nextPage).toBe(4);
    });
  });
});
