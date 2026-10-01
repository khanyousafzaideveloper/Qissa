import { SETTINGS, LESSONS, PARENT_PURPOSES, type StoryData, type StoryPage } from '../src/data/storyData.js';

// The child's name never leaves the browser: the model writes this token and the client swaps it in.
const HERO = '{{HERO}}';

const ILLUSTRATIONS: StoryPage['illustration'][] = ['mountain', 'village', 'bazaar', 'eid', 'forest', 'school', 'night', 'journey'];

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const PROVIDER_TIMEOUT_MS = 25_000;

interface StoryRequest {
  settingId: string;
  lessonId: string;
  parentPurpose?: string;
  gender: 'girl' | 'boy';
}

const SYSTEM_PROMPT = `You are Qissa, a warm storyteller writing picture-book stories for Pakistani children aged 4 to 8.

Rules:
- Gentle, positive, and age-appropriate. No violence, scary content, romance, or anything unsafe for young children.
- Rooted in Pakistani culture: familiar foods, places, family members (Ammi, Abbu, Dada, Nani), festivals and manners. Respectful of Islamic values without preaching.
- Simple sentences a young child can follow. Each page is 2 to 4 short sentences.
- The hero is always written as the exact token ${HERO} (never invent a name for the hero).
- Every English field has a matching "Urdu" field: natural, simple Urdu in Urdu script (not Roman Urdu), with the same meaning.
- The lesson must come through the events of the story, not a lecture.

Return ONLY JSON in exactly this shape:
{
  "title": string, "titleUrdu": string,
  "pages": [6 objects: { "text": string, "textUrdu": string, "illustration": one of ${JSON.stringify(ILLUSTRATIONS)}, "choices"?: [{ "text": string, "textUrdu": string }] }],
  "quiz": [3 objects: { "question": string, "questionUrdu": string, "options": [3 short English strings], "answer": index 0-2 of the correct option }]
}

The 6 pages form a small branching story:
- Page 0: introduce ${HERO} and the setting. No choices.
- Page 1: a problem appears. Exactly 2 choices for what ${HERO} does next (choice 1 leads to page 2, choice 2 leads to page 3).
- Page 2: what happens after choice 1. Exactly 1 choice to continue (leads to page 4).
- Page 3: what happens after choice 2. Exactly 1 choice to continue (leads to page 4).
- Page 4: ${HERO} solves the problem using the lesson. No choices.
- Page 5: happy ending that shows the lesson. No choices.
Both branches must make sense before page 4. Quiz questions must be answerable from the story whichever branch the child picks.`;

function buildUserPrompt(req: StoryRequest): string {
  const setting = SETTINGS.find((s) => s.id === req.settingId)!;
  const lesson = LESSONS.find((l) => l.id === req.lessonId)!;
  const purpose = PARENT_PURPOSES.find((p) => p.id === req.parentPurpose);
  return [
    `Setting: ${setting.label} (${setting.labelUrdu}).`,
    `Lesson: ${lesson.label}.`,
    `The hero ${HERO} is a ${req.gender} (use the correct Urdu verb gender).`,
    purpose ? `A parent asked for this story to gently help their child with: "${purpose.label}". Weave this in naturally.` : '',
    'Write a fresh, original story.',
  ].filter(Boolean).join('\n');
}

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.9 },
      safetySettings: [
        'HARM_CATEGORY_HARASSMENT',
        'HARM_CATEGORY_HATE_SPEECH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'HARM_CATEGORY_DANGEROUS_CONTENT',
      ].map((category) => ({ category, threshold: 'BLOCK_LOW_AND_ABOVE' })),
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('');
  if (!text) throw new Error(`Gemini returned no text (finishReason: ${data?.candidates?.[0]?.finishReason})`);
  return text;
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned no text');
  return text;
}

const str = (v: unknown, field: string): string => {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`Missing ${field}`);
  return v.trim();
};

// Coerces model output into StoryData, enforcing the fixed branching layout the reader expects.
function normalizeStory(raw: unknown, fallbackIllustration: StoryPage['illustration']): StoryData {
  const r = raw as any;
  if (!Array.isArray(r?.pages) || r.pages.length !== 6) throw new Error('Expected 6 pages');
  if (!Array.isArray(r?.quiz) || r.quiz.length < 3) throw new Error('Expected 3 quiz questions');

  // Page index -> where each choice leads.
  const branching: Record<number, number[]> = { 1: [2, 3], 2: [4], 3: [4] };

  const pages: StoryPage[] = r.pages.map((p: any, i: number) => {
    const page: StoryPage = {
      text: str(p?.text, `pages[${i}].text`),
      textUrdu: str(p?.textUrdu, `pages[${i}].textUrdu`),
      sceneKey: `s${i}`,
      illustration: ILLUSTRATIONS.includes(p?.illustration) ? p.illustration : fallbackIllustration,
    };
    const targets = branching[i];
    if (targets) {
      if (!Array.isArray(p?.choices) || p.choices.length < targets.length) throw new Error(`pages[${i}] needs ${targets.length} choices`);
      page.choices = targets.map((nextPage, c) => ({
        text: str(p.choices[c]?.text, `pages[${i}].choices[${c}].text`),
        textUrdu: str(p.choices[c]?.textUrdu, `pages[${i}].choices[${c}].textUrdu`),
        nextPage,
      }));
    }
    return page;
  });

  const quiz = r.quiz.slice(0, 3).map((q: any, i: number) => {
    if (!Array.isArray(q?.options) || q.options.length !== 3) throw new Error(`quiz[${i}] needs 3 options`);
    const answer = Number(q.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer > 2) throw new Error(`quiz[${i}] bad answer`);
    return {
      question: str(q.question, `quiz[${i}].question`),
      questionUrdu: str(q.questionUrdu, `quiz[${i}].questionUrdu`),
      options: q.options.map((o: unknown, j: number) => str(o, `quiz[${i}].options[${j}]`)),
      answer,
    };
  });

  return { title: str(r.title, 'title'), titleUrdu: str(r.titleUrdu, 'titleUrdu'), pages, quiz };
}

function parseRequest(body: any): StoryRequest | null {
  if (!body || typeof body !== 'object') return null;
  const { settingId, lessonId, parentPurpose, gender } = body;
  if (!SETTINGS.some((s) => s.id === settingId)) return null;
  if (!LESSONS.some((l) => l.id === lessonId)) return null;
  if (parentPurpose !== undefined && !PARENT_PURPOSES.some((p) => p.id === parentPurpose)) return null;
  if (gender !== 'girl' && gender !== 'boy') return null;
  return { settingId, lessonId, parentPurpose, gender };
}

export async function POST(request: Request): Promise<Response> {
  const req = parseRequest(await request.json().catch(() => null));
  if (!req) return Response.json({ error: 'Invalid request' }, { status: 400 });

  const prompt = buildUserPrompt(req);
  const fallbackIllustration = SETTINGS.find((s) => s.id === req.settingId)!.sceneKey as StoryPage['illustration'];
  const errors: string[] = [];

  for (const [provider, call] of [['gemini', callGemini], ['groq', callGroq]] as const) {
    try {
      const story = normalizeStory(JSON.parse(await call(prompt)), fallbackIllustration);
      return Response.json({ story, provider });
    } catch (err) {
      errors.push(`${provider}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.error('Story generation failed', errors);
  return Response.json({ error: 'Story generation failed' }, { status: 502 });
}
