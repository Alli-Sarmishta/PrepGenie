import { Request, Response } from 'express';
import { prisma } from '../../prisma/client.js';

// Create Interview
export const createInterview = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { role, interviewType, techStack, experienceLevel, numberOfQuestions } = req.body;

    // Validation
    if (!role || !interviewType || !experienceLevel || !numberOfQuestions) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const interview = await prisma.interview.create({
      data: {
        userId,
        role,
        interviewType,
        techStack: techStack || [],
        experienceLevel,
        numberOfQuestions: parseInt(numberOfQuestions),
        status: 'pending' // pending, in_progress, completed
      }
    });

    res.status(201).json({
      message: 'Interview created successfully',
      interview
    });
  } catch (error) {
    console.error('Create interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get All Interviews
export const getInterviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    const interviews = await prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        feedback: {
          select: {
            score: true
          }
        }
      }
    });

    res.json({ interviews });
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get Interview by ID
export const getInterviewById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const interview = await prisma.interview.findFirst({
      where: {
        id,
        userId
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answer: true
          }
        },
        feedback: true,
        transcriptChunks: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!interview) {
      res.status(404).json({ error: 'Interview not found' });
      return;
    }

    res.json({ interview });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update Interview Status
export const updateInterviewStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const interview = await prisma.interview.findFirst({
      where: { id, userId }
    });

    if (!interview) {
      res.status(404).json({ error: 'Interview not found' });
      return;
    }

    const updatedInterview = await prisma.interview.update({
      where: { id },
      data: { status }
    });

    res.json({
      message: 'Interview status updated',
      interview: updatedInterview
    });
  } catch (error) {
    console.error('Update interview status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
