import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiService } from '@/lib/ai-service';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow all authenticated users to use tutoring
    if (!session.user.role) {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    const { questionId, questionText, subject, userMessage, conversationHistory } = await request.json();

    // Generate guided tutoring response
    const tutoringResponse = await generateTutoringResponseDirect(
      `STUDENT QUESTION CONTEXT: "${questionText}"
       STUDENT MESSAGE: "${userMessage}"
       SUBJECT: ${subject}
       CONVERSATION: ${JSON.stringify(conversationHistory)}
       
       Guide the student without giving direct answers.`
    );

    // Log tutoring session for parent visibility
    await logTutoringSession(session.user.id, questionId, userMessage, tutoringResponse);

    return NextResponse.json({
      message: tutoringResponse,
      success: true
    });

  } catch (error) {
    console.error('Tutoring chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get tutoring response' },
      { status: 500 }
    );
  }
}


async function logTutoringSession(
  studentId: string, 
  questionId: string, 
  userMessage: string, 
  aiResponse: string
) {
  try {
    // Store tutoring sessions for parent review and analytics
    await prisma.auditLog.create({
      data: {
        userId: studentId,
        action: 'TUTORING_SESSION',
        entity: 'Question',
        entityId: questionId,
        metadata: {
          userMessage,
          aiResponse,
          timestamp: new Date().toISOString(),
          subject: 'tutoring'
        }
      }
    });
  } catch (error) {
    console.error('Failed to log tutoring session:', error);
    // Don't fail the request if logging fails
  }
}

// Simple tutoring response generation using existing OpenAI setup
async function generateTutoringResponseDirect(prompt: string): Promise<string> {
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI tutor who guides students to discover answers themselves. You never give direct answers, but use the Socratic method to help students think through problems step by step.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    return response.choices[0].message.content || "Let me help you think through this step by step. What's your first instinct about this question?";
  } catch (error) {
    console.error('Tutoring response generation error:', error);
    throw error;
  }
}