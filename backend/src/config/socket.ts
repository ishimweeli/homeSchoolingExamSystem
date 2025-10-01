import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db';

export class SocketService {
  private io: Server;
  private userSockets: Map<string, string> = new Map();

  constructor(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5001',
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true, role: true, email: true, name: true },
        });

        if (!user) {
          return next(new Error('User not found'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupHandlers() {
    this.io.on('connection', (socket) => {
      const user = socket.data.user;
      console.log(`User ${user.name} connected`);

      // Store user socket mapping
      this.userSockets.set(user.id, socket.id);

      // Join user-specific room
      socket.join(`user:${user.id}`);

      // Join role-based rooms
      socket.join(`role:${user.role}`);

      // Handle parent/teacher specific rooms
      this.setupUserRooms(socket, user);

      // Real-time exam monitoring
      socket.on('exam:start', async (data) => {
        const { examId, attemptId } = data;
        socket.join(`exam:${examId}`);
        socket.join(`attempt:${attemptId}`);

        // Notify teacher/parent
        const assignment = await prisma.examAssignment.findFirst({
          where: {
            exam: { id: examId },
            student: { id: user.id }
          },
          include: {
            assignedByUser: true,
          },
        });

        if (assignment) {
          this.io.to(`user:${assignment.assignedBy}`).emit('student:examStarted', {
            studentId: user.id,
            studentName: user.name,
            examId,
            attemptId,
            startedAt: new Date(),
          });
        }
      });

      // Exam progress updates
      socket.on('exam:progress', (data) => {
        const { examId, attemptId, questionIndex, totalQuestions } = data;

        // Broadcast to monitoring users
        socket.to(`exam:${examId}`).emit('student:examProgress', {
          studentId: user.id,
          studentName: user.name,
          progress: ((questionIndex + 1) / totalQuestions) * 100,
          currentQuestion: questionIndex + 1,
          totalQuestions,
        });
      });

      // Study module progress
      socket.on('study:progress', async (data) => {
        const { moduleId, lessonId, stepId, xpEarned, completed } = data;

        // Update progress in database
        if (completed) {
          await prisma.studyProgress.updateMany({
            where: {
              moduleId,
              studentId: user.id,
            },
            data: {
              totalXP: {
                increment: xpEarned,
              },
            },
          });
        }

        // Notify parent/teacher
        socket.to(`parent:${user.id}`).emit('child:studyProgress', {
          studentId: user.id,
          moduleId,
          lessonId,
          stepId,
          xpEarned,
          completed,
        });
      });

      // Achievement unlocked
      socket.on('achievement:unlock', (achievement) => {
        // Broadcast to all relevant users
        this.io.to(`user:${user.id}`).emit('achievement:unlocked', achievement);
        socket.to(`parent:${user.id}`).emit('child:achievement', {
          studentId: user.id,
          studentName: user.name,
          achievement,
        });
      });

      // Live collaboration for study groups
      socket.on('studyGroup:join', (groupId) => {
        socket.join(`group:${groupId}`);
        socket.to(`group:${groupId}`).emit('user:joined', {
          userId: user.id,
          userName: user.name,
        });
      });

      socket.on('studyGroup:message', (data) => {
        const { groupId, message } = data;
        socket.to(`group:${groupId}`).emit('group:message', {
          userId: user.id,
          userName: user.name,
          message,
          timestamp: new Date(),
        });
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        console.log(`User ${user.name} disconnected`);
        this.userSockets.delete(user.id);

        // Notify groups
        socket.rooms.forEach(room => {
          if (room.startsWith('group:')) {
            socket.to(room).emit('user:left', {
              userId: user.id,
              userName: user.name,
            });
          }
        });
      });
    });
  }

  private async setupUserRooms(socket: any, user: any) {
    if (user.role === 'PARENT') {
      // Join rooms for each child
      const children = await prisma.user.findMany({
        where: { parentId: user.id },
        select: { id: true },
      });

      children.forEach(child => {
        socket.join(`parent:${child.id}`);
      });
    } else if (user.role === 'TEACHER') {
      // Join rooms for each class
      const classes = await prisma.class.findMany({
        where: { teacherId: user.id },
        select: { id: true },
      });

      classes.forEach(cls => {
        socket.join(`class:${cls.id}`);
      });
    } else if (user.role === 'STUDENT') {
      // Get parent ID if exists
      const student = await prisma.user.findUnique({
        where: { id: user.id },
        select: { parentId: true },
      });

      if (student?.parentId) {
        socket.join(`child:${student.parentId}`);
      }
    }
  }

  // Helper methods for emitting events from other parts of the application
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public emitToRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, data);
  }

  public emitToClass(classId: string, event: string, data: any) {
    this.io.to(`class:${classId}`).emit(event, data);
  }

  public broadcastAchievement(userId: string, achievement: any) {
    this.emitToUser(userId, 'achievement:unlocked', achievement);
  }

  public notifyExamResults(studentId: string, examId: string, results: any) {
    this.emitToUser(studentId, 'exam:results', results);
    // Also notify parent
    this.io.to(`parent:${studentId}`).emit('child:examResults', {
      studentId,
      examId,
      results,
    });
  }
}

export default SocketService;