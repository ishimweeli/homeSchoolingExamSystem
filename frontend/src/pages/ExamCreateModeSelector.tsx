import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Button, Box, Grid } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsIcon from '@mui/icons-material/Settings';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export default function ExamCreateModeSelector() {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h3" gutterBottom align="center" sx={{ mb: 4 }}>
        Create New Exam
      </Typography>

      <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 6 }}>
        Choose how you want to create your exam
      </Typography>

      <Grid container spacing={4}>
        {/* Simple Mode */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/exams/create/simple')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <AutoAwesomeIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />

              <Typography variant="h5" gutterBottom>
                Simple Mode
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                AI generates everything automatically. Just specify question types and counts.
              </Typography>

              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  ✓ Quick and easy<br />
                  ✓ AI-powered generation<br />
                  ✓ Flat question structure<br />
                  ✓ Perfect for quizzes
                </Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
              >
                Start Simple Mode
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Mode */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: '2px solid',
              borderColor: 'primary.main',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/exams/create/advanced')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <SettingsIcon sx={{ fontSize: 80, color: 'secondary.main', mb: 2 }} />

              <Typography variant="h5" gutterBottom>
                Advanced Mode
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create exams with sections (A, B, C). AI generates content per section.
              </Typography>

              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  ✓ Multi-section structure<br />
                  ✓ Section-wise instructions<br />
                  ✓ Professional formatting<br />
                  ✓ Perfect for formal exams
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="secondary"
                fullWidth
                size="large"
              >
                Start Advanced Mode
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* PDF Upload */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: 6,
              },
            }}
            onClick={() => navigate('/exams/upload-pdf')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <UploadFileIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />

              <Typography variant="h5" gutterBottom>
                Upload PDF
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Upload an existing exam PDF and AI will recreate it digitally.
              </Typography>

              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  ✓ Upload any exam PDF<br />
                  ✓ AI extracts structure<br />
                  ✓ Preserves formatting<br />
                  ✓ Edit and customize
                </Typography>
              </Box>

              <Button
                variant="contained"
                color="success"
                fullWidth
                size="large"
              >
                Upload PDF
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          onClick={() => navigate('/exams')}
          variant="outlined"
        >
          ← Back to Exams
        </Button>
      </Box>
    </Box>
  );
}
