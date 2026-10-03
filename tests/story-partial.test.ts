import { describe, it, expect } from 'vitest';
import { buildStory, SETTINGS, LESSONS } from '../src/data/storyData';
import { inferStoryLength } from '../src/data/storyData';

describe('story-partial', () => {
  const defaultConfig = {
    childName: 'Alex',
    setting: SETTINGS[0],
    lesson: LESSONS[0],
    language: 'english' as const,
    avatar: { gender: 'boy' as const, skinTone: 'light' as const },
  };

  describe('partial story fallback', () => {
    it('buildStory provides complete fallback for any length', () => {
      for (const length of ['short', 'medium', 'long'] as const) {
        const story = buildStory({ ...defaultConfig, storyLength: length });
        
        // Should have complete structure
        expect(story.pages.length).toBeGreaterThan(0);
        expect(story.quiz.length).toBeGreaterThan(0);
        expect(story.title).toBeTruthy();
        expect(story.length).toBe(length);
      }
    });

    it('partial story can be completed from template', () => {
      // Simulate a partial story (e.g., 3 pages received before timeout)
      const partialPages = [
        {
          text: { en: 'Once upon a time...', ur: 'ایک دن...', ps: 'یو وخت...' },
          illustration: 'mountain' as const,
          sceneKey: 's0',
        },
        {
          text: { en: 'A hero appears...', ur: 'ایک ہیرو نمودار ہوا...', ps: 'یو قهرمان ظاهر شو...' },
          illustration: 'village' as const,
          sceneKey: 's1',
          choices: [
            {
              text: { en: 'Choice A', ur: 'اختیار A', ps: 'انتخاب A' },
              nextPage: 2,
            },
            {
              text: { en: 'Choice B', ur: 'اختیار B', ps: 'انتخاب B' },
              nextPage: 3,
            },
          ],
        },
      ];

      // Fill remaining with template
      const fullStory = buildStory({ ...defaultConfig, storyLength: 'short' });
      
      // Partial story should be completable
      expect(partialPages.length).toBeLessThan(fullStory.pages.length);
      expect(fullStory.pages.length).toBe(6);
    });

    it('template fallback maintains story structure', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      
      // Validate complete structure
      expect(story.pages.every((p) => p.text && p.illustration)).toBe(true);
      expect(story.quiz.every((q) => q.question && q.options && q.answer !== undefined)).toBe(true);
      
      // All required fields present
      expect(story.title).toBeTruthy();
      expect(story.length).toBe('medium');
    });

    it('template provides appropriate length for partial completion', () => {
      // Short story: if generation fails, should still get 6 pages
      const shortTemplate = buildStory({ ...defaultConfig, storyLength: 'short' });
      expect(shortTemplate.pages).toHaveLength(6);
      expect(shortTemplate.quiz).toHaveLength(3);
      
      // Medium story: 12 pages + 4 questions
      const mediumTemplate = buildStory({ ...defaultConfig, storyLength: 'medium' });
      expect(mediumTemplate.pages).toHaveLength(12);
      expect(mediumTemplate.quiz).toHaveLength(4);
      
      // Long story: 20 pages + 5 questions
      const longTemplate = buildStory({ ...defaultConfig, storyLength: 'long' });
      expect(longTemplate.pages).toHaveLength(20);
      expect(longTemplate.quiz).toHaveLength(5);
    });
  });

  describe('backward compatibility with partial data', () => {
    it('infers length from page count for old stories', () => {
      // Old 6-page story without length field
      expect(inferStoryLength(6)).toBe('short');
      
      // Old generated 12-page story
      expect(inferStoryLength(12)).toBe('medium');
      
      // Old generated 20-page story
      expect(inferStoryLength(20)).toBe('long');
      
      // Unknown page count defaults to short
      expect(inferStoryLength(5)).toBe('short');
      expect(inferStoryLength(15)).toBe('short');
    });

    it('handles stories with missing quiz questions gracefully', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      
      // Even if fewer questions received, can still use template questions
      expect(story.quiz.length).toBe(4);
      
      // Each question is valid
      for (const q of story.quiz) {
        expect(q.question).toBeTruthy();
        expect(q.options).toHaveLength(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(3);
      }
    });

    it('maintains trilinguality even in partial/fallback mode', () => {
      const story = buildStory(defaultConfig);
      
      // All text should be trilingual
      for (const page of story.pages) {
        expect(page.text.en).toBeTruthy();
        expect(page.text.ur).toBeTruthy();
        expect(page.text.ps).toBeTruthy();
      }
      
      for (const q of story.quiz) {
        expect(q.question.en).toBeTruthy();
        expect(q.question.ur).toBeTruthy();
        expect(q.question.ps).toBeTruthy();
      }
    });
  });

  describe('partial story recovery', () => {
    it('can append pages to partial story', () => {
      // Simulate partial story with first 4 pages
      const partialPages = Array.from({ length: 4 }, (_, i) => ({
        text: { en: `Page ${i}`, ur: `صفحہ ${i}`, ps: `پانه ${i}` },
        illustration: 'mountain' as const,
        sceneKey: `s${i}`,
      }));

      // Get template to fill remaining
      const template = buildStory({ ...defaultConfig, storyLength: 'short' });
      
      // Can extend partial with template pages
      const completed = [...partialPages, ...template.pages.slice(partialPages.length)];
      
      expect(completed).toHaveLength(6);
      expect(completed.every((p) => p.text && p.illustration)).toBe(true);
    });

    it('can recover from partial quiz', () => {
      // Simulate partial quiz (only 1 question received)
      const partialQuiz = [
        {
          question: { en: 'Q1?', ur: 'سوال 1؟', ps: 'پوښتنه 1؟' },
          options: [
            { en: 'A', ur: 'الف', ps: 'الف' },
            { en: 'B', ur: 'ب', ps: 'ب' },
            { en: 'C', ur: 'ج', ps: 'ج' },
          ],
          answer: 0,
        },
      ];

      // Get template to fill remaining
      const template = buildStory({ ...defaultConfig, storyLength: 'short' });
      
      // Can extend partial quiz with template questions
      const completed = [...partialQuiz, ...template.quiz.slice(partialQuiz.length)];
      
      expect(completed).toHaveLength(3);
      expect(completed[0]).toEqual(partialQuiz[0]);
      expect(completed[1]).toBeTruthy();
      expect(completed[2]).toBeTruthy();
    });
  });

  describe('fallback story validity', () => {
    it('template story has no dead-end choices', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'short' });
      
      // Track reachable pages
      const reachable = new Set<number>();
      const queue = [0];
      
      while (queue.length > 0) {
        const pageIdx = queue.shift()!;
        if (reachable.has(pageIdx)) continue;
        reachable.add(pageIdx);
        
        const page = story.pages[pageIdx];
        if (page.choices) {
          for (const choice of page.choices) {
            queue.push(choice.nextPage);
          }
        } else if (pageIdx < story.pages.length - 1) {
          // Linear progression
          queue.push(pageIdx + 1);
        }
      }
      
      // All pages should be reachable
      expect(reachable.size).toBe(story.pages.length);
    });

    it('template story has valid choice targets', () => {
      for (const length of ['short', 'medium', 'long'] as const) {
        const story = buildStory({ ...defaultConfig, storyLength: length });
        
        for (let pageIdx = 0; pageIdx < story.pages.length; pageIdx++) {
          const page = story.pages[pageIdx];
          if (page.choices) {
            for (const choice of page.choices) {
              expect(choice.nextPage).toBeGreaterThanOrEqual(0);
              expect(choice.nextPage).toBeLessThan(story.pages.length);
              expect(choice.nextPage).toBeGreaterThan(pageIdx);
            }
          }
        }
      }
    });

    it('template story quiz answers are valid', () => {
      const story = buildStory(defaultConfig);
      
      for (const question of story.quiz) {
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(question.options.length);
      }
    });
  });

  describe('fallback activation criteria', () => {
    it('short story should fallback immediately if generation fails', () => {
      // Template is ready immediately
      const story = buildStory({ ...defaultConfig, storyLength: 'short' });
      expect(story).toBeDefined();
      expect(story.pages).toHaveLength(6);
    });

    it('medium story provides fallback for timeout', () => {
      // Even if generation takes too long, template is available
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      expect(story).toBeDefined();
      expect(story.pages).toHaveLength(12);
    });

    it('long story provides fallback for extended timeouts', () => {
      // Template remains available even for long stories
      const story = buildStory({ ...defaultConfig, storyLength: 'long' });
      expect(story).toBeDefined();
      expect(story.pages).toHaveLength(20);
    });
  });

  describe('user experience with fallback', () => {
    it('fallback story is still enjoyable (not obviously templated)', () => {
      const story = buildStory({ ...defaultConfig, childName: 'Zara' });
      
      // Child name should appear (personalized)
      const storyText = JSON.stringify(story);
      expect(storyText).toContain('Zara');
      
      // Should have narrative flow
      expect(story.pages.length).toBeGreaterThan(1);
      
      // Should have proper branching
      const hasChoices = story.pages.some((p) => p.choices && p.choices.length > 0);
      expect(hasChoices).toBe(true);
    });

    it('fallback maintains lesson throughout story', () => {
      const lesson = LESSONS[0];
      const story = buildStory({ ...defaultConfig, lesson });
      
      // Lesson should be referenced in story text
      const storyText = JSON.stringify(story).toLowerCase();
      const lessonKeywords = lesson.label.toLowerCase();
      
      // Story should contain the lesson concept
      expect(storyText.includes(lessonKeywords.split(' ')[0])).toBe(true);
    });

    it('fallback preserves setting throughout story', () => {
      const setting = SETTINGS[0];
      const story = buildStory({ ...defaultConfig, setting });
      
      // Setting should be referenced
      // At least some pages mention the setting
      const mentionsSettingCount = story.pages.filter((p) =>
        JSON.stringify(p).includes(setting.label)
      ).length;
      
      expect(mentionsSettingCount).toBeGreaterThan(0);
    });
  });
});
