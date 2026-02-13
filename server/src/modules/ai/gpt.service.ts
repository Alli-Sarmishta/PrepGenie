import OpenAI from 'openai';
import { config } from '../../config/env.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

const INTERVIEWER_SYSTEM_PROMPT = `You are a professional but friendly interviewer for students and junior professionals. 

Your role:
- Ask clear, structured questions appropriate to the candidate's level
- Maintain a realistic interview tone
- Do not give feedback during the interview
- Be encouraging but professional
- Keep questions concise and relevant

Important: Only provide feedback after the entire interview is completed.

CRITICAL: Always respond with valid JSON only. No markdown, no code blocks, just pure JSON.`;

// Generate interview questions
export const generateQuestion = async (
  role: string,
  interviewType: string,
  techStack: string[],
  experienceLevel: string,
  numberOfQuestions: number
): Promise<string[]> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🎯 Generating ${numberOfQuestions} questions for ${role} (${experienceLevel} level)`);
  
  try {
    const prompt = `Generate EXACTLY ${numberOfQuestions} ${interviewType} interview questions for a ${role} position.
    
Experience level: ${experienceLevel}
${techStack.length > 0 ? `Tech stack: ${techStack.join(', ')}` : ''}

CRITICAL: You MUST generate EXACTLY ${numberOfQuestions} questions. No more, no less.

Requirements:
- Questions should be appropriate for ${experienceLevel} level
- Mix of theoretical and practical questions
- Progressive difficulty
- Clear and concise
- Each question should be unique and relevant

Return JSON in this exact format with EXACTLY ${numberOfQuestions} questions:
{
  "questions": ["question 1", "question 2", "question 3", ...]
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: INTERVIEWER_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{"questions": []}';
    
    // Parse JSON (GPT with json_object mode returns clean JSON)
    const parsed = JSON.parse(content);
    let questions = parsed.questions || parsed;

    if (!Array.isArray(questions)) {
      console.error(`[${timestamp}] ❌ Questions not an array:`, questions);
      questions = [];
    }

    console.log(`[${timestamp}] ✅ Generated ${questions.length} questions (requested: ${numberOfQuestions})`);
    
    // Enforce exact count - trim if too many
    if (questions.length > numberOfQuestions) {
      console.log(`[${timestamp}] ⚠️ Too many questions (${questions.length}), trimming to ${numberOfQuestions}`);
      questions = questions.slice(0, numberOfQuestions);
    } else if (questions.length < numberOfQuestions) {
      console.warn(`[${timestamp}] ⚠️ Too few questions (${questions.length}), expected ${numberOfQuestions}`);
    }

    return questions;
  } catch (error) {
    console.error('GPT question generation error:', error);
    throw new Error('Failed to generate questions');
  }
};

// Analyze answer and provide context (for internal use, not sent to user during interview)
export const analyzeAnswer = async (
  question: string,
  answer: string
): Promise<{ analysis: string; score: number }> => {
  try {
    const prompt = `Question: "${question}"
Answer: "${answer}"

Analyze this interview answer. Provide:
1. Brief analysis (2-3 sentences)
2. Score out of 10

Return as JSON: {"analysis": "...", "score": 7}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert interview evaluator. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{"analysis": "No analysis", "score": 5}';
    return JSON.parse(content);
  } catch (error) {
    console.error('GPT analysis error:', error);
    return { analysis: 'Unable to analyze', score: 5 };
  }
};

// Generate comprehensive feedback after interview
export const generateFeedback = async (
  interviewData: {
    role: string;
    questions: string[];
    answers: string[];
  }
): Promise<{
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  summary: string;
  score: number;
}> => {
  try {
    const qaList = interviewData.questions.map((q, i) => 
      `Q${i + 1}: ${q}\nA${i + 1}: ${interviewData.answers[i] || 'No answer provided'}`
    ).join('\n\n');

    const prompt = `Interview for ${interviewData.role} position.

${qaList}

Provide comprehensive feedback in JSON format:
{
  "strengths": ["point 1", "point 2", "point 3"],
  "weaknesses": ["point 1", "point 2"],
  "improvements": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "summary": "Overall summary paragraph",
  "score": 75
}

Be constructive, specific, and encouraging.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert interview coach providing constructive feedback. Always respond with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.6,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('GPT feedback generation error:', error);
    throw new Error('Failed to generate feedback');
  }
};
