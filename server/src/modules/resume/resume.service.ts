/**
 * Resume Analyzer Service
 * Handles text extraction from PDF/DOCX and AI analysis via OpenAI
 */
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import { config } from '../../config/env.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

// File validation constants
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
];
export const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

/** Expected LLM response structure */
export interface ResumeAnalysisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
  grammarSuggestions: string[];
  atsTips: string[];
  improvements: string[];
}

/**
 * Extract text from PDF buffer using pdf-parse v2 (ESM, PDFParse class)
 */
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // PDFParse expects a data source; for buffers we pass the raw data
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return (result.text || '').trim();
}

/**
 * Extract text from DOCX buffer using mammoth
 */
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() || '';
}

/**
 * Extract text from resume based on file type
 */
export async function extractResumeText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPdf(buffer);
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractTextFromDocx(buffer);
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Analyze resume text using OpenAI and return structured feedback
 */
export async function analyzeResumeWithAI(text: string): Promise<ResumeAnalysisResult> {
  const systemPrompt = `You are an expert resume reviewer and career coach. Analyze resumes thoroughly and provide actionable, constructive feedback.
Always respond with valid JSON only. No markdown, no code blocks.`;

  const userPrompt = `Analyze this resume and provide structured feedback in JSON format.

RESUME TEXT:
---
${text.substring(0, 12000)}
---

Return a JSON object with these exact keys:
{
  "score": <number 0-100, overall resume quality>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "grammarSuggestions": ["grammar/clarity suggestion 1", "suggestion 2"],
  "atsTips": ["ATS optimization tip 1", "tip 2", "tip 3"],
  "improvements": ["actionable improvement 1", "improvement 2", "improvement 3"]
}

Be specific and actionable. Reference actual content from the resume when possible.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from AI');
  }

  const parsed = JSON.parse(content) as ResumeAnalysisResult;

  // Validate and normalize structure
  return {
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    grammarSuggestions: Array.isArray(parsed.grammarSuggestions) ? parsed.grammarSuggestions : [],
    atsTips: Array.isArray(parsed.atsTips) ? parsed.atsTips : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : []
  };
}
