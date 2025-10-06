import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Box,
  Button,
  TextField,
  Typography,
  Card,
  CardContent,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface QuestionConfig {
  type: string;
  count: number;
  marks: number;
  includeContext?: boolean;
  topic?: string;
  difficulty?: string;
}

interface SectionConfig {
  code: string;
  title: string;
  description?: string;
  instructions?: string;
  totalMarks: number;
  questions: QuestionConfig[];
}

export default function ExamCreateAdvanced() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Exam basic info
  const [examInfo, setExamInfo] = useState({
    title: '',
    subject: '',
    gradeLevel: 5,
    duration: 60,
  });

  // Sections
  const [sections, setSections] = useState<SectionConfig[]>([
    {
      code: 'A',
      title: '',
      instructions: '',
      totalMarks: 0,
      questions: [],
    },
  ]);

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExamInfo({
      ...examInfo,
      [name]: name === 'gradeLevel' || name === 'duration' ? parseInt(value) : value,
    });
  };

  const addSection = () => {
    const nextCode = String.fromCharCode(65 + sections.length); // A, B, C, D...
    setSections([
      ...sections,
      {
        code: nextCode,
        title: '',
        instructions: '',
        totalMarks: 0,
        questions: [],
      },
    ]);
  };

  const updateSection = (index: number, field: string, value: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const deleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const addQuestionType = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].questions.push({
      type: 'MULTIPLE_CHOICE',
      count: 5,
      marks: 1,
      difficulty: 'MEDIUM',
    });
    setSections(updated);
  };

  const updateQuestionType = (
    sectionIndex: number,
    questionIndex: number,
    field: string,
    value: any
  ) => {
    const updated = [...sections];
    updated[sectionIndex].questions[questionIndex] = {
      ...updated[sectionIndex].questions[questionIndex],
      [field]: value,
    };

    // Recalculate section marks
    const totalMarks = updated[sectionIndex].questions.reduce(
      (sum, q) => sum + q.count * q.marks,
      0
    );
    updated[sectionIndex].totalMarks = totalMarks;

    setSections(updated);
  };

  const deleteQuestionType = (sectionIndex: number, questionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].questions = updated[sectionIndex].questions.filter(
      (_, i) => i !== questionIndex
    );

    // Recalculate marks
    const totalMarks = updated[sectionIndex].questions.reduce(
      (sum, q) => sum + q.count * q.marks,
      0
    );
    updated[sectionIndex].totalMarks = totalMarks;

    setSections(updated);
  };

  const getTotalMarks = () => {
    return sections.reduce((sum, s) => sum + s.totalMarks, 0);
  };

  const generateExam = async () => {
    if (!examInfo.title || !examInfo.subject) {
      setError('Please fill in exam title and subject');
      return;
    }

    if (sections.length === 0) {
      setError('Please add at least one section');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...examInfo,
        sections,
      };

      const response = await api.post('/exams/generate-advanced', payload);

      if (response.success) {
        setSuccess('Advanced exam generated successfully!');
        setTimeout(() => navigate(`/exams/${response.data.id}`), 2000);
      } else {
        setError(response.message || 'Failed to generate exam');
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err?.response?.data?.message || 'Failed to generate exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Create Advanced Exam
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Build a professional exam with sections. AI generates questions for each section.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Exam Info */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Exam Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Exam Title *"
                name="title"
                value={examInfo.title}
                onChange={handleInfoChange}
                placeholder="e.g., ENGLISH PE - National Examination"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Subject *"
                name="subject"
                value={examInfo.subject}
                onChange={handleInfoChange}
                placeholder="e.g., English, Mathematics"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Grade Level</InputLabel>
                <Select
                  name="gradeLevel"
                  value={examInfo.gradeLevel}
                  onChange={(e) =>
                    setExamInfo({ ...examInfo, gradeLevel: Number(e.target.value) })
                  }
                >
                  {[...Array(12)].map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      Grade {i + 1}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Duration (minutes)"
                name="duration"
                value={examInfo.duration}
                onChange={handleInfoChange}
                inputProps={{ min: 15, max: 300 }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sections */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Exam Sections
            <Chip
              label={`Total: ${getTotalMarks()} marks`}
              color="primary"
              sx={{ ml: 2 }}
            />
          </Typography>

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addSection}
          >
            Add Section
          </Button>
        </Box>

        {sections.map((section, sIndex) => (
          <Accordion key={sIndex} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6">
                  Section {section.code}
                </Typography>
                <Chip label={`${section.totalMarks} marks`} size="small" />
                {section.title && (
                  <Typography variant="body2" color="text.secondary">
                    {section.title}
                  </Typography>
                )}
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Section Title *"
                    value={section.title}
                    onChange={(e) => updateSection(sIndex, 'title', e.target.value)}
                    placeholder="e.g., READING COMPREHENSION, VOCABULARY"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Section Instructions"
                    value={section.instructions}
                    onChange={(e) => updateSection(sIndex, 'instructions', e.target.value)}
                    placeholder="Instructions for this section..."
                  />
                </Grid>

                {/* Question Types */}
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                    <Typography variant="subtitle1">Question Types</Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => addQuestionType(sIndex)}
                    >
                      Add Question Type
                    </Button>
                  </Box>

                  {section.questions.map((q, qIndex) => (
                    <Card key={qIndex} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Question Type</InputLabel>
                            <Select
                              value={q.type}
                              onChange={(e) =>
                                updateQuestionType(sIndex, qIndex, 'type', e.target.value)
                              }
                            >
                              <MenuItem value="MULTIPLE_CHOICE">Multiple Choice</MenuItem>
                              <MenuItem value="TRUE_FALSE">True/False</MenuItem>
                              <MenuItem value="SHORT_ANSWER">Short Answer</MenuItem>
                              <MenuItem value="FILL_BLANKS">Fill in the Blanks</MenuItem>
                              <MenuItem value="MATCHING">Matching</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={6} md={2}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Count"
                            size="small"
                            value={q.count}
                            onChange={(e) =>
                              updateQuestionType(sIndex, qIndex, 'count', parseInt(e.target.value))
                            }
                            inputProps={{ min: 1, max: 50 }}
                          />
                        </Grid>

                        <Grid item xs={6} md={2}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Marks Each"
                            size="small"
                            value={q.marks}
                            onChange={(e) =>
                              updateQuestionType(sIndex, qIndex, 'marks', parseInt(e.target.value))
                            }
                            inputProps={{ min: 1, max: 20 }}
                          />
                        </Grid>

                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Difficulty</InputLabel>
                            <Select
                              value={q.difficulty}
                              onChange={(e) =>
                                updateQuestionType(sIndex, qIndex, 'difficulty', e.target.value)
                              }
                            >
                              <MenuItem value="EASY">Easy</MenuItem>
                              <MenuItem value="MEDIUM">Medium</MenuItem>
                              <MenuItem value="HARD">Hard</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12} md={1}>
                          <IconButton
                            color="error"
                            onClick={() => deleteQuestionType(sIndex, qIndex)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Specific Topic (optional)"
                            value={q.topic || ''}
                            onChange={(e) =>
                              updateQuestionType(sIndex, qIndex, 'topic', e.target.value)
                            }
                            placeholder="e.g., Passive voice, Fractions"
                          />
                        </Grid>
                      </Grid>
                    </Card>
                  ))}

                  {section.questions.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                      No question types added. Click "Add Question Type" to start.
                    </Typography>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Button
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => deleteSection(sIndex)}
                  >
                    Delete Section
                  </Button>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => navigate('/exams/create')}
        >
          ← Back
        </Button>

        <Button
          variant="contained"
          size="large"
          startIcon={<AutoAwesomeIcon />}
          onClick={generateExam}
          disabled={loading || sections.length === 0}
        >
          {loading ? 'Generating...' : '✨ Generate Exam with AI'}
        </Button>
      </Box>
    </Box>
  );
}
