import { Box, Button, Container, Stack, Typography, Paper } from '@mui/material'

export default function Home() {
  return (
    <Container maxWidth="lg" className="py-12">
      <Stack spacing={6} alignItems="center">
        <Box textAlign="center">
          <Typography variant="h3" component="h1" className="font-semibold">
            Home Schooling Exam System
          </Typography>
          <Typography variant="body1" color="text.secondary" className="mt-2">
            Manage courses, schedule exams, and track performance.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} className="mt-6" justifyContent="center">
            <Button variant="contained" color="primary">
              Get Started
            </Button>
            <Button variant="outlined" color="secondary">
              View Reports
            </Button>
          </Stack>
        </Box>

        <Paper elevation={1} className="w-full p-6">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="stretch">
            <Box className="flex-1">
              <Typography variant="h6" className="mb-2">
                Upcoming Exams
              </Typography>
              <div className="space-y-2">
                <div className="rounded-md border p-3 flex items-center justify-between">
                  <span>Algebra I - Unit 4</span>
                  <span className="text-sm text-gray-500">Oct 12</span>
                </div>
                <div className="rounded-md border p-3 flex items-center justify-between">
                  <span>World History - Chapter 6</span>
                  <span className="text-sm text-gray-500">Oct 18</span>
                </div>
              </div>
            </Box>
            <Box className="flex-1">
              <Typography variant="h6" className="mb-2">
                Quick Actions
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button variant="contained">Create Exam</Button>
                <Button variant="outlined">Add Lesson</Button>
                <Button variant="text">Invite Student</Button>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  )
}


