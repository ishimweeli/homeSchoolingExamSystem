import api from './api';

export type Question = {
  id?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'FILL_BLANKS';
  question: string;
  options?: string[];
  correctAnswer: string;
  marks: number;
  explanation?: string;
  order?: number;
}

export type Exam = {
  id?: string;
  title: string;
  subject: string;
  gradeLevel: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  duration: number;
  totalMarks?: number;
  questions: Question[];
  createdAt?: string;
  isAIGenerated?: boolean;
}

export type ExamGenerationParams = {
  subject: string;
  gradeLevel: number;
  topics: string[];
  questionCount: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionTypes?: string[];
}

export type ExamAssignment = {
  examId: string;
  studentIds: string[];
  dueDate?: string;
  maxAttempts?: number;
}

export type ExamAttempt = {
  attemptId: string;
  answers: Record<string, string>;
}

class ExamService {
  // Create exam manually
  async createExam(exam: Exam) {
    const response = await api.post<{ success: boolean; data: Exam }>('/exams', exam);
    return response.data;
  }

  // Generate exam with AI
  async generateExam(params: ExamGenerationParams) {
    const response = await api.post<{ success: boolean; data: Exam }>('/exams/generate', params);
    return response.data;
  }

  // Get all exams
  async getExams(params?: { page?: number; limit?: number; subject?: string; gradeLevel?: number }) {
    const response = await api.get<{
      success: boolean;
      data: Exam[];
      pagination: { page: number; limit: number; total: number; pages: number }
    }>('/exams', params);
    return response;
  }

  // Get single exam
  async getExam(id: string) {
    const response = await api.get<{ success: boolean; data: Exam }>(`/exams/${id}`);
    return response.data;
  }

  // Assign exam to students
  async assignExam(assignment: ExamAssignment) {
    const response = await api.post<{ success: boolean; message: string }>(
      `/exams/${assignment.examId}/assign`,
      {
        studentIds: assignment.studentIds,
        dueDate: assignment.dueDate,
        maxAttempts: assignment.maxAttempts,
      }
    );
    return response;
  }

  // Start exam attempt
  async startExamAttempt(examId: string) {
    const response = await api.post<{ success: boolean; data: any }>(`/exams/${examId}/attempt`);
    return response.data;
  }

  // Submit exam
  async submitExam(examId: string, attempt: ExamAttempt) {
    const response = await api.post<{
      success: boolean;
      data: {
        totalMarks: number;
        obtainedMarks: number;
        percentage: string;
        grade: string;
        passed: boolean;
      }
    }>(`/exams/${examId}/submit`, attempt);
    return response.data;
  }

  // Get exam results
  async getExamResults(attemptId: string) {
    const response = await api.get<{ success: boolean; data: any }>(`/exams/results/${attemptId}`);
    return response.data;
  }
}

export const examService = new ExamService();
export default examService;