import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import examService from '../services/examService';
import type { Question, Exam, ExamGenerationParams } from '../services/examService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ExamCreator: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');

  const { control: manualControl, handleSubmit: handleManualSubmit, reset: resetManual } = useForm<Exam>();
  const { control: aiControl, handleSubmit: handleAISubmit, reset: resetAI } = useForm<ExamGenerationParams>();

  // Add question to manual exam
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        type: 'MULTIPLE_CHOICE',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        marks: 5,
        explanation: '',
      },
    ]);
  };

  // Remove question
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Update question
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  // Update question option
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    const options = [...(updated[questionIndex].options || [])];
    options[optionIndex] = value;
    updated[questionIndex].options = options;
    setQuestions(updated);
  };

  // Submit manual exam
  const onManualSubmit = async (data: Exam) => {
    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const exam = {
        ...data,
        questions,
      };

      await examService.createExam(exam);
      navigate('/exams');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  // Generate exam with AI
  const onAIGenerate = async (data: ExamGenerationParams) => {
    if (topics.length === 0) {
      setError('Please add at least one topic');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = {
        ...data,
        topics,
      };

      await examService.generateExam(params);
      navigate('/exams');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate exam');
    } finally {
      setLoading(false);
    }
  };

  // Add topic
  const addTopic = () => {
    if (currentTopic && !topics.includes(currentTopic)) {
      setTopics([...topics, currentTopic]);
      setCurrentTopic('');
    }
  };

  // Remove topic
  const removeTopic = (topic: string) => {
    setTopics(topics.filter(t => t !== topic));
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create Exam
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Card>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Manual Creation" />
            <Tab label="AI Generation" icon={<AIIcon />} />
          </Tabs>

          {/* Manual Creation Tab */}
          <TabPanel value={tab} index={0}>
            <form onSubmit={handleManualSubmit(onManualSubmit)}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Controller
                    name="title"
                    control={manualControl}
                    defaultValue=""
                    rules={{ required: true }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Exam Title"
                        fullWidth
                        required
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="subject"
                    control={manualControl}
                    defaultValue=""
                    rules={{ required: true }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Subject"
                        fullWidth
                        required
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="gradeLevel"
                    control={manualControl}
                    defaultValue={1}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Grade Level</InputLabel>
                        <Select {...field} label="Grade Level">
                          {[...Array(12)].map((_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                              Grade {i + 1}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="difficulty"
                    control={manualControl}
                    defaultValue="MEDIUM"
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Difficulty</InputLabel>
                        <Select {...field} label="Difficulty">
                          <MenuItem value="EASY">Easy</MenuItem>
                          <MenuItem value="MEDIUM">Medium</MenuItem>
                          <MenuItem value="HARD">Hard</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="duration"
                    control={manualControl}
                    defaultValue={30}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Duration (minutes)"
                        type="number"
                        fullWidth
                        required
                        InputProps={{ inputProps: { min: 5 } }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Questions
                  </Typography>

                  {questions.map((question, qIndex) => (
                    <Card key={qIndex} sx={{ p: 2, mb: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="subtitle1">
                              Question {qIndex + 1}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => removeQuestion(qIndex)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </Grid>

                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={question.type}
                              onChange={(e) => updateQuestion(qIndex, 'type', e.target.value)}
                              label="Type"
                            >
                              <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                              <MenuItem value="TRUE_FALSE">True/False</MenuItem>
                              <MenuItem value="SHORT_ANSWER">Short Answer</MenuItem>
                              <MenuItem value="LONG_ANSWER">Long Answer</MenuItem>
                              <MenuItem value="FILL_BLANKS">Fill in the Blanks</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12} md={9}>
                          <TextField
                            value={question.question}
                            onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                            label="Question"
                            fullWidth
                            required
                            size="small"
                          />
                        </Grid>

                        {question.type === 'MULTIPLE_CHOICE' && (
                          <>
                            <Grid item xs={12}>
                              <Typography variant="body2" gutterBottom>
                                Options
                              </Typography>
                              <RadioGroup
                                value={question.correctAnswer}
                                onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                              >
                                {question.options?.map((option, oIndex) => (
                                  <Box key={oIndex} display="flex" alignItems="center" mb={1}>
                                    <FormControlLabel
                                      value={option}
                                      control={<Radio size="small" />}
                                      label=""
                                    />
                                    <TextField
                                      value={option}
                                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                      placeholder={`Option ${oIndex + 1}`}
                                      size="small"
                                      fullWidth
                                    />
                                  </Box>
                                ))}
                              </RadioGroup>
                            </Grid>
                          </>
                        )}

                        {question.type === 'TRUE_FALSE' && (
                          <Grid item xs={12}>
                            <RadioGroup
                              row
                              value={question.correctAnswer}
                              onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                            >
                              <FormControlLabel value="true" control={<Radio />} label="True" />
                              <FormControlLabel value="false" control={<Radio />} label="False" />
                            </RadioGroup>
                          </Grid>
                        )}

                        {(question.type === 'SHORT_ANSWER' || question.type === 'LONG_ANSWER') && (
                          <Grid item xs={12}>
                            <TextField
                              value={question.correctAnswer}
                              onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                              label="Sample Answer"
                              fullWidth
                              multiline
                              rows={question.type === 'LONG_ANSWER' ? 4 : 2}
                              size="small"
                            />
                          </Grid>
                        )}

                        <Grid item xs={12} md={6}>
                          <TextField
                            value={question.marks}
                            onChange={(e) => updateQuestion(qIndex, 'marks', Number(e.target.value))}
                            label="Marks"
                            type="number"
                            fullWidth
                            size="small"
                            InputProps={{ inputProps: { min: 1 } }}
                          />
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <TextField
                            value={question.explanation}
                            onChange={(e) => updateQuestion(qIndex, 'explanation', e.target.value)}
                            label="Explanation (Optional)"
                            fullWidth
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Card>
                  ))}

                  <Button
                    startIcon={<AddIcon />}
                    onClick={addQuestion}
                    variant="outlined"
                  >
                    Add Question
                  </Button>
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : 'Create Exam'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>

          {/* AI Generation Tab */}
          <TabPanel value={tab} index={1}>
            <form onSubmit={handleAISubmit(onAIGenerate)}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    Use AI to automatically generate exam questions based on your specifications
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="subject"
                    control={aiControl}
                    defaultValue=""
                    rules={{ required: true }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Subject"
                        fullWidth
                        required
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Controller
                    name="gradeLevel"
                    control={aiControl}
                    defaultValue={1}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Grade Level</InputLabel>
                        <Select {...field} label="Grade Level">
                          {[...Array(12)].map((_, i) => (
                            <MenuItem key={i + 1} value={i + 1}>
                              Grade {i + 1}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Topics
                  </Typography>
                  <Box display="flex" gap={1} mb={2}>
                    <TextField
                      value={currentTopic}
                      onChange={(e) => setCurrentTopic(e.target.value)}
                      label="Add Topic"
                      size="small"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                    />
                    <Button onClick={addTopic} variant="outlined">
                      Add
                    </Button>
                  </Box>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {topics.map((topic) => (
                      <Chip
                        key={topic}
                        label={topic}
                        onDelete={() => removeTopic(topic)}
                      />
                    ))}
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="questionCount"
                    control={aiControl}
                    defaultValue={10}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Number of Questions"
                        type="number"
                        fullWidth
                        required
                        InputProps={{ inputProps: { min: 1, max: 50 } }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} md={4}>
                  <Controller
                    name="difficulty"
                    control={aiControl}
                    defaultValue="MEDIUM"
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Difficulty</InputLabel>
                        <Select {...field} label="Difficulty">
                          <MenuItem value="EASY">Easy</MenuItem>
                          <MenuItem value="MEDIUM">Medium</MenuItem>
                          <MenuItem value="HARD">Hard</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    fullWidth
                    startIcon={<AIIcon />}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Generate Exam with AI'}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </TabPanel>
        </Card>
      </Box>
    </Container>
  );
};