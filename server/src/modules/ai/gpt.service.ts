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

// Intelligent validation and extraction for setup phase responses
export const validateAndExtractSetupAnswer = async (
  questionContext: string,
  userResponse: string,
  expectedType: 'jobRole' | 'interviewType' | 'techStack' | 'experienceLevel' | 'numberOfQuestions'
): Promise<{
  isValid: boolean;
  extractedValue: string | string[] | number | null;
  clarificationNeeded: boolean;
  clarificationQuestion?: string;
  conversationalResponse?: string;
}> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🤖 GPT validating: type=${expectedType}, response="${userResponse}"`);
  
  try {
    let prompt = '';
    
    switch (expectedType) {
      case 'jobRole':
        prompt = `The interviewer asked: "${questionContext}"
User responded: "${userResponse}"

Task: Extract the job role from the user's response. 

Rules:
- If the response is a valid job role/position (e.g., "Frontend Developer", "Data Scientist"), extract it cleanly
- Ignore filler words like "I want", "I'm interviewing for", "a", "an", "the"
- If the response is irrelevant or unclear (e.g., "let's continue", "okay", random text), mark as invalid
- Capitalize properly (e.g., "frontend developer" → "Frontend Developer")

Return JSON:
{
  "isValid": true/false,
  "extractedValue": "Cleaned Job Title" or null,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "What specific job role are you interviewing for? For example, Software Engineer, Product Manager, or Data Analyst." (only if clarification needed),
  "conversationalResponse": "Great! You're interviewing for a [Job Role] position." (only if valid)
}`;
        break;

      case 'interviewType':
        prompt = `The interviewer asked: "${questionContext}"
User responded: "${userResponse}"

Task: Determine the interview type from the user's response.

Valid types: "Technical", "Non-Technical", "Mixed"

Rules:
- Extract the intent even from natural language (e.g., "I want a technical one" → "Technical")
- If response contains "technical" but not "non" → "Technical"
- If response contains "non-technical" → "Non-Technical"  
- If response contains "mixed", "both", or "combination" → "Mixed"
- If unclear or irrelevant, ask for clarification

Return JSON:
{
  "isValid": true/false,
  "extractedValue": "Technical"/"Non-Technical"/"Mixed" or null,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "I didn't quite catch that. Would you like a Technical, Non-Technical, or Mixed interview?" (only if needed),
  "conversationalResponse": "Perfect! This will be a [Type] interview." (only if valid)
}`;
        break;

      case 'techStack':
        prompt = `The interviewer asked: "${questionContext}"
User responded: "${userResponse}"

Task: Extract technology names from the response.

Rules:
- Extract actual technology/tool names (e.g., "React", "Python", "AWS", "Node.js")
- Remove filler words ("I want to focus on", "please use", "can you", etc.)
- Handle various formats: "React and Node", "React, Python, and AWS", "focus on JavaScript"
- If response is irrelevant or doesn't mention technologies, mark as invalid
- Return as array of strings

Return JSON:
{
  "isValid": true/false,
  "extractedValue": ["Tech1", "Tech2"] or null,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "Could you tell me which technologies or programming languages you'd like me to focus on?" (only if needed),
  "conversationalResponse": "Got it! I'll focus on [Tech1, Tech2, Tech3]." (only if valid)
}`;
        break;

      case 'experienceLevel':
        prompt = `The interviewer asked: "${questionContext}"
User responded: "${userResponse}"

Task: Determine experience level from the response.

Valid levels: "Entry", "Mid", "Senior"

Rules:
- Map variations: "junior/beginner/fresher" → "Entry", "intermediate/middle" → "Mid", "lead/expert/advanced" → "Senior"
- Extract intent from natural language
- If unclear or irrelevant, ask for clarification

Return JSON:
{
  "isValid": true/false,
  "extractedValue": "Entry"/"Mid"/"Senior" or null,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "I need to know your experience level. Are you at Entry level, Mid level, or Senior level?" (only if needed),
  "conversationalResponse": "Excellent! You're at [Level] level." (only if valid)
}`;
        break;

      case 'numberOfQuestions':
        prompt = `The interviewer asked: "${questionContext}"
User responded: "${userResponse}"

Task: Extract the number of questions from the response.

Rules:
- Extract number from text (e.g., "five" → 5, "7 questions" → 7)
- Clamp between 3 and 10
- If no valid number found, ask for clarification

Return JSON:
{
  "isValid": true/false,
  "extractedValue": 5 (number between 3-10) or null,
  "clarificationNeeded": true/false,
  "clarificationQuestion": "How many questions would you like? Please choose a number between 3 and 10." (only if needed),
  "conversationalResponse": "Perfect! I'll prepare [N] questions for your interview." (only if valid)
}`;
        break;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an intelligent interview setup assistant. Extract information accurately and ask clarifying questions when needed. Always respond with valid JSON only.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);
    
    console.log(`[${timestamp}] ✅ GPT validation result:`, result);
    return result;
  } catch (error) {
    console.error(`[${timestamp}] ❌ GPT validation error:`, error);
    // Fallback to invalid with generic clarification
    return {
      isValid: false,
      extractedValue: null,
      clarificationNeeded: true,
      clarificationQuestion: "I didn't quite understand that. Could you please repeat your answer?"
    };
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

const SCORING_RUBRIC = `
SCORING RUBRIC (0-10 per question, strict calibration):
- 0-2: No answer, completely off-topic, or demonstrates no understanding
- 3-4: Minimal/vague answer, significant gaps, shows confusion on the topic
- 5-6: Partial answer with some correctness; misses key points or has notable errors
- 7-8: Solid answer; covers main points with minor gaps or could be more detailed
- 9-10: Excellent answer; comprehensive, accurate, well-structured, shows strong understanding

CRITICAL: Vary scores based on actual answer quality. Do NOT cluster around 7. 
- Strong interviews (mostly 8-10) → overall 85-95
- Average interviews (mix of 6-8) → overall 65-80  
- Weak interviews (mostly 4-6) → overall 45-60
`;

// Step 1: Score each Q&A pair individually (prevents score clustering)
const scoreEachAnswer = async (
  role: string,
  interviewType: string,
  experienceLevel: string,
  questions: string[],
  answers: string[]
): Promise<number[]> => {
  const qaList = questions.map((q, i) => 
    `Q${i + 1}: ${q}\nA${i + 1}: ${answers[i] || 'No answer provided'}`
  ).join('\n\n');

  const prompt = `You are an expert technical interview evaluator. Score EACH answer below independently.

Position: ${role}
Interview type: ${interviewType}
Experience level expected: ${experienceLevel}

${SCORING_RUBRIC}

Interview Q&A:
${qaList}

For each of the ${questions.length} answers, assign a score 0-10. Return ONLY a JSON object:
{"scores": [n1, n2, n3, ...]}

Each score must reflect that specific answer's quality. Vary the scores - not every answer deserves the same score.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a precise interview evaluator. Score each answer independently. Always respond with valid JSON only: {"scores": [number, number, ...]}' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content);
  const scores: number[] = parsed.scores || [];

  // Validate and clamp scores
  return scores.map((s: number) => Math.max(0, Math.min(10, Number(s) || 5)));
};

// Step 2: Generate feedback text based on computed score
const generateFeedbackText = async (
  role: string,
  experienceLevel: string,
  questions: string[],
  answers: string[],
  questionScores: number[],
  overallScore: number
): Promise<{ strengths: string[]; weaknesses: string[]; improvements: string[]; summary: string }> => {
  const qaList = questions.map((q, i) => 
    `Q${i + 1} (score: ${questionScores[i] ?? '?'}/10): ${q}\nA${i + 1}: ${answers[i] || 'No answer provided'}`
  ).join('\n\n');

  const prompt = `You are an expert interview coach. Generate constructive feedback for this ${experienceLevel}-level ${role} interview.

The candidate scored ${overallScore}/100 overall. Per-question scores: ${questionScores.join(', ')}/10.

Interview Q&A with scores:
${qaList}

Provide feedback in JSON format:
{
  "strengths": ["specific strength 1", "strength 2", "strength 3"],
  "weaknesses": ["specific weakness 1", "weakness 2"],
  "improvements": ["actionable suggestion 1", "suggestion 2", "suggestion 3"],
  "summary": "2-3 sentence overall assessment that reflects the ${overallScore} score - be honest and specific about performance level"
}

Be constructive, specific, and calibrated to the actual score. If score is low, acknowledge gaps; if high, highlight what went well.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are an expert interview coach. Provide constructive, honest feedback. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content || '{}';
  const parsed = JSON.parse(content);
  return {
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    summary: typeof parsed.summary === 'string' ? parsed.summary : 'Interview completed.'
  };
};

// Generate comprehensive feedback after interview (two-step: score per Q&A, then generate feedback)
export const generateFeedback = async (
  interviewData: {
    role: string;
    interviewType?: string;
    experienceLevel?: string;
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
  const timestamp = new Date().toISOString();
  const { role, questions, answers } = interviewData;
  const interviewType = interviewData.interviewType || 'Technical';
  const experienceLevel = interviewData.experienceLevel || 'Mid';

  try {
    // Step 1: Score each answer individually
    const questionScores = await scoreEachAnswer(
      role,
      interviewType,
      experienceLevel,
      questions,
      answers
    );

    // Aggregate: average of per-question scores, scaled to 0-100
    const avgScore = questionScores.length > 0
      ? questionScores.reduce((a, b) => a + b, 0) / questionScores.length
      : 5;
    const overallScore = Math.round(avgScore * 10);

    console.log(`[${timestamp}] 📊 Per-question scores: [${questionScores.join(', ')}] → overall: ${overallScore}/100`);

    // Step 2: Generate feedback text
    const feedback = await generateFeedbackText(
      role,
      experienceLevel,
      questions,
      answers,
      questionScores,
      overallScore
    );

    return {
      ...feedback,
      score: overallScore
    };
  } catch (error) {
    console.error('GPT feedback generation error:', error);
    throw new Error('Failed to generate feedback');
  }
};
