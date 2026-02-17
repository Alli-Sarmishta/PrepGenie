import { WebSocket } from 'ws';
import { textToSpeech } from '../ai/audio.service.js';
import { analyzeAnswer, generateFeedback } from '../ai/gpt.service.js';
import { prisma } from '../../prisma/client.js';

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
  lastSetupQuestion?: string;
}

const sendAIMessage = async (ws: WebSocket, text: string) => {
  try {
    const audioBuffer = await textToSpeech(text);
    const audioBase64 = audioBuffer.toString('base64');

    ws.send(JSON.stringify({
      type: 'AI_SPEAKING',
      text,
      audio: audioBase64
    }));
  } catch (error) {
    console.error('TTS error:', error);
    ws.send(JSON.stringify({
      type: 'AI_SPEAKING',
      text
    }));
  }
};

export const handleInterviewResponse = async (
  ws: WebSocket,
  session: InterviewSession,
  userAnswer: string
) => {
  try {
    // Store the answer
    session.answers[session.currentQuestionIndex] = userAnswer;

    // Save answer to database
    const questions = await prisma.question.findMany({
      where: { interviewId: session.interviewId },
      orderBy: { orderIndex: 'asc' }
    });

    const currentQuestion = questions[session.currentQuestionIndex];
    
    if (currentQuestion) {
      // Save user answer to database
      await prisma.answer.create({
        data: {
          interviewId: session.interviewId,
          questionId: currentQuestion.id,
          transcript: userAnswer
        }
      });

      // Save to transcript
      await prisma.transcriptChunk.create({
        data: {
          interviewId: session.interviewId,
          speaker: 'USER',
          text: userAnswer
        }
      });

      // Analyze answer in background (don't await)
      analyzeAnswer(session.lastQuestion || '', userAnswer).catch(err => 
        console.error('Answer analysis error:', err)
      );
    }

    // Move to next question
    session.currentQuestionIndex++;

    // Check if interview is complete
    if (session.currentQuestionIndex >= session.questions.length) {
      await completeInterview(ws, session);
      return;
    }

    // Ask next question
    const nextQuestion = session.questions[session.currentQuestionIndex];
    session.lastQuestion = nextQuestion;

    const nextMessage = `Thank you for your answer. Let's move to the next question. Question ${session.currentQuestionIndex + 1}: ${nextQuestion}`;

    await sendAIMessage(ws, nextMessage);

    // Save next question to transcript
    await prisma.transcriptChunk.create({
      data: {
        interviewId: session.interviewId,
        speaker: 'AI',
        text: nextQuestion
      }
    });

    // Notify client of progress
    ws.send(JSON.stringify({
      type: 'QUESTION_PROGRESS',
      current: session.currentQuestionIndex + 1,
      total: session.questions.length
    }));

  } catch (error) {
    console.error('Handle interview response error:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to process your answer'
    }));
  }
};

const completeInterview = async (ws: WebSocket, session: InterviewSession) => {
  try {
    // Generate comprehensive feedback
    const feedbackData = await generateFeedback({
      role: session.setupData.jobRole!,
      interviewType: session.setupData.interviewType,
      experienceLevel: session.setupData.experienceLevel,
      questions: session.questions,
      answers: session.answers
    });

    // Save feedback to database
    await prisma.feedback.create({
      data: {
        interviewId: session.interviewId,
        strengths: feedbackData.strengths,
        weaknesses: feedbackData.weaknesses,
        improvements: feedbackData.improvements,
        summary: feedbackData.summary,
        score: feedbackData.score
      }
    });

    // Update interview status
    await prisma.interview.update({
      where: { id: session.interviewId },
      data: { status: 'completed' }
    });

    const completionMessage = `Excellent! You've completed all questions. Your interview score is ${feedbackData.score} out of 100. ${feedbackData.summary}`;

    await sendAIMessage(ws, completionMessage);

    // Send feedback details
    ws.send(JSON.stringify({
      type: 'INTERVIEW_COMPLETED',
      interviewId: session.interviewId,
      feedback: feedbackData
    }));

  } catch (error) {
    console.error('Complete interview error:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to generate feedback'
    }));
  }
};

export const handleInterviewTermination = async (
  ws: WebSocket,
  session: InterviewSession
) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 🛑 TERMINATING INTERVIEW`);
  console.log(`[${timestamp}] 📊 Session state:`, {
    interviewId: session.interviewId,
    isSetupPhase: session.isSetupPhase,
    setupPhase: session.setupPhase,
    questionsCount: session.questions.length,
    answersCount: session.answers.length
  });

  try {
    // If still in setup phase, no interview was created yet
    if (session.isSetupPhase || !session.interviewId) {
      console.log(`[${timestamp}] ⚠️ Interview terminated during setup phase`);
      ws.send(JSON.stringify({
        type: 'INTERVIEW_TERMINATED',
        message: 'Interview setup was cancelled. No interview was conducted.'
      }));
      return;
    }

    // Generate partial feedback based on answered questions
    const answeredQuestions = session.questions.slice(0, session.currentQuestionIndex);
    const answeredResponses = session.answers.slice(0, session.currentQuestionIndex);

    console.log(`[${timestamp}] 📊 Answered ${answeredQuestions.length}/${session.questions.length} questions`);

    if (answeredQuestions.length === 0) {
      console.log(`[${timestamp}] ⚠️ No questions answered`);
      
      // Update interview status
      try {
        await prisma.interview.update({
          where: { id: session.interviewId },
          data: { status: 'terminated' }
        });
      } catch (dbError) {
        console.error(`[${timestamp}] ❌ DB error updating status:`, dbError);
      }
      
      ws.send(JSON.stringify({
        type: 'INTERVIEW_TERMINATED',
        interviewId: session.interviewId,
        message: 'Interview terminated. No questions were answered.'
      }));
      return;
    }

    console.log(`[${timestamp}] 🎯 Generating feedback...`);
    const feedbackData = await generateFeedback({
      role: session.setupData.jobRole || 'Unknown Role',
      interviewType: session.setupData.interviewType,
      experienceLevel: session.setupData.experienceLevel,
      questions: answeredQuestions,
      answers: answeredResponses
    });
    console.log(`[${timestamp}] ✅ Feedback generated. Score: ${feedbackData.score}`);

    // Save partial feedback
    try {
      await prisma.feedback.create({
        data: {
          interviewId: session.interviewId,
          strengths: feedbackData.strengths,
          weaknesses: feedbackData.weaknesses,
          improvements: feedbackData.improvements,
          summary: `Partial Interview (${answeredQuestions.length}/${session.questions.length} questions): ${feedbackData.summary}`,
          score: feedbackData.score
        }
      });
      console.log(`[${timestamp}] ✅ Feedback saved to database`);

      // Update status
      await prisma.interview.update({
        where: { id: session.interviewId },
        data: { status: 'completed' }
      });
    } catch (dbError) {
      console.error(`[${timestamp}] ❌ DB error saving feedback:`, dbError);
    }

    const terminationMessage = `Your interview was terminated. You answered ${answeredQuestions.length} out of ${session.questions.length} questions. Your score is ${feedbackData.score} out of 100.`;

    await sendAIMessage(ws, terminationMessage);

    ws.send(JSON.stringify({
      type: 'INTERVIEW_TERMINATED',
      interviewId: session.interviewId,
      feedback: feedbackData,
      questionsAnswered: answeredQuestions.length,
      totalQuestions: session.questions.length
    }));

    console.log(`[${timestamp}] ✅ Termination complete`);

  } catch (error) {
    console.error(`[${timestamp}] ❌ Handle termination error:`, error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: 'Failed to process interview termination'
    }));
  }
};
