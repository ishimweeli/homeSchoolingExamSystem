// Test Configuration for all user roles
module.exports = {
  // URLs
  baseUrl: 'http://localhost:5001',
  apiUrl: 'http://localhost:5000',

  // Test Users (from seed data)
  users: {
    admin: {
      email: 'admin@test.com',
      password: 'password123',
      role: 'ADMIN',
      name: 'Admin User'
    },
    teacher: {
      email: 'teacher@test.com',
      password: 'password123',
      role: 'TEACHER',
      name: 'Teacher User'
    },
    parent: {
      email: 'parent@test.com',
      password: 'password123',
      role: 'PARENT',
      name: 'Parent User'
    },
    student: {
      email: 'student@test.com',
      password: 'password123',
      role: 'STUDENT',
      name: 'Student User'
    }
  },

  // Puppeteer Settings
  puppeteer: {
    headless: false, // Set to true for CI/CD
    slowMo: 50, // Slow down actions by 50ms for visibility
    devtools: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080'
    ],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  },

  // Test Settings
  timeout: 30000, // 30 seconds per test
  screenshotOnError: true,
  screenshotPath: './screenshots',
  reportPath: './reports',

  // API Endpoints to Test
  endpoints: {
    auth: {
      login: '/api/auth/login',
      register: '/api/auth/register',
      logout: '/api/auth/logout',
      me: '/api/auth/me'
    },
    exams: {
      list: '/api/exams',
      create: '/api/exams',
      get: '/api/exams/:id',
      update: '/api/exams/:id',
      delete: '/api/exams/:id',
      generate: '/api/exams/generate',
      assign: '/api/exams/:id/assign',
      submit: '/api/exams/:id/submit',
      publish: '/api/exams/:id/publish'
    },
    studyModules: {
      list: '/api/study-modules',
      create: '/api/study-modules',
      get: '/api/study-modules/:id',
      update: '/api/study-modules/:id',
      delete: '/api/study-modules/:id',
      generate: '/api/study-modules/generate',
      assign: '/api/study-modules/:id/assign',
      progress: '/api/study-modules/:id/progress'
    },
    students: {
      list: '/api/students',
      create: '/api/students',
      get: '/api/students/:id',
      update: '/api/students/:id',
      delete: '/api/students/:id',
      assignedExams: '/api/students/assigned-exams'
    },
    results: {
      list: '/api/results',
      get: '/api/results/:id',
      grade: '/api/results/:id/grade',
      publish: '/api/results/:id/publish'
    },
    dashboard: {
      stats: '/api/dashboard/stats'
    }
  },

  // Test Data Templates
  testData: {
    exam: {
      title: 'Test Exam - {{timestamp}}',
      subject: 'Mathematics',
      grade: '10',
      duration: 60,
      questions: [
        {
          question: 'What is 2 + 2?',
          type: 'MULTIPLE_CHOICE',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
          points: 10
        }
      ]
    },
    studyModule: {
      title: 'Test Module - {{timestamp}}',
      subject: 'Science',
      grade: '9',
      description: 'Test module for automated testing',
      lessons: [
        {
          title: 'Lesson 1',
          content: 'Introduction to Science',
          duration: 30
        }
      ]
    },
    student: {
      name: 'Test Student {{timestamp}}',
      username: 'test_student_{{timestamp}}',
      password: 'password123',
      grade: '10'
    }
  }
};