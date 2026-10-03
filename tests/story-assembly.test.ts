import { describe, it, expect } from 'vitest';
import { buildStory } from '../src/data/storyData';
import { SETTINGS, LESSONS } from '../src/data/storyData';

describe('story-assembly', () => {
  const defaultConfig = {
    childName: 'Zara',
    setting: SETTINGS[0],
    lesson: LESSONS[0],
    language: 'english' as const,
    avatar: { gender: 'girl' as const, skinTone: 'medium' as const },
  };

  describe('buildStory', () => {
    it('builds a short story with correct page count', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'short' });
      expect(story.pages).toHaveLength(6);
      expect(story.length).toBe('short');
    });

    it('builds a medium story with correct page count', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      expect(story.pages).toHaveLength(12);
      expect(story.length).toBe('medium');
    });

    it('builds a long story with correct page count', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'long' });
      expect(story.pages).toHaveLength(20);
      expect(story.length).toBe('long');
    });

    it('scales quiz questions correctly', () => {
      const shortStory = buildStory({ ...defaultConfig, storyLength: 'short' });
      const mediumStory = buildStory({ ...defaultConfig, storyLength: 'medium' });
      const longStory = buildStory({ ...defaultConfig, storyLength: 'long' });

      expect(shortStory.quiz).toHaveLength(3);
      expect(mediumStory.quiz).toHaveLength(4);
      expect(longStory.quiz).toHaveLength(5);
    });

    it('includes child name in story text', () => {
      const story = buildStory({ ...defaultConfig, childName: 'Ahmed' });
      const storyText = JSON.stringify(story);
      expect(storyText).toContain('Ahmed');
    });

    it('preserves trilinguality (English, Urdu, Pashto)', () => {
      const story = buildStory(defaultConfig);
      
      for (const page of story.pages) {
        expect(page.text).toHaveProperty('en');
        expect(page.text).toHaveProperty('ur');
        expect(page.text).toHaveProperty('ps');
        
        // All should have content
        expect(page.text.en).toBeTruthy();
        expect(page.text.ur).toBeTruthy();
        expect(page.text.ps).toBeTruthy();
      }

      for (const question of story.quiz) {
        expect(question.question).toHaveProperty('en');
        expect(question.question).toHaveProperty('ur');
        expect(question.question).toHaveProperty('ps');
      }
    });

    it('defaults to short story when storyLength not provided', () => {
      const story = buildStory({ ...defaultConfig, storyLength: undefined });
      expect(story.pages).toHaveLength(6);
      expect(story.length).toBe('short');
    });

    it('sets correct story length field', () => {
      for (const length of ['short', 'medium', 'long'] as const) {
        const story = buildStory({ ...defaultConfig, storyLength: length });
        expect(story.length).toBe(length);
      }
    });
  });

  describe('choice calculation', () => {
    it('short story has choices at correct pages', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'short' });
      
      // Page 1 should have choices
      expect(story.pages[1].choices).toBeDefined();
      expect(story.pages[1].choices).toHaveLength(2);
      
      // Page 2 should have choice
      expect(story.pages[2].choices).toBeDefined();
      expect(story.pages[2].choices).toHaveLength(1);
      
      // Page 3 should have choice
      expect(story.pages[3].choices).toBeDefined();
      expect(story.pages[3].choices).toHaveLength(1);
      
      // Pages 0, 4, 5 should have no choices
      expect(story.pages[0].choices).toBeUndefined();
      expect(story.pages[4].choices).toBeUndefined();
      expect(story.pages[5].choices).toBeUndefined();
    });

    it('short story choices have correct nextPage values', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'short' });
      
      // Page 1 choices should go to pages 2 and 3
      const page1Choices = story.pages[1].choices!;
      expect(page1Choices[0].nextPage).toBe(2);
      expect(page1Choices[1].nextPage).toBe(3);
      
      // Page 2 and 3 choices should go to page 4
      expect(story.pages[2].choices![0].nextPage).toBe(4);
      expect(story.pages[3].choices![0].nextPage).toBe(4);
    });

    it('medium story has branch at page 4', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      
      // Branch at page 4
      expect(story.pages[4].choices).toBeDefined();
      expect(story.pages[4].choices).toHaveLength(2);
      
      // Converge at page 9
      expect(story.pages[9].choices).toBeUndefined();
    });

    it('long story has two branch points', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'long' });
      
      // First branch at page 6
      expect(story.pages[6].choices).toBeDefined();
      expect(story.pages[6].choices).toHaveLength(2);
      
      // Converge at page 13
      expect(story.pages[13].choices).toBeUndefined();
      
      // Second branch at page 16 (paths 17 and 18 rejoin at 19)
      expect(story.pages[16].choices).toBeDefined();
      expect(story.pages[16].choices).toHaveLength(2);
      
      // Final convergence at page 19 (no choices on last page)
      expect(story.pages[19].choices).toBeUndefined();
    });

    it('all choices have text in all languages', () => {
      const story = buildStory(defaultConfig);
      
      for (const page of story.pages) {
        if (page.choices) {
          for (const choice of page.choices) {
            expect(choice.text).toHaveProperty('en');
            expect(choice.text).toHaveProperty('ur');
            expect(choice.text).toHaveProperty('ps');
            
            expect(choice.text.en).toBeTruthy();
            expect(choice.text.ur).toBeTruthy();
            expect(choice.text.ps).toBeTruthy();
          }
        }
      }
    });
  });

  describe('story structure validation', () => {
    it('all pages have illustrations', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      
      for (const page of story.pages) {
        expect(page.illustration).toBeDefined();
        expect(page.sceneKey).toBeDefined();
      }
    });

    it('quiz answers are valid indices', () => {
      const story = buildStory(defaultConfig);
      
      for (const question of story.quiz) {
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(question.options.length);
      }
    });

    it('quiz options are trilingal', () => {
      const story = buildStory(defaultConfig);
      
      for (const question of story.quiz) {
        for (const option of question.options) {
          expect(option).toHaveProperty('en');
          expect(option).toHaveProperty('ur');
          expect(option).toHaveProperty('ps');
        }
      }
    });

    it('story has a title in all languages', () => {
      const story = buildStory(defaultConfig);
      
      expect(story.title).toHaveProperty('en');
      expect(story.title).toHaveProperty('ur');
      expect(story.title).toHaveProperty('ps');
      
      expect(story.title.en).toBeTruthy();
      expect(story.title.ur).toBeTruthy();
      expect(story.title.ps).toBeTruthy();
    });
  });

  describe('child name handling', () => {
    it('substitutes {{HERO}} with child name', () => {
      const story = buildStory({ ...defaultConfig, childName: 'Fatima' });
      const storyText = JSON.stringify(story);
      
      // Should contain child name
      expect(storyText).toContain('Fatima');
      
      // Should not contain literal {{HERO}}
      expect(storyText).not.toContain('{{HERO}}');
    });

    it('handles missing child name gracefully', () => {
      const story = buildStory({ ...defaultConfig, childName: '' });
      const storyText = JSON.stringify(story);
      
      // Should use default "our hero"
      expect(storyText).toContain('our hero');
    });

    it('preserves child name in all languages', () => {
      const childName = 'Zara';
      const story = buildStory({ ...defaultConfig, childName });
      const storyText = JSON.stringify(story);
      
      // Should appear multiple times (in each language section)
      const matches = storyText.match(/Zara/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThan(1);
    });
  });

  describe('medium and long story extensions', () => {
    it('medium story uses varied illustrations', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      const illustrations = story.pages.map((p) => p.illustration);
      
      // Should have some variety (not all the same)
      const uniqueIllustrations = new Set(illustrations);
      expect(uniqueIllustrations.size).toBeGreaterThan(1);
    });

    it('long story uses varied illustrations', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'long' });
      const illustrations = story.pages.map((p) => p.illustration);
      
      // Should have good variety
      const uniqueIllustrations = new Set(illustrations);
      expect(uniqueIllustrations.size).toBeGreaterThan(3);
    });

    it('medium story extends base template', () => {
      const shortStory = buildStory({ ...defaultConfig, storyLength: 'short' });
      const mediumStory = buildStory({ ...defaultConfig, storyLength: 'medium' });
      
      // First 6 pages should be similar
      for (let i = 0; i < 6; i++) {
        expect(mediumStory.pages[i].text.en).toContain(
          shortStory.pages[i].text.en.split(' ').slice(0, 3).join(' ')
        );
      }
    });

    it('long story has 20 pages total', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'long' });
      expect(story.pages).toHaveLength(20);
      expect(story.quiz).toHaveLength(5);
    });
  });

  describe('branching story paths', () => {
    it('ensures both paths lead to convergence in short stories', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'short' });
      
      // Page 2 (path A) should lead to page 4
      expect(story.pages[2].choices![0].nextPage).toBe(4);
      
      // Page 3 (path B) should lead to page 4
      expect(story.pages[3].choices![0].nextPage).toBe(4);
    });

    it('ensures both paths lead to convergence in medium stories', () => {
      const story = buildStory({ ...defaultConfig, storyLength: 'medium' });
      
      // Find the branch point (page 4)
      const branchPage = story.pages[4];
      const choiceA = branchPage.choices![0].nextPage;
      const choiceB = branchPage.choices![1].nextPage;
      
      // Both should eventually lead to a convergence page
      expect(choiceA).toBeLessThan(10);
      expect(choiceB).toBeLessThan(10);
    });
  });
});
