import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const posts = await prisma.communityPost.findMany({
      where: {
        isPublished: true
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching community posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community posts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, type, category, tags } = body;

    // Validate required fields
    if (!title || !content || !type) {
      return NextResponse.json({ 
        error: 'Title, content, and type are required' 
      }, { status: 400 });
    }

    // Validate post type
    const validTypes = ['QUESTION', 'DISCUSSION', 'RESOURCE', 'SUCCESS_STORY', 'TIP', 'ANNOUNCEMENT'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid post type' }, { status: 400 });
    }

    // Only admins and teachers can create announcements
    if (type === 'ANNOUNCEMENT' && !['ADMIN', 'TEACHER'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Only admins and teachers can create announcements' 
      }, { status: 403 });
    }

    const post = await prisma.communityPost.create({
      data: {
        title,
        content,
        type,
        category: category || null,
        tags: tags || [],
        authorId: session.user.id,
        isPinned: type === 'ANNOUNCEMENT'
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        _count: {
          select: {
            likes: true,
            replies: true
          }
        }
      }
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error('Error creating community post:', error);
    return NextResponse.json(
      { error: 'Failed to create community post' },
      { status: 500 }
    );
  }
}