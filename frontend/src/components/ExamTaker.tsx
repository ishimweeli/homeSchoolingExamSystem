import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Send as SubmitIcon,
} from '@mui/icons-material';
import examService from '../services/examService';

interface ExamData {
  id: string;
  title: string;
  subject: string;
  duration: number;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    options?: string[];
    marks: number;
    order: number;
  }>;
  attemptId: string;
  totalMarks: number;
}

export const ExamTaker: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  // Load exam
  useEffect(() => {
    if (id) {
      loadExam();
    }
  }, [id]);

  // Timer
  useEffect(() => {
    if (examStarted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [examStarted, timeRemaining]);

  const loadExam = async () => {
    try {
      setLoading(true);
      const response = await examService.startExamAttempt(id!);
      setExam(response);
      setTimeRemaining(response.duration * 60); // Convert to seconds
      setExamStarted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (exam) {
      const questionId = exam.questions[currentQuestion].id;
      setAnswers({ ...answers, [questionId]: answer });
    }
  };

  const handleNext = () => {
    if (exam && currentQuestion < exam.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleQuestionJump = (index: number) => {
    setCurrentQuestion(index);
  };

  const handleSubmitClick = () => {
    setShowSubmitDialog(true);
  };

  const handleAutoSubmit = async () => {
    await submitExam();
  };

  const submitExam = async () => {
    if (!exam) return;

    setSubmitting(true);
    setShowSubmitDialog(false);

    try {
      const result = await examService.submitExam(id!, {
        attemptId: exam.attemptId,
        answers,
      });

      // Navigate to results page
      navigate(`/exams/results/${exam.attemptId}`, {
        state: { result: result.data },
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit exam');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = (): number => {
    if (!exam) return 0;
    return exam.questions.filter((q) => answers[q.id]).length;
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

  if (error && !exam) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!exam) return null;

  const currentQ = exam.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / exam.questions.length) * 100;

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 2 }}>
        {/* Header */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">{exam.title}</Typography>
            <Box display="flex" gap={2} alignItems="center">
              <Chip
                icon={<TimerIcon />}
                label={formatTime(timeRemaining)}
                color={timeRemaining < 300 ? 'error' : 'primary'}
              />
              <Chip
                label={`${getAnsweredCount()}/${exam.questions.length} Answered`}
                color="success"
              />
              <Typography variant="body2">
                Total Marks: {exam.totalMarks}
              </Typography>
            </Box>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
        </Paper>

        {/* Main Content */}
        <Grid container spacing={2}>
          {/* Question Navigation */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Questions
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {exam.questions.map((q, index) => (
                    <Button
                      key={q.id}
                      variant={currentQuestion === index ? 'contained' : 'outlined'}
                      color={answers[q.id] ? 'success' : 'inherit'}
                      size="small"
                      onClick={() => handleQuestionJump(index)}
                      sx={{ minWidth: 40 }}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Question Display */}
          <Grid item xs={12} md={9}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">
                    Question {currentQuestion + 1} of {exam.questions.length}
                  </Typography>
                  <Chip label={`${currentQ.marks} marks`} size="small" />
                </Box>

                <Typography variant="body1" paragraph>
                  {currentQ.question}
                </Typography>

                <Divider sx={{ my: 2 }} />

                {/* Answer Input */}
                {currentQ.type === 'MULTIPLE_CHOICE' && currentQ.options && (
                  <RadioGroup
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                  >
                    {currentQ.options.map((option, index) => (
                      <FormControlLabel
                        key={index}
                        value={option}
                        control={<Radio />}
                        label={option}
                      />
                    ))}
                  </RadioGroup>
                )}

                {currentQ.type === 'TRUE_FALSE' && (
                  <RadioGroup
                    row
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                  >
                    <FormControlLabel value="true" control={<Radio />} label="True" />
                    <FormControlLabel value="false" control={<Radio />} label="False" />
                  </RadioGroup>
                )}

                {currentQ.type === 'SHORT_ANSWER' && (
                  <TextField
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Enter your answer..."
                  />
                )}

                {currentQ.type === 'LONG_ANSWER' && (
                  <TextField
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    fullWidth
                    multiline
                    rows={6}
                    placeholder="Enter your detailed answer..."
                  />
                )}

                {currentQ.type === 'FILL_BLANKS' && (
                  <TextField
                    value={answers[currentQ.id] || ''}
                    onChange={(e) => handleAnswer(e.target.value)}
                    fullWidth
                    placeholder="Enter your answer..."
                  />
                )}

                {/* Navigation Buttons */}
                <Box display="flex" justifyContent="space-between" mt={4}>
                  <Button
                    startIcon={<PrevIcon />}
                    onClick={handlePrev}
                    disabled={currentQuestion === 0}
                  >
                    Previous
                  </Button>

                  {currentQuestion === exam.questions.length - 1 ? (
                    <Button
                      variant="contained"
                      color="success"
                      endIcon={<SubmitIcon />}
                      onClick={handleSubmitClick}
                      disabled={submitting}
                    >
                      Submit Exam
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      endIcon={<NextIcon />}
                      onClick={handleNext}
                    >
                      Next
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Submit Confirmation Dialog */}
        <Dialog open={showSubmitDialog} onClose={() => setShowSubmitDialog(false)}>
          <DialogTitle>Submit Exam?</DialogTitle>
          <DialogContent>
            <Typography>
              You have answered {getAnsweredCount()} out of {exam.questions.length} questions.
            </Typography>
            {getAnsweredCount() < exam.questions.length && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You have {exam.questions.length - getAnsweredCount()} unanswered questions.
                Are you sure you want to submit?
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSubmitDialog(false)}>
              Review Answers
            </Button>
            <Button
              onClick={submitExam}
              variant="contained"
              color="primary"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : 'Submit Exam'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

// Add Grid import to the imports
import Grid from '@mui/material/Grid';