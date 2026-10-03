// .js extension so the Vercel Functions in api/ can import this under Node ESM.
import { type StoryLength, STORY_LENGTHS } from '../data/storyData.js';

/**
 * Represents a branching point in the story where the reader makes a choice.
 */
export interface BranchPoint {
  pageIndex: number; // The page where the choice appears
  choiceAStart: number; // First page of path A
  choiceAEnd: number; // Last page of path A
  choiceBStart: number; // First page of path B
  choiceBEnd: number; // Last page of path B
  convergePage: number; // Page where both paths rejoin
}

/**
 * Complete topology for a story including branch points and validation state.
 */
export interface StoryTopology {
  length: StoryLength;
  totalPages: number;
  branchPoints: BranchPoint[];
  isValid: boolean;
  errors: string[];
}

/**
 * Generate the branching topology for a story based on its length.
 * 
 * Short (6 pages): Keep existing branching as-is
 * Medium (12 pages): 2 branch points with ~2-page divergences
 * Long (20 pages): 2-3 branch points with ~3-4 page divergences
 */
export function generateTopology(length: StoryLength): StoryTopology {
  const config = STORY_LENGTHS[length];
  const totalPages = config.pages;

  let branchPoints: BranchPoint[] = [];

  if (length === 'short') {
    // Short (6 pages): pages 1-4 lead to pages 2,3 and then rejoin at page 4
    branchPoints = [
      {
        pageIndex: 1,
        choiceAStart: 2,
        choiceAEnd: 2,
        choiceBStart: 3,
        choiceBEnd: 3,
        convergePage: 4,
      },
    ];
  } else if (length === 'medium') {
    // Medium (12 pages): 
    // - Pages 0-3: intro (linear)
    // - Page 4: branch point 1 → paths A (pages 5-6) and B (pages 7-8) → converge at page 9
    // - Pages 9-10: converged (linear)
    // - Page 11: end (no choice)
    branchPoints = [
      {
        pageIndex: 4,
        choiceAStart: 5,
        choiceAEnd: 6,
        choiceBStart: 7,
        choiceBEnd: 8,
        convergePage: 9,
      },
    ];
  } else if (length === 'long') {
    // Long (20 pages):
    // - Pages 0-5: intro (linear)
    // - Page 6: branch point 1 → paths A (pages 7-9) and B (pages 10-12) → converge at page 13
    // - Pages 13-15: converged (linear)
    // - Page 16: branch point 2 → paths A (page 17) and B (page 18) → converge at page 19 (ending)
    branchPoints = [
      {
        pageIndex: 6,
        choiceAStart: 7,
        choiceAEnd: 9,
        choiceBStart: 10,
        choiceBEnd: 12,
        convergePage: 13,
      },
      {
        pageIndex: 16,
        choiceAStart: 17,
        choiceAEnd: 17,
        choiceBStart: 18,
        choiceBEnd: 18,
        convergePage: 19,
      },
    ];
  }

  const topology: StoryTopology = {
    length,
    totalPages,
    branchPoints,
    isValid: false,
    errors: [],
  };

  // Validate the topology
  validateTopology(topology);

  return topology;
}

/**
 * Validate that a topology is correct:
 * - No circular references
 * - All pages reachable from page 0
 * - All branch paths converge before the next branch
 * - Total page count matches expected length
 */
export function validateTopology(topology: StoryTopology): void {
  const errors: string[] = [];

  // Check 1: Total page count
  if (topology.totalPages !== STORY_LENGTHS[topology.length].pages) {
    errors.push(`Total pages ${topology.totalPages} does not match expected ${STORY_LENGTHS[topology.length].pages}`);
  }

  // Check 2: Branch point indices are valid
  for (const bp of topology.branchPoints) {
    if (bp.pageIndex < 0 || bp.pageIndex >= topology.totalPages) {
      errors.push(`Branch point page index ${bp.pageIndex} out of range [0, ${topology.totalPages - 1}]`);
    }
    if (bp.convergePage < 0 || bp.convergePage >= topology.totalPages) {
      errors.push(`Convergence page ${bp.convergePage} out of range [0, ${topology.totalPages - 1}]`);
    }
    if (bp.choiceAStart < 0 || bp.choiceAStart >= topology.totalPages) {
      errors.push(`Choice A start ${bp.choiceAStart} out of range`);
    }
    if (bp.choiceAEnd < 0 || bp.choiceAEnd >= topology.totalPages) {
      errors.push(`Choice A end ${bp.choiceAEnd} out of range`);
    }
    if (bp.choiceBStart < 0 || bp.choiceBStart >= topology.totalPages) {
      errors.push(`Choice B start ${bp.choiceBStart} out of range`);
    }
    if (bp.choiceBEnd < 0 || bp.choiceBEnd >= topology.totalPages) {
      errors.push(`Choice B end ${bp.choiceBEnd} out of range`);
    }
  }

  // Check 3: No circular references
  for (const bp of topology.branchPoints) {
    if (bp.convergePage <= bp.pageIndex) {
      errors.push(`Convergence page ${bp.convergePage} must be after branch point ${bp.pageIndex}`);
    }
    if (bp.choiceAEnd >= bp.convergePage) {
      errors.push(`Choice A end ${bp.choiceAEnd} must be before convergence page ${bp.convergePage}`);
    }
    if (bp.choiceBEnd >= bp.convergePage) {
      errors.push(`Choice B end ${bp.choiceBEnd} must be before convergence page ${bp.convergePage}`);
    }
  }

  // Check 4: Paths don't overlap (each path must be contiguous)
  for (const bp of topology.branchPoints) {
    if (bp.choiceAStart > bp.choiceAEnd) {
      errors.push(`Choice A start ${bp.choiceAStart} is after end ${bp.choiceAEnd}`);
    }
    if (bp.choiceBStart > bp.choiceBEnd) {
      errors.push(`Choice B start ${bp.choiceBStart} is after end ${bp.choiceBEnd}`);
    }
  }

  // Check 5: All pages are reachable from page 0
  const reachablePages = new Set<number>();
  const visited = new Set<number>();
  const queue = [0];

  while (queue.length > 0) {
    const page = queue.shift()!;
    if (visited.has(page)) continue;
    visited.add(page);
    reachablePages.add(page);

    // Find the next page(s) from this page
    for (const bp of topology.branchPoints) {
      if (page === bp.pageIndex) {
        // This is a branch point; both paths are reachable
        if (!visited.has(bp.choiceAStart)) queue.push(bp.choiceAStart);
        if (!visited.has(bp.choiceBStart)) queue.push(bp.choiceBStart);
        if (!visited.has(bp.convergePage)) queue.push(bp.convergePage);
      } else if (page >= bp.choiceAStart && page < bp.choiceAEnd) {
        // In path A
        if (!visited.has(page + 1)) queue.push(page + 1);
      } else if (page >= bp.choiceBStart && page < bp.choiceBEnd) {
        // In path B
        if (!visited.has(page + 1)) queue.push(page + 1);
      } else if (page >= bp.convergePage && page < topology.totalPages - 1) {
        // After convergence
        if (!visited.has(page + 1)) queue.push(page + 1);
      }
    }

    // In linear sections (before any branch), next page is current + 1
    if (page >= 0 && page < topology.totalPages - 1) {
      const inBranch = topology.branchPoints.some(
        (bp) =>
          page >= bp.choiceAStart && page <= bp.choiceAEnd ||
          page >= bp.choiceBStart && page <= bp.choiceBEnd,
      );
      if (!inBranch && !topology.branchPoints.some((bp) => page === bp.pageIndex)) {
        if (!visited.has(page + 1)) queue.push(page + 1);
      }
    }
  }

  for (let i = 0; i < topology.totalPages; i++) {
    if (!reachablePages.has(i)) {
      errors.push(`Page ${i} is not reachable from page 0`);
    }
  }

  // Check 6: Branches don't overlap
  for (let i = 0; i < topology.branchPoints.length; i++) {
    for (let j = i + 1; j < topology.branchPoints.length; j++) {
      const bp1 = topology.branchPoints[i];
      const bp2 = topology.branchPoints[j];
      if (bp2.pageIndex < bp1.convergePage) {
        errors.push(
          `Branch point 2 at page ${bp2.pageIndex} occurs before branch point 1 converges at page ${bp1.convergePage}`,
        );
      }
    }
  }

  topology.errors = errors;
  topology.isValid = errors.length === 0;
}

/**
 * Compute choice target pages based on topology.
 * Given a branch point index, returns [pageForChoiceA, pageForChoiceB]
 */
export function getChoiceTargets(topology: StoryTopology, branchPointIndex: number): [number, number] {
  if (branchPointIndex < 0 || branchPointIndex >= topology.branchPoints.length) {
    throw new Error(`Invalid branch point index ${branchPointIndex}`);
  }
  const bp = topology.branchPoints[branchPointIndex];
  return [bp.choiceAStart, bp.choiceBStart];
}

/**
 * Determine which pages belong to which choice path.
 * Returns a map: page index → 'A' | 'B' | 'linear' (before any branch)
 */
export function getPagePathMap(topology: StoryTopology): Record<number, string> {
  const map: Record<number, string> = {};

  for (let page = 0; page < topology.totalPages; page++) {
    let pathLabel = 'linear';

    for (const bp of topology.branchPoints) {
      if (page >= bp.choiceAStart && page <= bp.choiceAEnd) {
        pathLabel = 'A';
        break;
      }
      if (page >= bp.choiceBStart && page <= bp.choiceBEnd) {
        pathLabel = 'B';
        break;
      }
    }

    map[page] = pathLabel;
  }

  return map;
}

/**
 * Get the next page(s) from a given page.
 * Returns an array of possible next pages (usually [nextPage], but [choiceAStart, choiceBStart] for branch points)
 */
export function getNextPages(topology: StoryTopology, currentPage: number): number[] {
  // Check if this is a branch point
  for (const bp of topology.branchPoints) {
    if (currentPage === bp.pageIndex) {
      return [bp.choiceAStart, bp.choiceBStart];
    }
  }

  // Otherwise, next page is current + 1 (if exists)
  if (currentPage < topology.totalPages - 1) {
    return [currentPage + 1];
  }

  return []; // Last page has no next page
}

/**
 * Where each page's choices lead, derived from the topology:
 * the branch page offers both paths, and the last page of each path offers one
 * "continue" choice that jumps to the convergence page (so path A skips path B).
 */
export function choiceTargets(length: StoryLength): Record<number, number[]> {
  const targets: Record<number, number[]> = {};
  for (const bp of generateTopology(length).branchPoints) {
    targets[bp.pageIndex] = [bp.choiceAStart, bp.choiceBStart];
    targets[bp.choiceAEnd] = [bp.convergePage];
    targets[bp.choiceBEnd] = [bp.convergePage];
  }
  return targets;
}

/** Page-by-page outline for the AI prompt, one line per page so the model can't lose count. */
export function describeLayoutForPrompt(length: StoryLength): string {
  const topology = generateTopology(length);
  const targets = choiceTargets(length);
  const total = STORY_LENGTHS[length].pages;
  const lines: string[] = [];
  for (let page = 0; page < total; page++) {
    const bp = topology.branchPoints.find((b) => b.pageIndex === page);
    const inA = topology.branchPoints.find((b) => page >= b.choiceAStart && page <= b.choiceAEnd);
    const inB = topology.branchPoints.find((b) => page >= b.choiceBStart && page <= b.choiceBEnd);
    let role: string;
    if (page === 0) role = 'introduce the hero and the setting';
    else if (page === total - 1) role = 'happy ending that shows the lesson';
    else if (bp) role = `decision point: exactly 2 choices (choice 1 → page ${bp.choiceAStart}, choice 2 → page ${bp.choiceBStart})`;
    else if (inA) role = `path A (after choice 1 on page ${inA.pageIndex})`;
    else if (inB) role = `path B (after choice 2 on page ${inB.pageIndex}); must not depend on path A`;
    else role = 'story continues';
    const t = targets[page];
    if (t && t.length === 1) role += `; exactly 1 choice to continue → page ${t[0]}`;
    else if (!t) role += '; no choices';
    lines.push(`- Page ${page}: ${role}`);
  }
  lines.push(`That is exactly ${total} pages (0 to ${total - 1}). A child reads only one path at each decision point.`);
  return lines.join('\n');
}
