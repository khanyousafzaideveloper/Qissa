import type { StoryData } from '../src/data/storyData.js';

/**
 * Job status for story generation polling.
 * - 'generating': chapters are being generated, check back later
 * - 'complete': story is ready
 * - 'failed': generation failed (terminal state, details in error)
 */
export type JobStatus = 'generating' | 'complete' | 'failed';

/**
 * In-memory job storage: jobId → status + partial chapters.
 * In production, this would be a database (Redis, PostgreSQL, etc.)
 */
export interface StoryJob {
  jobId: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  chapters: StoryData[];
  story?: StoryData; // Complete story when status = 'complete'
  error?: string; // Error message if status = 'failed'
}

const jobs = new Map<string, StoryJob>();

/**
 * Create a new story generation job.
 * Returns the jobId for polling.
 */
export function createJob(jobId: string): StoryJob {
  const job: StoryJob = {
    jobId,
    status: 'generating',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chapters: [],
  };
  jobs.set(jobId, job);
  return job;
}

/**
 * Get job status and partial progress.
 * Returns null if job not found (expired after TTL).
 */
export function getJob(jobId: string): StoryJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Add a chapter to the job's progress.
 * Chapters arrive as the outline → chapters are generated server-side.
 */
export function addChapter(jobId: string, chapter: StoryData): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.chapters.push(chapter);
  job.updatedAt = Date.now();
}

/**
 * Mark job as complete with the final story.
 */
export function completeJob(jobId: string, story: StoryData): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'complete';
  job.story = story;
  job.updatedAt = Date.now();
  // Keep job in memory for 5 minutes for polling grace period
  setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
}

/**
 * Mark job as failed with error message.
 */
export function failJob(jobId: string, error: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = 'failed';
  job.error = error;
  job.updatedAt = Date.now();
  // Keep failed job in memory for 1 minute
  setTimeout(() => jobs.delete(jobId), 1 * 60 * 1000);
}

/**
 * Cleanup expired jobs (optional, for memory management).
 * Call periodically to clean up old jobs.
 */
export function cleanupExpiredJobs(maxAgeMs: number = 10 * 60 * 1000): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [jobId, job] of jobs.entries()) {
    if (now - job.updatedAt > maxAgeMs) {
      jobs.delete(jobId);
      cleaned++;
    }
  }
  return cleaned;
}

/**
 * HTTP handler: GET /api/story-status/:jobId
 * Returns current job status and partial/complete story data.
 */
export async function handleGetStoryStatus(jobId: string): Promise<Response> {
  const job = getJob(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found or expired' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const responseBody = {
    jobId: job.jobId,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    elapsedMs: job.updatedAt - job.createdAt,
    chapters: job.chapters.length,
    ...(job.status === 'complete' && job.story ? { story: job.story } : {}),
    ...(job.status === 'failed' && job.error ? { error: job.error } : {}),
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
