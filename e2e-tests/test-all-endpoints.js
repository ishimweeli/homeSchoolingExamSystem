const TestHelpers = require('./utils/test-helpers');
const config = require('./configs/test-config');
const chalk = require('chalk');

async function testAllEndpoints() {
  const tester = new TestHelpers();
  let allTestsPassed = true;

  console.log(chalk.cyan.bold(`
╔════════════════════════════════════════════════════╗
║     HOME SCHOOLING EXAM SYSTEM - E2E TESTS        ║
║         Testing ALL Endpoints & User Flows         ║
╚════════════════════════════════════════════════════╝
  `));

  try {
    await tester.initialize();

    // ============================================
    // TEST 1: AUTHENTICATION FOR ALL ROLES
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: Authentication\n'));

    for (const role of ['admin', 'teacher', 'parent', 'student']) {
      console.log(chalk.blue(`\n[${role.toUpperCase()}] Testing Authentication`));

      // Test login
      const loginSuccess = await tester.login(role);

      if (loginSuccess) {
        // Test authenticated endpoints
        await tester.testAPIEndpoint('GET', '/api/auth/me', null, 200);
        await tester.testAPIEndpoint('GET', '/api/dashboard/stats', null, 200);

        // Test navigation to dashboard
        await tester.navigateToPage('/dashboard', 'h2');

        // Take screenshot of dashboard
        await tester.takeScreenshot(`dashboard-${role}`);

        // Logout
        await tester.logout();
      } else {
        allTestsPassed = false;
      }
    }

    // ============================================
    // TEST 2: EXAM ENDPOINTS (TEACHER ROLE)
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: Exam Management\n'));

    await tester.login('teacher');

    // Create exam
    const examData = {
      title: `Test Exam ${Date.now()}`,
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
        },
        {
          question: 'What is 10 * 10?',
          type: 'MULTIPLE_CHOICE',
          options: ['90', '100', '110', '120'],
          correctAnswer: '100',
          points: 10
        }
      ]
    };

    const createExamResponse = await tester.testAPIEndpoint('POST', '/api/exams', examData, 201);
    let examId = null;

    if (createExamResponse && createExamResponse.data) {
      examId = createExamResponse.data.id;
      console.log(chalk.green(`  ✅ Exam created with ID: ${examId}`));

      // Test other exam endpoints
      await tester.testAPIEndpoint('GET', '/api/exams', null, 200);
      await tester.testAPIEndpoint('GET', `/api/exams/${examId}`, null, 200);

      // Update exam
      await tester.testAPIEndpoint('PUT', `/api/exams/${examId}`,
        { title: 'Updated Test Exam' }, 200);

      // Publish exam
      await tester.testAPIEndpoint('POST', `/api/exams/${examId}/publish`, null, 200);

      // Assign exam to students
      await tester.testAPIEndpoint('POST', `/api/exams/${examId}/assign`,
        { studentIds: [] }, 200);
    }

    // Test exam generation with AI
    console.log(chalk.blue('\n[AI] Testing Exam Generation'));
    await tester.testAPIEndpoint('POST', '/api/exams/generate', {
      subject: 'Science',
      grade: '9',
      topic: 'Photosynthesis',
      questionCount: 5,
      difficulty: 'medium'
    }, 200);

    await tester.logout();

    // ============================================
    // TEST 3: STUDY MODULE ENDPOINTS (TEACHER)
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: Study Modules\n'));

    await tester.login('teacher');

    const moduleData = {
      title: `Test Module ${Date.now()}`,
      subject: 'Science',
      grade: '9',
      description: 'Test module for automated testing',
      lessons: [
        {
          title: 'Introduction',
          content: 'Welcome to Science',
          duration: 30
        },
        {
          title: 'Chapter 1',
          content: 'Basic Concepts',
          duration: 45
        }
      ]
    };

    const createModuleResponse = await tester.testAPIEndpoint('POST', '/api/study-modules', moduleData, 201);
    let moduleId = null;

    if (createModuleResponse && createModuleResponse.data) {
      moduleId = createModuleResponse.data.id;
      console.log(chalk.green(`  ✅ Module created with ID: ${moduleId}`));

      // Test other module endpoints
      await tester.testAPIEndpoint('GET', '/api/study-modules', null, 200);
      await tester.testAPIEndpoint('GET', `/api/study-modules/${moduleId}`, null, 200);

      // Update module
      await tester.testAPIEndpoint('PUT', `/api/study-modules/${moduleId}`,
        { title: 'Updated Test Module' }, 200);

      // Assign module to students
      await tester.testAPIEndpoint('POST', `/api/study-modules/${moduleId}/assign`,
        { studentIds: [] }, 200);

      // Check progress
      await tester.testAPIEndpoint('GET', `/api/study-modules/${moduleId}/progress`, null, 200);
    }

    // Test module generation with AI
    console.log(chalk.blue('\n[AI] Testing Module Generation'));
    await tester.testAPIEndpoint('POST', '/api/study-modules/generate', {
      subject: 'English',
      grade: '10',
      topic: 'Shakespeare',
      lessonCount: 3
    }, 200);

    await tester.logout();

    // ============================================
    // TEST 4: STUDENT MANAGEMENT (PARENT/TEACHER)
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: Student Management\n'));

    // Test as Teacher
    console.log(chalk.blue('\n[TEACHER] Student Management'));
    await tester.login('teacher');

    const studentData = {
      name: `Test Student ${Date.now()}`,
      username: `test_student_${Date.now()}`,
      password: 'password123'
    };

    const createStudentResponse = await tester.testAPIEndpoint('POST', '/api/students', studentData, 201);
    let studentId = null;

    if (createStudentResponse && createStudentResponse.data) {
      studentId = createStudentResponse.data.id;
      console.log(chalk.green(`  ✅ Student created with ID: ${studentId}`));

      // Test other student endpoints
      await tester.testAPIEndpoint('GET', '/api/students', null, 200);
      await tester.testAPIEndpoint('GET', `/api/students/${studentId}`, null, 200);

      // Update student
      await tester.testAPIEndpoint('PUT', `/api/students/${studentId}`,
        { name: 'Updated Student Name' }, 200);
    }

    await tester.logout();

    // Test as Parent
    console.log(chalk.blue('\n[PARENT] Student Management'));
    await tester.login('parent');

    await tester.testAPIEndpoint('GET', '/api/students', null, 200);
    await tester.testAPIEndpoint('POST', '/api/students', {
      name: `Parent Student ${Date.now()}`,
      username: `parent_student_${Date.now()}`,
      password: 'password123'
    }, 201);

    await tester.logout();

    // ============================================
    // TEST 5: STUDENT EXAM FLOW
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: Student Exam Flow\n'));

    await tester.login('student');

    await tester.testUserFlow('Student Exam Taking', [
      {
        name: 'Navigate to Dashboard',
        action: async () => await tester.navigateToPage('/dashboard', 'h2')
      },
      {
        name: 'Check Assigned Exams',
        action: async () => await tester.testAPIEndpoint('GET', '/api/students/assigned-exams', null, 200)
      },
      {
        name: 'View Available Exams',
        action: async () => await tester.testAPIEndpoint('GET', '/api/exams', null, 200)
      },
      {
        name: 'Start Exam (if available)',
        action: async () => {
          if (examId) {
            return await tester.testAPIEndpoint('POST', `/api/exams/${examId}/attempt`, null, 200);
          }
          return true;
        }
      },
      {
        name: 'Submit Exam Answers',
        action: async () => {
          if (examId) {
            return await tester.testAPIEndpoint('POST', `/api/exams/${examId}/submit`, {
              answers: [
                { questionId: 1, answer: '4' },
                { questionId: 2, answer: '100' }
              ]
            }, 200);
          }
          return true;
        }
      },
      {
        name: 'View Results',
        action: async () => await tester.testAPIEndpoint('GET', '/api/results', null, 200)
      }
    ]);

    await tester.logout();

    // ============================================
    // TEST 6: COMPLETE ASSIGNMENT WORKFLOW
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: Complete Assignment Workflow\n'));

    // Teacher creates and assigns
    await tester.login('teacher');

    await tester.testUserFlow('Teacher Assignment Workflow', [
      {
        name: 'Create New Exam',
        action: async () => {
          const response = await tester.testAPIEndpoint('POST', '/api/exams', {
            title: `Workflow Test Exam ${Date.now()}`,
            subject: 'History',
            grade: '11',
            duration: 45,
            questions: [
              {
                question: 'Who was the first president?',
                type: 'SHORT_ANSWER',
                correctAnswer: 'George Washington',
                points: 20
              }
            ]
          }, 201);
          if (response && response.data) {
            examId = response.data.id;
          }
          return response;
        }
      },
      {
        name: 'Create New Module',
        action: async () => {
          const response = await tester.testAPIEndpoint('POST', '/api/study-modules', {
            title: `Workflow Test Module ${Date.now()}`,
            subject: 'History',
            grade: '11',
            description: 'American History',
            lessons: [{ title: 'Lesson 1', content: 'Content', duration: 30 }]
          }, 201);
          if (response && response.data) {
            moduleId = response.data.id;
          }
          return response;
        }
      },
      {
        name: 'Get Student List',
        action: async () => await tester.testAPIEndpoint('GET', '/api/students', null, 200)
      },
      {
        name: 'Assign Exam to Students',
        action: async () => {
          if (examId) {
            return await tester.testAPIEndpoint('POST', `/api/exams/${examId}/assign`,
              { studentIds: [] }, 200);
          }
          return true;
        }
      },
      {
        name: 'Assign Module to Students',
        action: async () => {
          if (moduleId) {
            return await tester.testAPIEndpoint('POST', `/api/study-modules/${moduleId}/assign`,
              { studentIds: [] }, 200);
          }
          return true;
        }
      },
      {
        name: 'View Assignment Statistics',
        action: async () => await tester.testAPIEndpoint('GET', '/api/dashboard/stats', null, 200)
      }
    ]);

    await tester.logout();

    // ============================================
    // TEST 7: ADMIN CAPABILITIES
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: Admin Capabilities\n'));

    await tester.login('admin');

    await tester.testUserFlow('Admin Management', [
      {
        name: 'View All Users',
        action: async () => await tester.testAPIEndpoint('GET', '/api/admin/users', null, 200)
      },
      {
        name: 'View All Exams',
        action: async () => await tester.testAPIEndpoint('GET', '/api/exams', null, 200)
      },
      {
        name: 'View All Modules',
        action: async () => await tester.testAPIEndpoint('GET', '/api/study-modules', null, 200)
      },
      {
        name: 'View System Stats',
        action: async () => await tester.testAPIEndpoint('GET', '/api/dashboard/stats', null, 200)
      },
      {
        name: 'Navigate to Admin Dashboard',
        action: async () => await tester.navigateToPage('/dashboard', 'h2')
      }
    ]);

    await tester.logout();

    // ============================================
    // TEST 8: UI NAVIGATION FOR ALL ROLES
    // ============================================
    console.log(chalk.yellow.bold('\n📋 TEST SUITE: UI Navigation\n'));

    for (const role of ['student', 'teacher', 'parent', 'admin']) {
      console.log(chalk.blue(`\n[${role.toUpperCase()}] UI Navigation Test`));

      await tester.login(role);

      await tester.testUserFlow(`${role} UI Navigation`, [
        {
          name: 'Dashboard Access',
          action: async () => await tester.navigateToPage('/dashboard', 'h2')
        },
        {
          name: 'Check Sidebar Elements',
          action: async () => {
            const hasOverview = await tester.elementExists('button[id="overview"]');
            const hasExams = await tester.elementExists('button[id="exams"]');
            const hasModules = await tester.elementExists('button[id="modules"]');

            if (role !== 'student') {
              const hasStudents = await tester.elementExists('button[id="students"]');
              return hasOverview && hasExams && hasModules && hasStudents;
            }
            return hasOverview && hasExams && hasModules;
          }
        },
        {
          name: 'Take Dashboard Screenshot',
          action: async () => {
            await tester.takeScreenshot(`ui-navigation-${role}-dashboard`);
            return true;
          }
        }
      ]);

      await tester.logout();
    }

    // ============================================
    // GENERATE FINAL REPORT
    // ============================================
    console.log(chalk.cyan.bold('\n📊 Generating Test Report...\n'));

    const report = await tester.generateReport(`test-report-${Date.now()}.json`);

    // Display summary
    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════╗
║                 TEST SUMMARY                       ║
╚════════════════════════════════════════════════════╝
    `));

    console.log(chalk.white(`Total Tests Run: ${report.totalTests}`));
    console.log(chalk.green(`✅ Passed: ${report.passed}`));
    console.log(chalk.red(`❌ Failed: ${report.failed}`));
    console.log(chalk.yellow(`📊 Success Rate: ${Math.round(report.passed / report.totalTests * 100)}%`));

    // Display breakdown by user role
    console.log(chalk.cyan('\n📈 Results by User Role:'));
    for (const [user, results] of Object.entries(report.summary.byUser)) {
      console.log(`  ${user}: ✅ ${results.passed} | ❌ ${results.failed}`);
    }

    // Display breakdown by HTTP method
    console.log(chalk.cyan('\n📈 Results by HTTP Method:'));
    for (const [method, results] of Object.entries(report.summary.byMethod)) {
      console.log(`  ${method}: ✅ ${results.passed} | ❌ ${results.failed}`);
    }

    if (report.failed > 0) {
      console.log(chalk.red('\n⚠️ Some tests failed. Check the detailed report for more information.'));
      allTestsPassed = false;
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Test suite encountered an error:'), error);
    allTestsPassed = false;
  } finally {
    await tester.cleanup();
  }

  // Exit with appropriate code
  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests
testAllEndpoints().catch(console.error);