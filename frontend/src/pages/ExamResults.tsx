import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Stack,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Cancel as WrongIcon,
  ArrowBack as BackIcon,
  Assessment as ResultsIcon,
} from '@mui/icons-material';
import examService from '../services/examService';

interface Grade {
  aiAnalysis?: string;
  attempt: string;
  grade: string;
  gradedAt: string;
  id: string;
  isPublished: boolean;
  overallFeedback?: string;
  percentage: number;
  publishedAt?: string;
  publishedBy?: string;
  status: string;
  studentId: string;
  totalScore: number;
}

interface ExamResult {
  id: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: Grade;
  passed: boolean;
  timeSpent: number;
  submittedAt: string;
  aiFeedback?: string;
  exam: {
    id: string;
    title: string;
    subject: string;
    passingMarks: number;
  };
  answers: Array<{
    questionId: string;
    question: {
      question: string;
      type: string;
      marks: number;
      correctAnswer: any;
    };
    answer: any;
    finalScore: number;
    aiFeedback?: string;
  }>;
}

export default function ExamResults() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [result, setResult] = useState<ExamResult | null>(
    location.state?.result || null
  );
  const [loading, setLoading] = useState(!location.state?.result);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!result && id) {
      loadResults();
    }
  }, [id]);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await examService.getExamResults(id!);
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!result) return null;

  const correctAnswers = result.answers.filter(
    (a) => a.finalScore === a.question.marks
  ).length;
  const totalQuestions = result.answers.length;

  // Calculate actual score from answers if not provided
  const actualScore = result.score || result.answers.reduce((sum, a) => sum + (a.finalScore || 0), 0);
  const actualPercentage = result.grade.percentage || (result.totalMarks > 0 ? (actualScore / result.totalMarks) * 100 : 0);
  console.log('result:', result);
  console.log('Actual Percentage:', actualPercentage);
  console.log('Result Percentage:', result.percentage);
  console.log('Actual Score:', actualScore);
  console.log('Result Score:', result.totalMarks);
  const actualGrade = typeof result.grade === 'string' ? result.grade : (result.grade as any)?.grade ||
    (actualPercentage >= 90 ? 'A+' :
      actualPercentage >= 80 ? 'A' :
        actualPercentage >= 70 ? 'B' :
          actualPercentage >= 60 ? 'C' :
            actualPercentage >= 50 ? 'D' : 'F');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, mb: 3, bgcolor: actualPercentage >= (result.exam?.passingMarks || 50) ? 'success.light' : 'error.light' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              {actualPercentage >= (result.exam?.passingMarks || 50) ? '🎉 Congratulations!' : '📚 Keep Learning!'}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {result.exam.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {result.exam.subject} • Submitted {new Date(result.submittedAt).toLocaleString()}
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h2" fontWeight="bold">
              {actualPercentage.toFixed(1)}%
            </Typography>
            <Chip
              label={actualPercentage >= (result.exam?.passingMarks || 50) ? 'PASSED' : 'FAILED'}
              color={actualPercentage >= (result.exam?.passingMarks || 50) ? 'success' : 'error'}
            />
          </Box>
        </Box>
      </Paper>

      {/* Score Summary */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 3 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Score
            </Typography>
            <Typography variant="h4">
              {actualScore}/{result.totalMarks}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Correct Answers
            </Typography>
            <Typography variant="h4">
              {correctAnswers}/{totalQuestions}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Grade
            </Typography>
            <Typography variant="h4">
              {actualGrade}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Time Spent
            </Typography>
            <Typography variant="h4">
              {Math.floor(result.timeSpent / 60)}m {result.timeSpent % 60}s
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* AI Feedback */}
      {result.aiFeedback && (
        <Alert severity="info" icon={<ResultsIcon />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            AI Feedback
          </Typography>
          <Typography variant="body2">{result.aiFeedback}</Typography>
        </Alert>
      )}

      {/* Question-by-Question Results */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detailed Results
          </Typography>
          <Divider sx={{ mb: 2 }} />

          {result.answers.map((answer, index) => {
            const isCorrect = answer.finalScore === answer.question.marks;
            const correctAnswer = typeof answer.question.correctAnswer === 'string'
              ? answer.question.correctAnswer.replace(/^"|"$/g, '')
              : JSON.stringify(answer.question.correctAnswer);
            const studentAnswer = typeof answer.answer === 'string'
              ? answer.answer
              : JSON.stringify(answer.answer);

            return (
              <Box
                key={answer.questionId}
                sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}
              >
                <Box display="flex" alignItems="start" gap={1}>
                  {isCorrect ? <CheckIcon color="success" /> : <WrongIcon color="error" />}

                  <Box flexGrow={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Question {index + 1}
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {answer.question.question}
                    </Typography>

                    {/* Parse correctAnswer safely */}
                    {(() => {
                      let parsedCorrectAnswer;
                      try {
                        parsedCorrectAnswer = JSON.parse(answer.question.correctAnswer);
                      } catch {
                        parsedCorrectAnswer = answer.question.correctAnswer;
                      }

                      return (
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                          {/* Student Answer */}
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Your Answer:
                            </Typography>
                            <Typography
                              variant="body1"
                              color={isCorrect ? 'success.main' : 'error.main'}
                              fontWeight="medium"
                            >
                              {studentAnswer || '(No answer provided)'}
                            </Typography>
                          </Box>

                          {/* Correct Answer (only show if wrong) */}
                          {!isCorrect && (
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                Correct Answer:
                              </Typography>

                              {Array.isArray(parsedCorrectAnswer) ? (
                                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                  {parsedCorrectAnswer.map((ans, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>
                                      <Typography
                                        variant="body1"
                                        color="success.main"
                                        fontWeight="medium"
                                      >
                                        {ans}
                                      </Typography>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <Typography
                                  variant="body1"
                                  color="success.main"
                                  fontWeight="medium"
                                >
                                  {parsedCorrectAnswer}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Stack>
                      );
                    })()}

                    {/* Question Type & Score */}
                    <Box display="flex" justifyContent="space-between" mt={1}>
                      <Chip label={answer.question.type} size="small" variant="outlined" />
                      <Typography variant="body2" color="text.secondary">
                        {answer.finalScore}/{answer.question.marks} marks
                      </Typography>
                    </Box>

                    {/* AI Feedback */}
                    {answer.aiFeedback && (
                      <Alert
                        severity={
                          isCorrect
                            ? 'success'
                            : answer.finalScore > 0
                              ? 'warning'
                              : 'error'
                        }
                        sx={{ mt: 2 }}
                      >
                        <Typography variant="body2" fontWeight="medium" gutterBottom>
                          💬 Feedback:
                        </Typography>
                        <Typography variant="body2">{answer.aiFeedback}</Typography>
                      </Alert>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <Box display="flex" justifyContent="center" gap={2} mt={4}>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
        {!result.passed && (
          <Button
            variant="contained"
            onClick={() => navigate(`/exams/take/${result.exam.id}`)}
          >
            Retake Exam
          </Button>
        )}
      </Box>
    </Container >
  );
}

