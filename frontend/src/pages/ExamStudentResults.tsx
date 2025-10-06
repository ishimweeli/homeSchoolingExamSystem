import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Stack,
  Avatar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { toast } from 'sonner';

interface StudentResult {
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignedAt: string;
  maxAttempts: number;
  attemptsUsed: number;
  totalAttempts: number;
  status: 'COMPLETED' | 'NOT_STARTED';
  bestScore: number;
  bestPercentage: number;
  bestGrade: string;
  passed: boolean;
  lastAttemptDate: string | null;
  attempts: Array<{
    id: string;
    score: number;
    percentage: number;
    grade: string;
    submittedAt: string;
    timeSpent: number;
  }>;
}

interface ExamInfo {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  totalMarks: number;
  passingMarks: number;
  duration: number;
  questionCount: number;
}

interface Statistics {
  totalAssigned: number;
  studentsCompleted: number;
  completionRate: number;
  averageScore: number;
  passRate: number;
  highestScore: number;
  lowestScore: number;
  totalAttempts: number;
}

interface ExamStudentResultsData {
  exam: ExamInfo;
  statistics: Statistics;
  studentResults: StudentResult[];
}

export default function ExamStudentResults() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ExamStudentResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/exams/${examId}/student-results`);
      setData((response as any).data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load student results';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudentResult = (attemptId: string) => {
    navigate(`/exams/results/${attemptId}`);
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Failed to load data'}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/exams')}>
          Back to Exams
        </Button>
      </Container>
    );
  }

  const { exam, statistics, studentResults } = data;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/exams')}
          sx={{ mb: 2 }}
        >
          Back to Exams
        </Button>
        <Paper elevation={3} sx={{ p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AssessmentIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {exam.title}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                {exam.subject} • Grade {exam.gradeLevel} • {exam.questionCount} Questions • {exam.duration} mins
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                Total Marks: {exam.totalMarks} • Passing Marks: {exam.passingMarks}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Assigned Students
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.totalAssigned}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <AssessmentIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.completionRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {statistics.studentsCompleted}/{statistics.totalAssigned} completed
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: statistics.completionRate >= 70 ? 'success.main' : 'warning.main', width: 56, height: 56 }}>
                  {statistics.completionRate >= 70 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Average Score
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.averageScore.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    H: {statistics.highestScore.toFixed(1)}% | L: {statistics.lowestScore.toFixed(1)}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56 }}>
                  <TrendingUpIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pass Rate
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color={statistics.passRate >= 70 ? 'success.main' : 'error.main'}>
                    {statistics.passRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {statistics.totalAttempts} total attempts
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: statistics.passRate >= 70 ? 'success.main' : 'error.main', width: 56, height: 56 }}>
                  <TrophyIcon />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Student Results Table */}
      <Paper elevation={3}>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight="bold">
            Student Results ({studentResults.length})
          </Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell><strong>Student</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
                <TableCell align="center"><strong>Attempts</strong></TableCell>
                <TableCell align="center"><strong>Best Score</strong></TableCell>
                <TableCell align="center"><strong>Percentage</strong></TableCell>
                <TableCell align="center"><strong>Grade</strong></TableCell>
                <TableCell align="center"><strong>Result</strong></TableCell>
                <TableCell align="center"><strong>Last Attempt</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      No students assigned to this exam yet
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                studentResults.map((student, index) => (
                  <TableRow
                    key={student.studentId}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      bgcolor: index === 0 && student.status === 'COMPLETED' ? 'success.50' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                          {student.studentName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {student.studentName}
                            {index === 0 && student.status === 'COMPLETED' && (
                              <TrophyIcon sx={{ fontSize: 16, ml: 0.5, color: 'warning.main', verticalAlign: 'middle' }} />
                            )}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.studentEmail}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={student.status === 'COMPLETED' ? <CheckIcon /> : <PendingIcon />}
                        label={student.status === 'COMPLETED' ? 'Completed' : 'Not Started'}
                        color={student.status === 'COMPLETED' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {student.attemptsUsed} / {student.maxAttempts}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="medium">
                        {student.status === 'COMPLETED' ? student.bestScore : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        color={
                          student.status !== 'COMPLETED' ? 'text.secondary' :
                          student.bestPercentage >= exam.passingMarks ? 'success.main' : 'error.main'
                        }
                      >
                        {student.status === 'COMPLETED' ? `${student.bestPercentage.toFixed(1)}%` : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {student.status === 'COMPLETED' ? (
                        <Chip
                          label={student.bestGrade}
                          color={student.bestGrade.startsWith('A') ? 'success' : student.bestGrade.startsWith('F') ? 'error' : 'default'}
                          size="small"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {student.status === 'COMPLETED' ? (
                        <Chip
                          icon={student.passed ? <CheckIcon /> : <CancelIcon />}
                          label={student.passed ? 'PASSED' : 'FAILED'}
                          color={student.passed ? 'success' : 'error'}
                          size="small"
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption" color="text.secondary">
                        {student.lastAttemptDate
                          ? new Date(student.lastAttemptDate).toLocaleDateString()
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {student.status === 'COMPLETED' && student.attempts.length > 0 && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleViewStudentResult(student.attempts[0].id)}
                        >
                          View Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Summary Footer */}
      {studentResults.length > 0 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing results for {studentResults.length} student{studentResults.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}
    </Container>
  );
}

