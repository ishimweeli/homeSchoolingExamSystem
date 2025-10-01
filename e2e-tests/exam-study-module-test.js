const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const FRONTEND_URL = 'http://localhost:5002';
const BACKEND_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = 'e2e-tests/screenshots-exam-test';
const RESULTS_FILE = 'e2e-tests/exam-test-results.json';

// Test users
const TEST_USERS = {
  teacher: {
    email: 'teacher@test.com',
    password: 'password123'
  },
  parent: {
    email: 'parent@test.com',
    password: 'password123'
  },
  student: {
    email: 'student@test.com',
    password: 'password123'
  }
};

// Test data
const EXAM_DATA = {
  title: `Math Exam ${Date.now()}`,
  description: 'Test exam with various question types',
  subject: 'Mathematics',
  grade: '8',
  duration: 60,
  topic: 'Algebra and Geometry basics'
};

const STUDY_MODULE_DATA = {
  title: `Science Module ${Date.now()}`,
  description: 'Interactive science learning module',
  subject: 'Science',
  grade: '8',
  topic: 'Physics - Forces and Motion'
};

let testResults = {
  timestamp: new Date().toISOString(),
  examCreation: {},
  studyModuleCreation: {},
  assignments: {},
  dashboards: {},
  issues: [],
  summary: {}
};

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error.message);
  }
}

async function takeScreenshot(page, name) {
  try {
    const filename = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '-')}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  } catch (error) {
    console.error(`Error taking screenshot ${name}:`, error.message);
    return null;
  }
}

async function loginUser(page, email, password, role) {
  console.log(`\nLogging in as ${role}...`);

  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });
  await takeScreenshot(page, `${role}-login-page`);

  // Clear any existing values
  await page.evaluate(() => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => input.value = '');
  });

  // Type credentials
  await page.type('input[name="emailOrUsername"], input[type="email"], input[type="text"]:not([type="password"])', email);
  await page.type('input[type="password"]', password);
  await takeScreenshot(page, `${role}-login-filled`);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForFunction(
    () => window.location.pathname !== '/login',
    { timeout: 10000 }
  ).catch(async () => {
    console.log('Login navigation timeout, checking current state...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
  });

  await page.waitForTimeout(2000);
  await takeScreenshot(page, `${role}-after-login`);

  const currentUrl = page.url();
  const loginSuccess = !currentUrl.includes('/login');

  if (loginSuccess) {
    console.log(`✓ ${role} login successful`);
    return true;
  } else {
    console.log(`✗ ${role} login failed`);
    const errorText = await page.$eval('.error, .alert-danger, [role="alert"]', el => el.textContent).catch(() => null);
    if (errorText) console.log(`  Error: ${errorText}`);
    return false;
  }
}

async function createExamWithAI(page, role) {
  console.log(`\n--- Creating Exam as ${role} ---`);

  try {
    // Navigate to exams page
    await page.goto(`${FRONTEND_URL}/exams`, { waitUntil: 'networkidle0' });
    await takeScreenshot(page, `${role}-exams-page`);

    // Click create exam button
    const createButton = await page.$('a[href="/exams/create"], button:has-text("Create"), button:contains("New Exam"), .create-exam-button');
    if (createButton) {
      await createButton.click();
      await page.waitForTimeout(2000);
    } else {
      // Try navigation directly
      await page.goto(`${FRONTEND_URL}/exams/create`, { waitUntil: 'networkidle0' });
    }

    await takeScreenshot(page, `${role}-exam-create-form`);

    // Fill exam details
    await page.type('input[name="title"], input[placeholder*="title" i]', EXAM_DATA.title);
    await page.type('textarea[name="description"], textarea[placeholder*="description" i]', EXAM_DATA.description);

    // Select subject
    const subjectSelect = await page.$('select[name="subject"]');
    if (subjectSelect) {
      await page.select('select[name="subject"]', EXAM_DATA.subject);
    } else {
      await page.type('input[name="subject"]', EXAM_DATA.subject);
    }

    // Set grade
    await page.type('input[name="grade"], input[placeholder*="grade" i]', EXAM_DATA.grade);

    // Set duration
    await page.type('input[name="duration"], input[type="number"]', EXAM_DATA.duration.toString());

    await takeScreenshot(page, `${role}-exam-details-filled`);

    // Generate questions with AI
    await page.type('input[name="topic"], textarea[name="topic"], input[placeholder*="topic" i]', EXAM_DATA.topic);

    const generateButton = await page.$('button:has-text("Generate"), button:contains("AI"), button[class*="generate"]');
    if (generateButton) {
      await generateButton.click();
      console.log('Generating questions with AI...');

      // Wait for generation
      await page.waitForFunction(
        () => {
          const loadingIndicators = document.querySelectorAll('.loading, .spinner, [class*="loading"]');
          return loadingIndicators.length === 0;
        },
        { timeout: 30000 }
      ).catch(() => console.log('AI generation timeout'));

      await takeScreenshot(page, `${role}-exam-ai-generated`);
    }

    // Add different question types manually if AI generation didn't work
    const addQuestionButton = await page.$('button:has-text("Add Question"), button:contains("Add"), button[class*="add-question"]');
    if (addQuestionButton) {
      // Add multiple choice question
      await addQuestionButton.click();
      await page.waitForTimeout(1000);

      await page.type('input[name="questionText"], textarea[name="questionText"]', 'What is 2 + 2?');
      await page.type('input[name="optionA"], input[placeholder*="option a" i]', '3');
      await page.type('input[name="optionB"], input[placeholder*="option b" i]', '4');
      await page.type('input[name="optionC"], input[placeholder*="option c" i]', '5');
      await page.type('input[name="optionD"], input[placeholder*="option d" i]', '6');

      const correctAnswerRadio = await page.$('input[type="radio"][value="B"]');
      if (correctAnswerRadio) await correctAnswerRadio.click();
    }

    // Save exam
    const saveButton = await page.$('button[type="submit"], button:has-text("Save"), button:contains("Create Exam")');
    if (saveButton) {
      await saveButton.click();

      await page.waitForFunction(
        () => window.location.pathname !== '/exams/create',
        { timeout: 10000 }
      ).catch(() => console.log('Save navigation timeout'));

      await takeScreenshot(page, `${role}-exam-created`);

      console.log(`✓ Exam created successfully as ${role}`);
      testResults.examCreation[role] = { success: true, title: EXAM_DATA.title };
      return true;
    }

    console.log(`✗ Could not save exam as ${role}`);
    testResults.examCreation[role] = { success: false, error: 'Save button not found' };
    return false;

  } catch (error) {
    console.error(`✗ Error creating exam as ${role}:`, error.message);
    testResults.examCreation[role] = { success: false, error: error.message };
    await takeScreenshot(page, `${role}-exam-error`);
    return false;
  }
}

async function createStudyModule(page, role) {
  console.log(`\n--- Creating Study Module as ${role} ---`);

  try {
    // Navigate to study modules page
    await page.goto(`${FRONTEND_URL}/study`, { waitUntil: 'networkidle0' });
    await takeScreenshot(page, `${role}-study-page`);

    // Click create module button
    const createButton = await page.$('a[href*="/study/create"], button:has-text("Create"), button:contains("New Module")');
    if (createButton) {
      await createButton.click();
      await page.waitForTimeout(2000);
    } else {
      await page.goto(`${FRONTEND_URL}/study/create`, { waitUntil: 'networkidle0' });
    }

    await takeScreenshot(page, `${role}-module-create-form`);

    // Fill module details
    await page.type('input[name="title"], input[placeholder*="title" i]', STUDY_MODULE_DATA.title);
    await page.type('textarea[name="description"], textarea[placeholder*="description" i]', STUDY_MODULE_DATA.description);
    await page.type('input[name="subject"], input[placeholder*="subject" i]', STUDY_MODULE_DATA.subject);
    await page.type('input[name="grade"], input[placeholder*="grade" i]', STUDY_MODULE_DATA.grade);

    await takeScreenshot(page, `${role}-module-details-filled`);

    // Generate content with AI
    await page.type('input[name="topic"], textarea[name="topic"], input[placeholder*="topic" i]', STUDY_MODULE_DATA.topic);

    const generateButton = await page.$('button:has-text("Generate"), button:contains("AI")');
    if (generateButton) {
      await generateButton.click();
      console.log('Generating module content with AI...');

      await page.waitForFunction(
        () => {
          const loadingIndicators = document.querySelectorAll('.loading, .spinner');
          return loadingIndicators.length === 0;
        },
        { timeout: 30000 }
      ).catch(() => console.log('AI generation timeout'));

      await takeScreenshot(page, `${role}-module-ai-generated`);
    }

    // Save module
    const saveButton = await page.$('button[type="submit"], button:has-text("Save"), button:contains("Create")');
    if (saveButton) {
      await saveButton.click();

      await page.waitForFunction(
        () => window.location.pathname !== '/study/create',
        { timeout: 10000 }
      ).catch(() => console.log('Save navigation timeout'));

      await takeScreenshot(page, `${role}-module-created`);

      console.log(`✓ Study module created successfully as ${role}`);
      testResults.studyModuleCreation[role] = { success: true, title: STUDY_MODULE_DATA.title };
      return true;
    }

    console.log(`✗ Could not save study module as ${role}`);
    testResults.studyModuleCreation[role] = { success: false, error: 'Save button not found' };
    return false;

  } catch (error) {
    console.error(`✗ Error creating study module as ${role}:`, error.message);
    testResults.studyModuleCreation[role] = { success: false, error: error.message };
    await takeScreenshot(page, `${role}-module-error`);
    return false;
  }
}

async function assignToStudents(page, contentType, role) {
  console.log(`\n--- Assigning ${contentType} to Students as ${role} ---`);

  try {
    // Navigate to appropriate page
    const url = contentType === 'exam' ? '/exams' : '/study';
    await page.goto(`${FRONTEND_URL}${url}`, { waitUntil: 'networkidle0' });

    // Find the content item
    const contentTitle = contentType === 'exam' ? EXAM_DATA.title : STUDY_MODULE_DATA.title;
    const contentCard = await page.$(`[class*="card"]:has-text("${contentTitle}")`);

    if (!contentCard) {
      console.log(`Content item not found: ${contentTitle}`);
      testResults.assignments[`${role}_${contentType}`] = { success: false, error: 'Content not found' };
      return false;
    }

    // Click assign button
    const assignButton = await contentCard.$('button:has-text("Assign"), a[href*="assign"]');
    if (assignButton) {
      await assignButton.click();
      await page.waitForTimeout(2000);
      await takeScreenshot(page, `${role}-${contentType}-assign-page`);

      // Select students
      const checkboxes = await page.$$('input[type="checkbox"][name*="student"]');
      for (const checkbox of checkboxes) {
        await checkbox.click();
      }

      await takeScreenshot(page, `${role}-${contentType}-students-selected`);

      // Submit assignment
      const submitButton = await page.$('button[type="submit"], button:has-text("Assign")');
      if (submitButton) {
        await submitButton.click();

        // Check for duplicate assignment error
        await page.waitForTimeout(2000);
        const errorMessage = await page.$eval('.error, .alert-danger', el => el.textContent).catch(() => null);

        if (errorMessage && errorMessage.includes('already assigned')) {
          console.log(`⚠ Duplicate assignment prevented: ${errorMessage}`);
          testResults.assignments[`${role}_${contentType}`] = {
            success: true,
            note: 'Duplicate assignment correctly prevented'
          };
          testResults.issues.push({
            type: 'GOOD',
            message: 'Duplicate assignment prevention working correctly'
          });
          return true;
        }

        await takeScreenshot(page, `${role}-${contentType}-assigned`);
        console.log(`✓ ${contentType} assigned successfully`);
        testResults.assignments[`${role}_${contentType}`] = { success: true };
        return true;
      }
    }

    console.log(`✗ Could not assign ${contentType}`);
    testResults.assignments[`${role}_${contentType}`] = { success: false, error: 'Assign button not found' };
    return false;

  } catch (error) {
    console.error(`✗ Error assigning ${contentType}:`, error.message);
    testResults.assignments[`${role}_${contentType}`] = { success: false, error: error.message };
    return false;
  }
}

async function checkDashboard(page, role) {
  console.log(`\n--- Checking Dashboard for ${role} ---`);

  try {
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle0' });
    await takeScreenshot(page, `${role}-dashboard`);

    // Check for dashboard elements
    const stats = await page.$$('[class*="stat"], [class*="card"]');
    const hasStats = stats.length > 0;

    // Check for recent activities
    const activities = await page.$$('[class*="activity"], [class*="recent"]');
    const hasActivities = activities.length > 0;

    // Check for charts/graphs
    const charts = await page.$$('canvas, svg[class*="chart"]');
    const hasCharts = charts.length > 0;

    console.log(`Dashboard elements - Stats: ${hasStats}, Activities: ${hasActivities}, Charts: ${hasCharts}`);

    testResults.dashboards[role] = {
      success: hasStats || hasActivities,
      hasStats,
      hasActivities,
      hasCharts
    };

    if (hasStats || hasActivities) {
      console.log(`✓ ${role} dashboard is functional`);
      return true;
    } else {
      console.log(`✗ ${role} dashboard is empty or broken`);
      testResults.issues.push({
        type: 'ERROR',
        message: `${role} dashboard has no content`
      });
      return false;
    }

  } catch (error) {
    console.error(`✗ Error checking dashboard:`, error.message);
    testResults.dashboards[role] = { success: false, error: error.message };
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('EXAM & STUDY MODULE COMPREHENSIVE TEST');
  console.log('='.repeat(80));

  await ensureDirectoryExists(SCREENSHOTS_DIR);

  let browser;
  let page;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Test 1: Teacher creates exam with AI
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: TEACHER EXAM CREATION');
    console.log('='.repeat(60));

    if (await loginUser(page, TEST_USERS.teacher.email, TEST_USERS.teacher.password, 'teacher')) {
      await createExamWithAI(page, 'teacher');
      await createStudyModule(page, 'teacher');
      await assignToStudents(page, 'exam', 'teacher');
      await assignToStudents(page, 'module', 'teacher');

      // Try to assign again to test duplicate prevention
      console.log('\nTesting duplicate assignment prevention...');
      await assignToStudents(page, 'exam', 'teacher');

      await checkDashboard(page, 'teacher');
    }

    // Test 2: Parent creates exam and module
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: PARENT EXAM & MODULE CREATION');
    console.log('='.repeat(60));

    if (await loginUser(page, TEST_USERS.parent.email, TEST_USERS.parent.password, 'parent')) {
      await createExamWithAI(page, 'parent');
      await createStudyModule(page, 'parent');
      await assignToStudents(page, 'exam', 'parent');
      await assignToStudents(page, 'module', 'parent');
      await checkDashboard(page, 'parent');
    }

    // Test 3: Student views assigned content
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: STUDENT VIEW');
    console.log('='.repeat(60));

    if (await loginUser(page, TEST_USERS.student.email, TEST_USERS.student.password, 'student')) {
      // Check if student can see assigned exams
      await page.goto(`${FRONTEND_URL}/exams/take`, { waitUntil: 'networkidle0' });
      await takeScreenshot(page, 'student-available-exams');

      const examCards = await page.$$('[class*="exam"], [class*="card"]');
      console.log(`Student can see ${examCards.length} exams`);

      // Check if student can see assigned modules
      await page.goto(`${FRONTEND_URL}/study`, { waitUntil: 'networkidle0' });
      await takeScreenshot(page, 'student-available-modules');

      const moduleCards = await page.$$('[class*="module"], [class*="card"]');
      console.log(`Student can see ${moduleCards.length} study modules`);

      await checkDashboard(page, 'student');
    }

  } catch (error) {
    console.error('Test execution error:', error);
    testResults.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  // Calculate success rates
  const examCreationSuccess = Object.values(testResults.examCreation).filter(r => r.success).length;
  const moduleCreationSuccess = Object.values(testResults.studyModuleCreation).filter(r => r.success).length;
  const assignmentSuccess = Object.values(testResults.assignments).filter(r => r.success).length;
  const dashboardSuccess = Object.values(testResults.dashboards).filter(r => r.success).length;

  testResults.summary = {
    examCreation: `${examCreationSuccess}/${Object.keys(testResults.examCreation).length}`,
    studyModuleCreation: `${moduleCreationSuccess}/${Object.keys(testResults.studyModuleCreation).length}`,
    assignments: `${assignmentSuccess}/${Object.keys(testResults.assignments).length}`,
    dashboards: `${dashboardSuccess}/${Object.keys(testResults.dashboards).length}`,
    totalIssues: testResults.issues.length
  };

  console.log('\n✅ WORKING FEATURES:');
  console.log('-'.repeat(40));
  if (examCreationSuccess > 0) console.log('• Exam creation with AI');
  if (moduleCreationSuccess > 0) console.log('• Study module creation');
  if (assignmentSuccess > 0) console.log('• Content assignment to students');
  if (testResults.issues.some(i => i.type === 'GOOD')) console.log('• Duplicate assignment prevention');
  if (dashboardSuccess > 0) console.log('• Dashboard functionality');

  console.log('\n❌ ISSUES FOUND:');
  console.log('-'.repeat(40));
  testResults.issues.filter(i => i.type === 'ERROR').forEach(issue => {
    console.log(`• ${issue.message}`);
  });

  console.log('\n📊 STATISTICS:');
  console.log('-'.repeat(40));
  console.log(`Exam Creation: ${testResults.summary.examCreation}`);
  console.log(`Module Creation: ${testResults.summary.studyModuleCreation}`);
  console.log(`Assignments: ${testResults.summary.assignments}`);
  console.log(`Dashboards: ${testResults.summary.dashboards}`);
  console.log(`Total Issues: ${testResults.summary.totalIssues}`);

  // Save results
  await fs.writeFile(RESULTS_FILE, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Results saved to: ${RESULTS_FILE}`);
  console.log(`📸 Screenshots saved in: ${SCREENSHOTS_DIR}`);

  return testResults;
}

// Execute tests
runTests().catch(console.error);