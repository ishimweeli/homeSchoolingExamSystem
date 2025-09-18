// Direct test of exam creation and assignment flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function getSession(email, password) {
  console.log(`\nLogging in as ${email}...`);
  
  // Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  
  // Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      csrfToken,
      emailOrUsername: email,
      password: password,
      redirect: false,
    }),
  });
  
  const cookies = loginRes.headers.get('set-cookie');
  
  if (loginRes.ok) {
    console.log('✅ Login successful');
    return cookies;
  } else {
    console.log('❌ Login failed');
    return null;
  }
}

async function createExamDirectly(cookies) {
  console.log('\n📝 Creating exam via API...');
  
  const examData = {
    title: 'Math Quiz - Fractions Test',
    subject: 'Mathematics',
    gradeLevel: 6,
    topics: ['Fractions', 'Decimals', 'Percentages'],
    duration: 45,
    difficulty: 'medium',
    numberOfQuestions: 10,
    questionTypes: {
      multipleChoice: 5,
      trueFalse: 2,
      shortAnswer: 2,
      longAnswer: 1,
      fillBlanks: 0,
      mathProblem: 0,
    }
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/exams/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(examData),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Exam created successfully!');
      console.log('  Exam ID:', result.id);
      console.log('  Title:', result.title);
      return result;
    } else {
      const error = await response.text();
      console.log('❌ Failed to create exam:', response.status);
      console.log('  Error:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error creating exam:', error.message);
    return null;
  }
}

async function assignExamToStudent(examId, studentId, cookies) {
  console.log(`\n📌 Assigning exam ${examId} to student...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/exams/${examId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        studentIds: [studentId],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Exam assigned successfully!');
      return result;
    } else {
      const error = await response.text();
      console.log('❌ Failed to assign exam:', response.status);
      console.log('  Error:', error);
      return null;
    }
  } catch (error) {
    console.log('❌ Error assigning exam:', error.message);
    return null;
  }
}

async function getStudentExams(cookies) {
  console.log('\n📚 Getting student assigned exams...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/students/assigned-exams`, {
      headers: {
        'Cookie': cookies,
      },
    });
    
    if (response.ok) {
      const exams = await response.json();
      console.log(`✅ Found ${exams.length} assigned exam(s)`);
      exams.forEach(exam => {
        console.log(`  - ${exam.title} (ID: ${exam.id})`);
      });
      return exams;
    } else {
      console.log('❌ Failed to get exams');
      return [];
    }
  } catch (error) {
    console.log('❌ Error getting exams:', error.message);
    return [];
  }
}

async function testCompleteFlow() {
  console.log('🚀 Testing Complete Exam Creation and Assignment Flow');
  console.log('='.repeat(50));
  
  // Step 1: Teacher creates exam
  const teacherCookies = await getSession('teacher@test.com', 'password123');
  if (!teacherCookies) {
    console.log('Failed to login as teacher');
    return;
  }
  
  const exam = await createExamDirectly(teacherCookies);
  if (!exam) {
    console.log('Failed to create exam');
    return;
  }
  
  // Step 2: Assign to student (using hardcoded student ID from seed)
  const studentId = 'cmeqs8hfy00049d9ez39zw3fk'; // From seed output
  await assignExamToStudent(exam.id, studentId, teacherCookies);
  
  // Step 3: Check as student
  const studentCookies = await getSession('student@test.com', 'password123');
  if (!studentCookies) {
    console.log('Failed to login as student');
    return;
  }
  
  await getStudentExams(studentCookies);
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test Complete!');
}

// Run test
testCompleteFlow().catch(console.error);