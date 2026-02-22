/**
 * MCQ Service
 * Generates AI MCQ questions from job description (aptitude + job-related) and provides feedback
 */
import OpenAI from 'openai';
import { config } from '../../config/env.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export interface McqQuestion {
  question: string;
  options: string[];
  correctIndex: number; // 0-based index of correct option
}

export interface McqQuestionForClient {
  question: string;
  options: string[];
}

const NUM_QUESTIONS = 10;
const OPTIONS_PER_QUESTION = 4;

// In-memory store: sessionId -> full questions (with correctIndex) for grading
const sessionStore = new Map<string, { questions: McqQuestion[]; jobTitle?: string; jobDescription: string }>();

function generateSessionId(): string {
  return `mcq_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Generate 10 MCQs: mix of aptitude and job-description related. Half and half.
 */
export async function generateMcqQuestions(
  jobDescription: string,
  jobTitle?: string
): Promise<{ sessionId: string; questions: McqQuestionForClient[] }> {
  const prompt = `You are an expert at creating multiple-choice questions for job preparation.

JOB TITLE (if provided): ${jobTitle || 'Not specified'}
JOB DESCRIPTION:
---
${jobDescription.trim().slice(0, 4000)}
---

Create EXACTLY ${NUM_QUESTIONS} multiple-choice questions with EXACTLY ${OPTIONS_PER_QUESTION} options each.

REQUIREMENTS:
- First 5 questions: APTITUDE (numerical reasoning, logical reasoning, verbal, or general aptitude). Keep them generic but professional.
- Next 5 questions: DIRECTLY RELATED to the job description and role (skills, domain, tools, or scenarios from the JD).
- Each question must have exactly 4 options (A, B, C, D). One correct answer.
- Use clear, unambiguous wording. correctIndex is 0-based (0 = first option, 3 = fourth option).

Return JSON in this exact format:
{
  "questions": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0
    }
  ]
}

CRITICAL: Return exactly ${NUM_QUESTIONS} questions. Each must have exactly ${OPTIONS_PER_QUESTION} options. correctIndex must be 0, 1, 2, or 3.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a precise MCQ generator. Always respond with valid JSON only. No markdown.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from AI');

  const parsed = JSON.parse(content) as { questions?: McqQuestion[] };
  let questions: McqQuestion[] = Array.isArray(parsed.questions) ? parsed.questions : [];

  // Validate and trim to exactly NUM_QUESTIONS
  questions = questions.slice(0, NUM_QUESTIONS).map((q, i) => ({
    question: String(q.question || `Question ${i + 1}`).trim(),
    options: Array.isArray(q.options) ? q.options.slice(0, OPTIONS_PER_QUESTION) : ['A', 'B', 'C', 'D'],
    correctIndex: Math.max(0, Math.min(OPTIONS_PER_QUESTION - 1, Number(q.correctIndex) || 0)),
  }));

  while (questions.length < NUM_QUESTIONS) {
    questions.push({
      question: `Sample question ${questions.length + 1}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
    });
  }

  const sessionId = generateSessionId();
  sessionStore.set(sessionId, { questions, jobTitle, jobDescription });

  // Return questions without correctIndex to client
  const forClient: McqQuestionForClient[] = questions.map(({ question, options }) => ({
    question,
    options,
  }));

  return { sessionId, questions: forClient };
}

export interface McqSubmitResult {
  score: number;
  total: number;
  correctCount: number;
  results: { question: string; options: string[]; correctIndex: number; userSelected: number; isCorrect: boolean }[];
  feedback: string;
}

export interface McqSubmitPayload {
  result: McqSubmitResult;
  jobDescription: string;
  jobTitle?: string;
}

/**
 * Grade submitted answers. Returns result + job context for feedback. Session is consumed (deleted).
 */
export function submitMcqAnswers(
  sessionId: string,
  answers: number[]
): McqSubmitPayload | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  const { questions, jobDescription, jobTitle } = session;
  sessionStore.delete(sessionId); // one-time use

  const results = questions.map((q, i) => {
    const userSelected = Math.max(0, Math.min(OPTIONS_PER_QUESTION - 1, Number(answers[i]) ?? -1));
    const isCorrect = userSelected === q.correctIndex;
    return {
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      userSelected,
      isCorrect,
    };
  });

  const correctCount = results.filter((r) => r.isCorrect).length;
  const total = questions.length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return {
    result: {
      score,
      total,
      correctCount,
      results,
      feedback: '',
    },
    jobDescription,
    jobTitle,
  };
}

/**
 * Generate feedback text from AI based on results
 */
export async function generateMcqFeedback(
  jobTitle: string | undefined,
  jobDescription: string,
  result: McqSubmitResult
): Promise<string> {
  const summary = `Score: ${result.correctCount}/${result.total} (${result.score}%).`;
  const wrong = result.results.filter((r) => !r.isCorrect).slice(0, 5);
  const wrongSummary = wrong
    .map(
      (r) =>
        `Q: ${r.question} | Your answer: ${r.options[r.userSelected] ?? 'N/A'} | Correct: ${r.options[r.correctIndex]}`
    )
    .join('\n');

  const prompt = `You are a career coach. A candidate just completed a 10-question MCQ quiz (mix of aptitude and job-related) for this role:

Job Title: ${jobTitle || 'General'}
Job Description (brief): ${jobDescription.slice(0, 1500)}

${summary}

${wrong.length > 0 ? `Some questions they got wrong:\n${wrongSummary}` : 'They answered all questions correctly.'}

Write a short, encouraging feedback paragraph (3–5 sentences). Acknowledge their score, highlight areas to improve if any, and suggest next steps (e.g. review job description, practice aptitude). Be constructive and friendly. Return only the paragraph, no JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a supportive career coach. Reply with a short paragraph only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
  });

  const text = response.choices[0]?.message?.content?.trim();
  return text || 'Good effort! Review the job description and practice similar questions to improve.';
}
