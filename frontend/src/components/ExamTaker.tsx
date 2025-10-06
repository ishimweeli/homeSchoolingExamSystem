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
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Timer as TimerIcon,
  CheckCircle as CheckIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Send as SubmitIcon,
  DragIndicator as DragIcon,
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
    options?: any;
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
                  <Box>
                    {/* Check if question has blank markers */}
                    {(currentQ.question.includes('____') || currentQ.question.includes('___')) ? (
                      <Box>
                        {/* Split question by blanks and insert input fields */}
                        {currentQ.question.split(/____+|___+/).map((part, index, arr) => (
                          <React.Fragment key={index}>
                            <Typography component="span" variant="body1">
                              {part}
                            </Typography>
                            {index < arr.length - 1 && (
                              <TextField
                                value={answers[currentQ.id] || ''}
                                onChange={(e) => handleAnswer(e.target.value)}
                                variant="standard"
                                sx={{
                                  mx: 1,
                                  minWidth: 150,
                                  display: 'inline-flex',
                                  '& .MuiInputBase-root': {
                                    fontSize: 'inherit',
                                  }
                                }}
                                placeholder="your answer"
                                autoFocus={index === 0}
                              />
                            )}
                          </React.Fragment>
                        ))}
                      </Box>
                    ) : (
                      // Fallback: regular text field if no blanks found
                      <TextField
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleAnswer(e.target.value)}
                        fullWidth
                        placeholder="Enter your answer..."
                      />
                    )}
                  </Box>
                )}

                {/* MATCHING Question Type */}
                {currentQ.type === 'MATCHING' && currentQ.options && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Match the items by entering pairs (e.g., "1-A, 2-B, 3-C")
                    </Typography>
                    {Array.isArray(currentQ.options) && currentQ.options.length > 0 && 
                     typeof currentQ.options[0] === 'object' && 'active' in currentQ.options[0] ? (
                      // Display active-passive pairs
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          Items to Match:
                        </Typography>
                        {currentQ.options.map((pair: any, index: number) => (
                          <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="body2">
                              <strong>{index + 1}.</strong> {pair.active} → {pair.passive}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      // Display as key-value object
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          Items to Match:
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(currentQ.options, null, 2)}
                          </pre>
                        </Box>
                      </Box>
                    )}
                    <TextField
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleAnswer(e.target.value)}
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Enter your matches (e.g., 1-A, 2-B, 3-C)"
                    />
                  </Box>
                )}

                {/* ORDERING Question Type */}
                {currentQ.type === 'ORDERING' && currentQ.options && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Arrange the items in the correct order (1, 2, 3, ...)
                    </Typography>
                    {Array.isArray(currentQ.options) && (
                      <List sx={{ bgcolor: 'background.default', borderRadius: 1 }}>
                        {currentQ.options.map((item: string, index: number) => (
                          <ListItem key={index} divider>
                            <ListItemIcon>
                              <DragIcon />
                            </ListItemIcon>
                            <ListItemText 
                              primary={`${String.fromCharCode(65 + index)}. ${item}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                    <TextField
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => handleAnswer(e.target.value)}
                      fullWidth
                      sx={{ mt: 2 }}
                      placeholder="Enter the correct order (e.g., A, C, B, D)"
                      helperText="Enter letters separated by commas in the correct order"
                    />
                  </Box>
                )}

                {/* SELECT_ALL Question Type */}
                {currentQ.type === 'SELECT_ALL' && currentQ.options && Array.isArray(currentQ.options) && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Select all correct answers:
                    </Typography>
                    {currentQ.options.map((option: string, index: number) => {
                      const currentAnswers = answers[currentQ.id] 
                        ? (answers[currentQ.id] as string).split(',').map(a => a.trim())
                        : [];
                      const isChecked = currentAnswers.includes(option);
                      
                      return (
                        <FormControlLabel
                          key={index}
                          control={
                            <Checkbox
                              checked={isChecked}
                              onChange={(e) => {
                                const newAnswers = e.target.checked
                                  ? [...currentAnswers, option]
                                  : currentAnswers.filter(a => a !== option);
                                handleAnswer(newAnswers.join(', '));
                              }}
                            />
                          }
                          label={option}
                        />
                      );
                    })}
                  </Box>
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
                      endIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SubmitIcon />}
                      onClick={handleSubmitClick}
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Exam'}
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