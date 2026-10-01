import { describe, it, expect } from 'vitest';
import { generateTopology, validateTopology, getChoiceTargets, getPagePathMap, getNextPages } from '../src/lib/story-topology';

describe('story-topology', () => {
  describe('generateTopology', () => {
    it('generates correct topology for short stories (6 pages)', () => {
      const topology = generateTopology('short');
      expect(topology.length).toBe('short');
      expect(topology.totalPages).toBe(6);
      expect(topology.isValid).toBe(true);
      expect(topology.errors).toHaveLength(0);
      expect(topology.branchPoints).toHaveLength(1);
    });

    it('generates correct topology for medium stories (12 pages)', () => {
      const topology = generateTopology('medium');
      expect(topology.length).toBe('medium');
      expect(topology.totalPages).toBe(12);
      expect(topology.isValid).toBe(true);
      expect(topology.errors).toHaveLength(0);
      expect(topology.branchPoints).toHaveLength(1);
    });

    it('generates correct topology for long stories (20 pages)', () => {
      const topology = generateTopology('long');
      expect(topology.length).toBe('long');
      expect(topology.totalPages).toBe(20);
      expect(topology.isValid).toBe(true);
      expect(topology.errors).toHaveLength(0);
      expect(topology.branchPoints).toHaveLength(2);
    });
  });

  describe('validateTopology', () => {
    it('validates short story topology', () => {
      const topology = generateTopology('short');
      expect(topology.isValid).toBe(true);
      expect(topology.errors).toHaveLength(0);
    });

    it('validates medium story topology', () => {
      const topology = generateTopology('medium');
      expect(topology.isValid).toBe(true);
      expect(topology.errors).toHaveLength(0);
    });

    it('validates long story topology', () => {
      const topology = generateTopology('long');
      expect(topology.isValid).toBe(true);
      expect(topology.errors).toHaveLength(0);
    });

    it('detects invalid branch point page index', () => {
      const topology = generateTopology('short');
      topology.branchPoints[0].pageIndex = -1;
      validateTopology(topology);
      expect(topology.isValid).toBe(false);
      expect(topology.errors.length).toBeGreaterThan(0);
    });

    it('detects convergence page before branch point', () => {
      const topology = generateTopology('short');
      topology.branchPoints[0].convergePage = 1; // Before branch point at page 1
      validateTopology(topology);
      expect(topology.isValid).toBe(false);
      expect(topology.errors.length).toBeGreaterThan(0);
    });

    it('ensures all pages are reachable', () => {
      const topology = generateTopology('short');
      // All pages should be reachable from page 0
      expect(topology.isValid).toBe(true);
    });
  });

  describe('getChoiceTargets', () => {
    it('returns choice A and B targets for short stories', () => {
      const topology = generateTopology('short');
      const [targetA, targetB] = getChoiceTargets(topology, 0);
      expect(targetA).toBe(2); // Choice A starts at page 2
      expect(targetB).toBe(3); // Choice B starts at page 3
    });

    it('returns choice A and B targets for medium stories', () => {
      const topology = generateTopology('medium');
      const [targetA, targetB] = getChoiceTargets(topology, 0);
      expect(targetA).toBe(5);
      expect(targetB).toBe(7);
    });

    it('throws error for invalid branch point index', () => {
      const topology = generateTopology('short');
      expect(() => getChoiceTargets(topology, 99)).toThrow();
    });
  });

  describe('getPagePathMap', () => {
    it('maps pages to paths for short stories', () => {
      const topology = generateTopology('short');
      const pathMap = getPagePathMap(topology);
      
      // Linear pages
      expect(pathMap[0]).toBe('linear');
      expect(pathMap[1]).toBe('linear');
      
      // Branching pages
      expect(pathMap[2]).toBe('A');
      expect(pathMap[3]).toBe('B');
      
      // Convergence page
      expect(pathMap[4]).toBe('linear');
      expect(pathMap[5]).toBe('linear');
    });

    it('maps pages to paths for medium stories', () => {
      const topology = generateTopology('medium');
      const pathMap = getPagePathMap(topology);
      
      // Linear intro
      expect(pathMap[0]).toBe('linear');
      expect(pathMap[4]).toBe('linear');
      
      // Branch A
      expect(pathMap[5]).toBe('A');
      expect(pathMap[6]).toBe('A');
      
      // Branch B
      expect(pathMap[7]).toBe('B');
      expect(pathMap[8]).toBe('B');
      
      // Convergence
      expect(pathMap[9]).toBe('linear');
    });

    it('maps all pages for long stories', () => {
      const topology = generateTopology('long');
      const pathMap = getPagePathMap(topology);
      
      // Should have entries for all pages
      for (let i = 0; i < topology.totalPages; i++) {
        expect(pathMap[i]).toBeDefined();
        expect(['linear', 'A', 'B']).toContain(pathMap[i]);
      }
    });
  });

  describe('getNextPages', () => {
    it('returns next page for linear pages', () => {
      const topology = generateTopology('short');
      const nextPages = getNextPages(topology, 0);
      expect(nextPages).toEqual([1]);
    });

    it('returns both choice options at branch point', () => {
      const topology = generateTopology('short');
      const nextPages = getNextPages(topology, 1); // Branch point at page 1
      expect(nextPages).toHaveLength(2);
      expect(nextPages).toContain(2);
      expect(nextPages).toContain(3);
    });

    it('returns empty array for last page', () => {
      const topology = generateTopology('short');
      const nextPages = getNextPages(topology, topology.totalPages - 1);
      expect(nextPages).toEqual([]);
    });

    it('handles multiple branch points in long stories', () => {
      const topology = generateTopology('long');
      
      // First branch at page 6
      const nextPagesPage6 = getNextPages(topology, 6);
      expect(nextPagesPage6).toHaveLength(2);
      
      // Second branch at page 17
      const nextPagesPage17 = getNextPages(topology, 17);
      expect(nextPagesPage17).toHaveLength(2);
    });
  });

  describe('diamond branching validation', () => {
    it('short stories have single diamond branch', () => {
      const topology = generateTopology('short');
      const bp = topology.branchPoints[0];
      
      // Branch at page 1
      expect(bp.pageIndex).toBe(1);
      
      // Paths diverge
      expect(bp.choiceAStart).not.toBe(bp.choiceBStart);
      
      // Paths reconverge
      expect(bp.convergePage).toBeGreaterThan(Math.max(bp.choiceAEnd, bp.choiceBEnd));
    });

    it('medium stories have single diamond branch', () => {
      const topology = generateTopology('medium');
      expect(topology.branchPoints).toHaveLength(1);
      
      const bp = topology.branchPoints[0];
      expect(bp.pageIndex).toBe(4);
      expect(bp.convergePage).toBe(9);
    });

    it('long stories have two diamond branches', () => {
      const topology = generateTopology('long');
      expect(topology.branchPoints).toHaveLength(2);
      
      const bp1 = topology.branchPoints[0];
      const bp2 = topology.branchPoints[1];
      
      // First branch before second
      expect(bp1.pageIndex).toBeLessThan(bp2.pageIndex);
      
      // First branch converges before second starts
      expect(bp1.convergePage).toBeLessThan(bp2.pageIndex);
    });

    it('ensures no dead ends in any branch', () => {
      for (const length of ['short', 'medium', 'long'] as const) {
        const topology = generateTopology(length);
        
        // All pages should be reachable from start
        const reachable = new Set<number>();
        const queue = [0];
        
        while (queue.length > 0) {
          const page = queue.shift()!;
          if (reachable.has(page)) continue;
          reachable.add(page);
          
          const nextPages = getNextPages(topology, page);
          queue.push(...nextPages);
        }
        
        expect(reachable.size).toBe(topology.totalPages);
      }
    });
  });

  describe('branch point ordering', () => {
    it('ensures branches do not overlap in long stories', () => {
      const topology = generateTopology('long');
      const bp1 = topology.branchPoints[0];
      const bp2 = topology.branchPoints[1];
      
      // Second branch starts after first converges
      expect(bp2.pageIndex).toBeGreaterThan(bp1.convergePage);
    });
  });
});
