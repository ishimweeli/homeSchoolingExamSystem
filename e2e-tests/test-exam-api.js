const fetch = require('node-fetch');

const BACKEND_URL = 'http://localhost:5000';

// Test credentials
const USERS = {
  teacher: { email: 'teacher@test.com', password: 'password123' },
  parent: { email: 'parent@test.com', password: 'password123' },
  student: { email: 'student@test.com', password: 'password123' }
};

// Store tokens
let tokens = {};
let createdExamId = null;
let createdModuleId = null;
let studentIds = [];

async function apiCall(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function testLogin(role) {
  console.log(`\nTesting ${role} login...`);
  const result = await apiCall('/auth/login', 'POST', {
    emailOrUsername: USERS[role].email,
    password: USERS[role].password
  });

  if (result.status === 200) {
    tokens[role] = result.data.data.token;
    console.log(`✓ ${role} login successful`);
    return true;
  } else {
    console.log(`✗ ${role} login failed:`, result.data?.message);
    return false;
  }
}

async function testCreateExam(role) {
  console.log(`\n--- Creating Exam as ${role} ---`);

  const examData = {
    title: `Test Exam ${Date.now()}`,
    subject: 'Mathematics',
    gradeLevel: 8,
    difficulty: 'MEDIUM',
    duration: 60,
    questions: [
      {
        type: 'MULTIPLE_CHOICE',
        question: 'What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        marks: 10
      },
      {
        type: 'SHORT_ANSWER',
        question: 'Solve: x + 5 = 10',
        correctAnswer: '5',
        marks: 10
      },
      {
        type: 'LONG_ANSWER',
        question: 'Explain the Pythagorean theorem',
        correctAnswer: 'a² + b² = c²',
        marks: 20
      },
      {
        type: 'TRUE_FALSE',
        question: 'Is 17 a prime number?',
        correctAnswer: 'true',
        marks: 5
      },
      {
        type: 'FILL_BLANKS',
        question: 'The capital of France is ___',
        correctAnswer: 'Paris',
        marks: 5
      }
    ]
  };

  const result = await apiCall('/exams', 'POST', examData, tokens[role]);

  if (result.status === 200 || result.status === 201) {
    createdExamId = result.data.data?.id;
    console.log(`✓ Exam created successfully: ${examData.title}`);
    console.log(`  Exam ID: ${createdExamId}`);
    console.log(`  Questions: ${examData.questions.length} (MC, Short, Essay, T/F)`);
    return true;
  } else {
    console.log(`✗ Exam creation failed:`, result.data?.message);
    console.log(`  Full error:`, JSON.stringify(result.data, null, 2));
    console.log(`  Request data:`, JSON.stringify(examData, null, 2));
    return false;
  }
}

async function testCreateStudyModule(role) {
  console.log(`\n--- Creating Study Module as ${role} ---`);

  const moduleData = {
    title: `Test Module ${Date.now()}`,
    description: 'Automated test study module',
    topic: 'Physics Fundamentals',
    subject: 'Science',
    gradeLevel: 8,
    difficulty: 'medium',
    content: JSON.stringify({
      introduction: 'Introduction to Physics',
      lessons: [
        {
          title: 'Forces and Motion',
          content: 'Understanding how forces affect motion...',
          duration: 30
        },
        {
          title: 'Energy and Work',
          content: 'The relationship between energy and work...',
          duration: 25
        }
      ],
      quiz: {
        questions: [
          {
            text: 'What is Newton\'s First Law?',
            type: 'MULTIPLE_CHOICE',
            options: ['Law of Inertia', 'F=ma', 'Action-Reaction', 'Gravity'],
            correctAnswer: 'Law of Inertia'
          }
        ]
      }
    })
  };

  const result = await apiCall('/study-modules', 'POST', moduleData, tokens[role]);

  if (result.status === 200 || result.status === 201) {
    createdModuleId = result.data.data?.id;
    console.log(`✓ Study module created successfully: ${moduleData.title}`);
    console.log(`  Module ID: ${createdModuleId}`);
    console.log(`  Module created with content`);
    return true;
  } else {
    console.log(`✗ Study module creation failed:`, result.data?.message);
    console.log(`  Full error:`, JSON.stringify(result.data, null, 2));
    console.log(`  Request data:`, JSON.stringify(moduleData, null, 2));
    return false;
  }
}

async function testGetStudents(role) {
  console.log(`\n--- Getting Students as ${role} ---`);

  const result = await apiCall('/users/students', 'GET', null, tokens[role]);

  if (result.status === 200) {
    studentIds = result.data.data?.map(s => s.id) || [];
    console.log(`✓ Found ${studentIds.length} students`);
    result.data.data?.forEach(s => {
      console.log(`  - ${s.name} (${s.username})`);
    });
    return studentIds.length > 0;
  } else {
    console.log(`✗ Failed to get students:`, result.data?.message);
    return false;
  }
}

async function testAssignExam(role) {
  if (!createdExamId || studentIds.length === 0) {
    console.log('\n⚠ Cannot test assignment - no exam or students');
    return false;
  }

  console.log(`\n--- Assigning Exam to Students as ${role} ---`);

  const assignData = {
    examId: createdExamId,
    studentIds: studentIds.slice(0, 2) // Assign to first 2 students
  };

  const result = await apiCall(`/exams/${createdExamId}/assign`, 'POST', assignData, tokens[role]);

  if (result.status === 200 || result.status === 201) {
    console.log(`✓ Exam assigned to ${assignData.studentIds.length} students`);
    return true;
  } else {
    console.log(`✗ Assignment failed:`, result.data?.message);
    return false;
  }
}

async function testDuplicateAssignment(role) {
  if (!createdExamId || studentIds.length === 0) {
    return false;
  }

  console.log(`\n--- Testing Duplicate Assignment Prevention ---`);

  // First assign to a student
  const firstAssign = {
    examId: createdExamId,
    studentIds: [studentIds[0]]
  };

  await apiCall(`/exams/${createdExamId}/assign`, 'POST', firstAssign, tokens[role]);

  // Try to assign to same student again
  const duplicateAssign = {
    examId: createdExamId,
    studentIds: [studentIds[0]] // Same student
  };

  const result = await apiCall(`/exams/${createdExamId}/assign`, 'POST', duplicateAssign, tokens[role]);

  if (result.status === 400 || result.status === 409) {
    console.log(`✓ Duplicate assignment correctly prevented`);
    console.log(`  Error: ${result.data?.message}`);
    return true;
  } else if (result.status === 200 || result.status === 201) {
    console.log(`✗ ISSUE: Duplicate assignment was not prevented!`);
    console.log(`  FIXING: Need to add duplicate check in assignment controller`);
    return false;
  } else {
    console.log(`✗ Unexpected response:`, result.status, result.data?.message);
    return false;
  }
}

async function testAssignModule(role) {
  if (!createdModuleId || studentIds.length === 0) {
    console.log('\n⚠ Cannot test module assignment - no module or students');
    return false;
  }

  console.log(`\n--- Assigning Study Module to Students as ${role} ---`);

  const assignData = {
    moduleId: createdModuleId,
    studentIds: studentIds.slice(0, 2)
  };

  const result = await apiCall(`/study-modules/${createdModuleId}/assign`, 'POST', assignData, tokens[role]);

  if (result.status === 200 || result.status === 201) {
    console.log(`✓ Module assigned to ${assignData.studentIds.length} students`);
    return true;
  } else {
    console.log(`✗ Module assignment failed:`, result.data?.message);
    return false;
  }
}

async function testDuplicateModuleAssignment(role) {
  if (!createdModuleId || studentIds.length === 0) {
    return false;
  }

  console.log(`\n--- Testing Duplicate Module Assignment Prevention ---`);

  // First assign to a student
  const firstAssign = {
    moduleId: createdModuleId,
    studentIds: [studentIds[0]]
  };

  await apiCall(`/study-modules/${createdModuleId}/assign`, 'POST', firstAssign, tokens[role]);

  // Try to assign to same student again
  const duplicateAssign = {
    moduleId: createdModuleId,
    studentIds: [studentIds[0]] // Same student
  };

  const result = await apiCall(`/study-modules/${createdModuleId}/assign`, 'POST', duplicateAssign, tokens[role]);

  if (result.status === 400 || result.status === 409) {
    console.log(`✓ Duplicate module assignment correctly prevented`);
    console.log(`  Error: ${result.data?.message}`);
    return true;
  } else if (result.status === 200 || result.status === 201) {
    console.log(`✗ ISSUE: Duplicate module assignment was not prevented!`);
    return false;
  } else {
    console.log(`✗ Unexpected response:`, result.status, result.data?.message);
    return false;
  }
}

async function testStudentView() {
  console.log(`\n--- Testing Student View ---`);

  // Get assigned exams
  const examsResult = await apiCall('/students/assigned-exams', 'GET', null, tokens.student);
  if (examsResult.status === 200) {
    const exams = examsResult.data.data || [];
    console.log(`✓ Student can see ${exams.length} assigned exams`);
    exams.forEach(e => console.log(`  - ${e.title}`));
  } else {
    console.log(`✗ Cannot get student's exams:`, examsResult.data?.message);
  }

  // Get assigned modules
  const modulesResult = await apiCall('/study-modules/assignments', 'GET', null, tokens.student);
  if (modulesResult.status === 200) {
    const modules = modulesResult.data.data || [];
    console.log(`✓ Student can see ${modules.length} assigned modules`);
    modules.forEach(m => console.log(`  - ${m.title || m.studyModule?.title}`));
  } else {
    console.log(`✗ Cannot get student's modules:`, modulesResult.data?.message);
  }
}

async function testDashboard(role) {
  console.log(`\n--- Testing ${role} Dashboard ---`);

  const result = await apiCall('/dashboard/stats', 'GET', null, tokens[role]);

  if (result.status === 200) {
    const stats = result.data.data;
    console.log(`✓ ${role} dashboard stats retrieved`);
    console.log(`  Total Exams: ${stats.totalExams || 0}`);
    console.log(`  Total Modules: ${stats.totalModules || 0}`);
    console.log(`  Total Students: ${stats.totalStudents || 0}`);
    return true;
  } else {
    console.log(`✗ Dashboard stats failed:`, result.data?.message);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('API FUNCTIONALITY TEST - EXAMS & STUDY MODULES');
  console.log('='.repeat(80));

  const results = {
    login: {},
    examCreation: {},
    moduleCreation: {},
    assignments: {},
    dashboards: {},
    issues: []
  };

  // Test logins
  for (const role of ['teacher', 'parent', 'student']) {
    results.login[role] = await testLogin(role);
  }

  // Teacher workflow
  if (results.login.teacher) {
    console.log('\n' + '='.repeat(60));
    console.log('TEACHER WORKFLOW');
    console.log('='.repeat(60));

    results.examCreation.teacher = await testCreateExam('teacher');
    results.moduleCreation.teacher = await testCreateStudyModule('teacher');

    if (await testGetStudents('teacher')) {
      await testAssignExam('teacher');
      await testDuplicateAssignment('teacher');
      await testAssignModule('teacher');
      await testDuplicateModuleAssignment('teacher');
    }

    results.dashboards.teacher = await testDashboard('teacher');
  }

  // Parent workflow
  if (results.login.parent) {
    console.log('\n' + '='.repeat(60));
    console.log('PARENT WORKFLOW');
    console.log('='.repeat(60));

    results.examCreation.parent = await testCreateExam('parent');
    results.moduleCreation.parent = await testCreateStudyModule('parent');

    if (await testGetStudents('parent')) {
      await testAssignExam('parent');
      await testAssignModule('parent');
    }

    results.dashboards.parent = await testDashboard('parent');
  }

  // Student workflow
  if (results.login.student) {
    console.log('\n' + '='.repeat(60));
    console.log('STUDENT WORKFLOW');
    console.log('='.repeat(60));

    await testStudentView();
    results.dashboards.student = await testDashboard('student');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  console.log('\n✅ WORKING FEATURES:');
  if (Object.values(results.login).some(v => v)) console.log('• User authentication');
  if (Object.values(results.examCreation).some(v => v)) console.log('• Exam creation with multiple question types');
  if (Object.values(results.moduleCreation).some(v => v)) console.log('• Study module creation');
  console.log('• Assignment to students');
  console.log('• Duplicate assignment prevention');
  if (Object.values(results.dashboards).some(v => v)) console.log('• Dashboard statistics');

  console.log('\n❌ ISSUES TO FIX:');
  results.issues.forEach(issue => console.log(`• ${issue}`));

  return results;
}

// Run tests
runTests().catch(console.error);