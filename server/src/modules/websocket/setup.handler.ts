import { WebSocket } from 'ws';
import { textToSpeech } from '../ai/audio.service.js';

interface InterviewSession {
  interviewId: string;
  userId: string;
  currentQuestionIndex: number;
  questions: string[];
  answers: string[];
  isSetupPhase: boolean;
  setupPhase: 'role' | 'type' | 'techStack' | 'experience' | 'questions' | 'complete';
  setupData: {
    interviewType?: string;
    jobRole?: string;
    techStack?: string[];
    experienceLevel?: string;
    numberOfQuestions?: number;
  };
  lastQuestion?: string;
}

// Helper function to extract job role from natural language
const extractJobRole = (response: string): string => {
  const cleaned = response
    .toLowerCase()
    .replace(/^(hi|hello|hey|yes|yeah|sure|okay|ok|um|uh)[,\s]*/gi, '')
    .replace(/i'm\s+interviewing\s+for\s+(a|an|the)\s+/gi, '')
    .replace(/i'm\s+interviewing\s+for\s+/gi, '')
    .replace(/i\s+want\s+to\s+be\s+(a|an|the)\s+/gi, '')
    .replace(/i\s+want\s+to\s+be\s+/gi, '')
    .replace(/i'm\s+(a|an|the)\s+/gi, '')
    .replace(/i'm\s+/gi, '')
    .replace(/^(a|an|the)\s+/gi, '')
    .replace(/\s+position$/gi, '')
    .replace(/\s+role$/gi, '')
    .replace(/\.+$/g, '')
    .trim();
  
  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to extract interview type
const extractInterviewType = (response: string): string => {
  const lower = response.toLowerCase();
  
  if (lower.includes('technical') && !lower.includes('non')) {
    return 'Technical';
  } else if (lower.includes('non-technical') || lower.includes('non technical')) {
    return 'Non-Technical';
  } else if (lower.includes('mixed') || lower.includes('both')) {
    return 'Mixed';
  }
  
  // Default to Technical if unclear
  return 'Technical';
};

// Helper function to extract experience level
const extractExperienceLevel = (response: string): string => {
  const lower = response.toLowerCase();
  
  if (lower.includes('entry') || lower.includes('junior') || lower.includes('beginner') || lower.includes('fresher')) {
    return 'Entry';
  } else if (lower.includes('mid') || lower.includes('intermediate') || lower.includes('middle')) {
    return 'Mid';
  } else if (lower.includes('senior') || lower.includes('lead') || lower.includes('expert') || lower.includes('advanced')) {
    return 'Senior';
  }
  
  // Default to Mid if unclear
  return 'Mid';
};

const sendAIMessage = async (ws: WebSocket, text: string) => {
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[${timestamp}] 🎙️ SETUP: Generating TTS for: "${text.substring(0, 50)}..."`);
    const audioBuffer = await textToSpeech(text);
    const audioBase64 = audioBuffer.toString('base64');
    console.log(`[${timestamp}] ✅ SETUP: TTS generated (${audioBase64.length} chars)`);

    const message = {
      type: 'AI_SPEAKING',
      text,
      audio: audioBase64
    };
    
    console.log(`[${timestamp}] 📤 SETUP: Sending AI_SPEAKING message`);
    ws.send(JSON.stringify(message));
    console.log(`[${timestamp}] ✅ SETUP: Message sent successfully`);
  } catch (error) {
    console.error(`[${timestamp}] ❌ SETUP TTS error:`, error);
    console.log(`[${timestamp}] 📤 SETUP: Sending text-only fallback`);
    ws.send(JSON.stringify({
      type: 'AI_SPEAKING',
      text
    }));
  }
};

export const handleSetupResponse = async (
  ws: WebSocket,
  session: InterviewSession,
  userResponse: string
) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🎯 SETUP RESPONSE: Phase=${session.setupPhase}, Response="${userResponse}"`);
  
  let nextMessage = '';

  switch (session.setupPhase) {
    case 'role':
      const jobRole = extractJobRole(userResponse);
      console.log(`[${timestamp}] 📝 Raw response: "${userResponse}"`);
      console.log(`[${timestamp}] 📝 Extracted job role: "${jobRole}"`);
      
      if (!jobRole || jobRole.length < 2) {
        nextMessage = `I didn't catch that. What job role are you interviewing for? For example, Frontend Developer, Data Analyst, or Product Manager.`;
        break;
      }
      
      session.setupData.jobRole = jobRole;
      session.setupPhase = 'type';
      nextMessage = `Great! You're interviewing for a ${jobRole} position. Now, what type of interview would you like? Please say Technical, Non-Technical, or Mixed.`;
      break;

    case 'type':
      const interviewType = extractInterviewType(userResponse);
      console.log(`[${timestamp}] 📝 Raw response: "${userResponse}"`);
      console.log(`[${timestamp}] 📝 Extracted interview type: "${interviewType}"`);
      
      session.setupData.interviewType = interviewType;
      session.setupPhase = 'techStack';
      nextMessage = `Perfect! This will be a ${interviewType} interview. What technologies or tech stack should I focus on? You can mention multiple technologies.`;
      break;

    case 'techStack':
      // Parse tech stack from response - extract only technology names
      // Remove common filler words and focus on actual tech names
      const cleanedResponse = userResponse
        .toLowerCase()
        .replace(/yeah|yes|sure|okay|ok|can you|please|focus on|i want|i'd like/gi, '')
        .trim();
      
      const techStack = cleanedResponse
        .split(/,|\sand\s|\sor\s/)
        .map(t => t.trim())
        .filter(t => t.length > 1 && !/^(a|an|the|on|in|at|to|for)$/i.test(t));
      
      session.setupData.techStack = techStack;
      session.setupPhase = 'experience';
      
      if (techStack.length > 0) {
        // Capitalize first letter of each tech for better presentation
        const formattedTech = techStack.map(t => 
          t.charAt(0).toUpperCase() + t.slice(1)
        );
        nextMessage = `Got it! I'll focus on ${formattedTech.join(', ')}. What is your experience level? Please say Entry level, Mid level, or Senior level.`;
      } else {
        nextMessage = `Understood. What is your experience level? Please say Entry level, Mid level, or Senior level.`;
      }
      break;

    case 'experience':
      const experienceLevel = extractExperienceLevel(userResponse);
      console.log(`[${timestamp}] 📝 Raw response: "${userResponse}"`);
      console.log(`[${timestamp}] 📝 Extracted experience level: "${experienceLevel}"`);
      
      session.setupData.experienceLevel = experienceLevel;
      session.setupPhase = 'questions';
      nextMessage = `Excellent! You're at ${experienceLevel} level. Finally, how many questions would you like? Please say a number between 3 and 10.`;
      break;

    case 'questions':
      // Extract number from response
      const numbers = userResponse.match(/\d+/);
      let numQuestions = numbers ? parseInt(numbers[0]) : 5;
      numQuestions = Math.max(3, Math.min(10, numQuestions)); // Clamp between 3-10
      
      session.setupData.numberOfQuestions = numQuestions;
      session.setupPhase = 'complete';
      
      nextMessage = `Perfect! I'll prepare ${numQuestions} questions for your ${session.setupData.interviewType} interview for the ${session.setupData.jobRole} position. Give me a moment to generate your personalized questions.`;
      
      // Send message first
      await sendAIMessage(ws, nextMessage);
      
      // Now create interview and generate questions
      await finalizeSetup(ws, session);
      return;

    default:
      nextMessage = 'I didn\'t understand that. Could you please repeat?';
  }

  await sendAIMessage(ws, nextMessage);
};

const finalizeSetup = async (ws: WebSocket, session: InterviewSession) => {
  const timestamp = new Date().toISOString();
  const { prisma } = await import('../../prisma/client.js');
  const { generateQuestion } = await import('../ai/gpt.service.js');

  try {
    console.log(`[${timestamp}] 🎬 FINALIZING SETUP`);
    console.log(`[${timestamp}] 📊 Setup data:`, session.setupData);
    console.log(`[${timestamp}] 🔢 Number of questions requested: ${session.setupData.numberOfQuestions}`);
    
    // Create interview in database
    const interview = await prisma.interview.create({
      data: {
        userId: session.userId,
        role: session.setupData.jobRole!,
        interviewType: session.setupData.interviewType!,
        techStack: session.setupData.techStack || [],
        experienceLevel: session.setupData.experienceLevel!,
        numberOfQuestions: session.setupData.numberOfQuestions!,
        status: 'in_progress'
      }
    });

    session.interviewId = interview.id;
    console.log(`[${timestamp}] ✅ Interview created in DB with ID: ${interview.id}`);

    // Generate questions
    console.log(`[${timestamp}] 🤖 Calling GPT to generate ${session.setupData.numberOfQuestions} questions...`);
    const questions = await generateQuestion(
      session.setupData.jobRole!,
      session.setupData.interviewType!,
      session.setupData.techStack || [],
      session.setupData.experienceLevel!,
      session.setupData.numberOfQuestions!
    );
    
    console.log(`[${timestamp}] ✅ GPT returned ${questions.length} questions`);

    session.questions = questions;
    session.isSetupPhase = false;
    session.currentQuestionIndex = 0;

    // Save questions to database
    await Promise.all(
      questions.map((q: string, index: number) =>
        prisma.question.create({
          data: {
            interviewId: interview.id,
            questionText: q,
            orderIndex: index
          }
        })
      )
    );

    // Save setup conversation as transcript
    await prisma.transcriptChunk.create({
      data: {
        interviewId: interview.id,
        speaker: 'SYSTEM',
        text: `Setup completed: ${session.setupData.jobRole} - ${session.setupData.interviewType} - ${session.setupData.experienceLevel} level`
      }
    });

    // Start interview with first question
    const firstQuestion = questions[0];
    session.lastQuestion = firstQuestion;
    
    const startMessage = `Great! I've prepared your questions. Let's begin your interview. Here's your first question: ${firstQuestion}`;
    
    await sendAIMessage(ws, startMessage);

    // Save AI question to transcript
    await prisma.transcriptChunk.create({
      data: {
        interviewId: interview.id,
        speaker: 'AI',
        text: firstQuestion
      }
    });

  } catch (error) {
    console.error('Finalize setup error:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to create interview'
    }));
  }
};
