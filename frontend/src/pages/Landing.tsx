import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Stack, 
  Paper, 
  Grid,
  Card,
  CardContent 
} from '@mui/material'
import { 
  School, 
  Psychology, 
  Analytics, 
  Groups,
  AutoAwesome,
  Speed,
  Security,
  CheckCircle
} from '@mui/icons-material'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: <Psychology />,
    title: 'AI-Powered Exam Generation',
    description: 'Automatically generate exams based on subject, grade level, and learning objectives using advanced AI.'
  },
  {
    icon: <AutoAwesome />,
    title: 'Intelligent Grading',
    description: 'AI grades all question types including essays with detailed feedback and suggestions.'
  },
  {
    icon: <Analytics />,
    title: 'Real-time Analytics',
    description: 'Track student progress, identify learning gaps, and monitor performance trends.'
  },
  {
    icon: <Groups />,
    title: 'Role-Based Access',
    description: 'Separate dashboards for admins, parents/teachers, and students with appropriate permissions.'
  },
  {
    icon: <Speed />,
    title: 'Adaptive Learning',
    description: 'Personalized learning paths that adapt to each student\'s performance and pace.'
  },
  {
    icon: <Security />,
    title: 'Secure & Private',
    description: 'Enterprise-grade security with data encryption and privacy protection for families.'
  }
]

const benefits = [
  'Create unlimited AI-generated exams',
  'Track multiple children\'s progress',
  'Get detailed performance analytics',
  'Access interactive study materials',
  'Gamified learning experience',
  'Real-time feedback and grading'
]

export default function Landing() {
  return (
    <Box>
      {/* Navigation */}
      <Box className="bg-white shadow-sm border-b">
        <Container maxWidth="lg">
          <Box className="flex items-center justify-between py-4">
            <Typography variant="h5" component="div" className="font-bold text-blue-600">
              HomeSchool Exam System
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button component={Link} to="/login" variant="outlined">
                Login
              </Button>
              <Button component={Link} to="/register" variant="contained">
                Get Started
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" className="font-bold mb-6">
                AI-Powered Homeschooling
                <span className="text-blue-600 block">Exam System</span>
              </Typography>
              <Typography variant="h6" color="text.secondary" className="mb-8">
                Comprehensive educational platform with AI-powered exam generation, 
                intelligent grading, and advanced analytics for homeschooling families.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
                <Button 
                  component={Link} 
                  to="/register" 
                  variant="contained" 
                  size="large"
                  className="px-8 py-3"
                >
                  Start Free Trial
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  className="px-8 py-3"
                >
                  Watch Demo
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={3} className="p-8 bg-white rounded-2xl">
                <Box className="text-center">
                  <School className="text-6xl text-blue-600 mb-4" />
                  <Typography variant="h5" className="mb-4">
                    Trusted by 1000+ Families
                  </Typography>
                  <Box className="grid grid-cols-2 gap-4 text-sm">
                    <Box>
                      <Typography variant="h4" className="font-bold text-blue-600">
                        50K+
                      </Typography>
                      <Typography color="text.secondary">
                        Exams Generated
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h4" className="font-bold text-green-600">
                        95%
                      </Typography>
                      <Typography color="text.secondary">
                        Success Rate
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" className="py-20">
        <Box className="text-center mb-16">
          <Typography variant="h3" component="h2" className="font-bold mb-4">
            Powerful Features for Modern Homeschooling
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Everything you need to create, manage, and track educational progress
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <Box className="text-blue-600 mb-4">
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" className="font-semibold mb-2">
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box className="bg-gray-50 py-20">
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" className="font-bold mb-6">
                Why Choose Our Platform?
              </Typography>
              <Typography variant="body1" color="text.secondary" className="mb-6">
                Designed specifically for homeschooling families who want comprehensive 
                educational tools with the power of artificial intelligence.
              </Typography>
              <Stack spacing={2}>
                {benefits.map((benefit, index) => (
                  <Box key={index} className="flex items-center space-x-3">
                    <CheckCircle className="text-green-600" />
                    <Typography>{benefit}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={2} className="p-8 bg-white rounded-2xl">
                <Typography variant="h5" className="font-semibold mb-6 text-center">
                  Ready to Get Started?
                </Typography>
                <Stack spacing={3}>
                  <Button 
                    component={Link} 
                    to="/register" 
                    variant="contained" 
                    size="large" 
                    fullWidth
                  >
                    Create Free Account
                  </Button>
                  <Button 
                    component={Link} 
                    to="/login" 
                    variant="outlined" 
                    size="large" 
                    fullWidth
                  >
                    Sign In
                  </Button>
                  <Typography variant="body2" color="text.secondary" className="text-center">
                    No credit card required • 14-day free trial
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box className="bg-gray-900 text-white py-12">
        <Container maxWidth="lg">
          <Box className="text-center">
            <Typography variant="h5" className="font-bold mb-4">
              HomeSchool Exam System
            </Typography>
            <Typography color="text.secondary" className="mb-4">
              Empowering homeschooling families with AI-powered educational tools
            </Typography>
            <Typography variant="body2" color="text.secondary">
              © 2024 HomeSchool Exam System. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
