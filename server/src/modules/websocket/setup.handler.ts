import { WebSocket } from 'ws';
import { textToSpeech } from '../ai/audio.service.js';
import { validateAndExtractSetupAnswer } from '../ai/gpt.service.js';

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
  lastSetupQuestion?: string; // Store the last question asked for context
}

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
  let validationResult;

  switch (session.setupPhase) {
    case 'role':
      // Use GPT to validate and extract job role
      validationResult = await validateAndExtractSetupAnswer(
        session.lastSetupQuestion || "What job role are you interviewing for?",
        userResponse,
        'jobRole'
      );
      
      console.log(`[${timestamp}] 📝 Validation result:`, validationResult);
      
      if (!validationResult.isValid || validationResult.clarificationNeeded) {
        nextMessage = validationResult.clarificationQuestion!;
        // Don't advance the phase, ask again
      } else {
        session.setupData.jobRole = validationResult.extractedValue as string;
        session.setupPhase = 'type';
        nextMessage = validationResult.conversationalResponse! + 
          " Now, what type of interview would you like? Please say Technical, Non-Technical, or Mixed.";
        session.lastSetupQuestion = "What type of interview would you like?";
      }
      break;

    case 'type':
      validationResult = await validateAndExtractSetupAnswer(
        session.lastSetupQuestion || "What type of interview would you like?",
        userResponse,
        'interviewType'
      );
      
      console.log(`[${timestamp}] 📝 Validation result:`, validationResult);
      
      if (!validationResult.isValid || validationResult.clarificationNeeded) {
        nextMessage = validationResult.clarificationQuestion!;
      } else {
        session.setupData.interviewType = validationResult.extractedValue as string;
        session.setupPhase = 'techStack';
        nextMessage = validationResult.conversationalResponse! + 
          " What technologies or tech stack should I focus on? You can mention multiple technologies.";
        session.lastSetupQuestion = "What technologies should I focus on?";
      }
      break;

    case 'techStack':
      validationResult = await validateAndExtractSetupAnswer(
        session.lastSetupQuestion || "What technologies should I focus on?",
        userResponse,
        'techStack'
      );
      
      console.log(`[${timestamp}] 📝 Validation result:`, validationResult);
      
      if (!validationResult.isValid || validationResult.clarificationNeeded) {
        nextMessage = validationResult.clarificationQuestion!;
      } else {
        session.setupData.techStack = validationResult.extractedValue as string[];
        session.setupPhase = 'experience';
        nextMessage = validationResult.conversationalResponse! + 
          " What is your experience level? Please say Entry level, Mid level, or Senior level.";
        session.lastSetupQuestion = "What is your experience level?";
      }
      break;

    case 'experience':
      validationResult = await validateAndExtractSetupAnswer(
        session.lastSetupQuestion || "What is your experience level?",
        userResponse,
        'experienceLevel'
      );
      
      console.log(`[${timestamp}] 📝 Validation result:`, validationResult);
      
      if (!validationResult.isValid || validationResult.clarificationNeeded) {
        nextMessage = validationResult.clarificationQuestion!;
      } else {
        session.setupData.experienceLevel = validationResult.extractedValue as string;
        session.setupPhase = 'questions';
        nextMessage = validationResult.conversationalResponse! + 
          " Finally, how many questions would you like? Please say a number between 3 and 10.";
        session.lastSetupQuestion = "How many questions would you like?";
      }
      break;

    case 'questions':
      validationResult = await validateAndExtractSetupAnswer(
        session.lastSetupQuestion || "How many questions would you like?",
        userResponse,
        'numberOfQuestions'
      );
      
      console.log(`[${timestamp}] 📝 Validation result:`, validationResult);
      
      if (!validationResult.isValid || validationResult.clarificationNeeded) {
        nextMessage = validationResult.clarificationQuestion!;
      } else {
        const numQuestions = validationResult.extractedValue as number;
        session.setupData.numberOfQuestions = numQuestions;
        session.setupPhase = 'complete';
        
        nextMessage = `${validationResult.conversationalResponse} I'll prepare ${numQuestions} questions for your ${session.setupData.interviewType} interview for the ${session.setupData.jobRole} position. Give me a moment to generate your personalized questions.`;
        
        // Send message first
        await sendAIMessage(ws, nextMessage);
        
        // Now create interview and generate questions
        await finalizeSetup(ws, session);
        return;
      }
      break;

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
