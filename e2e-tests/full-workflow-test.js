const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const FRONTEND_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = 'e2e-tests/screenshots-workflow';
const RESULTS_FILE = 'e2e-tests/workflow-results.json';

// Test credentials
const TEACHER = { email: 'teacher@test.com', password: 'password123' };
const PARENT = { email: 'parent@test.com', password: 'password123' };
const STUDENT = { email: 'student@test.com', password: 'password123' };

let browser, page;
let testResults = {
  timestamp: new Date().toISOString(),
  tests: [],
  screenshots: [],
  summary: { passed: 0, failed: 0 }
};

async function setup() {
  // Create screenshots directory
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  // Launch browser
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
}

async function takeScreenshot(name) {
  const filename = `${SCREENSHOTS_DIR}/${Date.now()}-${name}.png`;
  await page.screenshot({ path: filename, fullPage: true });
  testResults.screenshots.push({ name, filename });
  console.log(`  📸 Screenshot: ${name}`);
  return filename;
}

async function login(role, credentials) {
  console.log(`\n--- Testing ${role} Login ---`);

  try {
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await takeScreenshot(`${role}-login-page`);

    // Try different login selectors
    const emailSelectors = ['input[name="email"]', 'input[type="email"]', '#email', 'input[placeholder*="email" i]'];
    const passwordSelectors = ['input[name="password"]', 'input[type="password"]', '#password', 'input[placeholder*="password" i]'];

    let emailInput, passwordInput;

    for (const selector of emailSelectors) {
      emailInput = await page.$(selector);
      if (emailInput) break;
    }

    for (const selector of passwordSelectors) {
      passwordInput = await page.$(selector);
      if (passwordInput) break;
    }

    if (!emailInput || !passwordInput) {
      // Try username field if email not found
      const usernameSelectors = ['input[name="username"]', 'input[name="emailOrUsername"]', '#username'];
      for (const selector of usernameSelectors) {
        emailInput = await page.$(selector);
        if (emailInput) break;
      }
    }

    if (emailInput && passwordInput) {
      await emailInput.type(credentials.email);
      await passwordInput.type(credentials.password);
      await takeScreenshot(`${role}-credentials-entered`);

      // Find and click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign in")',
        'input[type="submit"]'
      ];

      for (const selector of submitSelectors) {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          break;
        }
      }

      // Wait for navigation or dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      await takeScreenshot(`${role}-after-login`);

      if (currentUrl.includes('dashboard') || currentUrl !== `${FRONTEND_URL}/login`) {
        console.log(`✅ ${role} login successful`);
        return true;
      }
    }

    console.log(`⚠️ ${role} login failed - could not find form elements`);
    return false;

  } catch (error) {
    console.log(`❌ ${role} login error:`, error.message);
    await takeScreenshot(`${role}-login-error`);
    return false;
  }
}

async function testTeacherWorkflow() {
  console.log('\n' + '='.repeat(60));
  console.log('TEACHER WORKFLOW');
  console.log('='.repeat(60));

  if (!await login('Teacher', TEACHER)) return;

  try {
    // Check dashboard
    console.log('\n--- Teacher Dashboard ---');
    await takeScreenshot('teacher-dashboard');

    // Navigate to exams
    const examLinks = await page.$$('a[href*="exam"], button:has-text("Exams")');
    if (examLinks.length > 0) {
      await examLinks[0].click();
      await page.waitForTimeout(2000);
      await takeScreenshot('teacher-exams-page');
      console.log('✅ Exams page loaded');
    }

    // Navigate to study modules
    await page.goto(`${FRONTEND_URL}/study`, { waitUntil: 'networkidle0' });
    await takeScreenshot('teacher-study-modules');
    console.log('✅ Study modules page loaded');

    // Navigate to students
    await page.goto(`${FRONTEND_URL}/students`, { waitUntil: 'networkidle0' });
    await takeScreenshot('teacher-students');
    console.log('✅ Students page loaded');

    testResults.tests.push({ name: 'Teacher Workflow', status: 'passed' });
    testResults.summary.passed++;

  } catch (error) {
    console.log('❌ Teacher workflow error:', error.message);
    testResults.tests.push({ name: 'Teacher Workflow', status: 'failed', error: error.message });
    testResults.summary.failed++;
  }
}

async function testParentWorkflow() {
  console.log('\n' + '='.repeat(60));
  console.log('PARENT WORKFLOW');
  console.log('='.repeat(60));

  if (!await login('Parent', PARENT)) return;

  try {
    // Check family dashboard
    console.log('\n--- Parent Dashboard ---');
    await takeScreenshot('parent-dashboard');

    // Check children view
    const childrenLinks = await page.$$('a[href*="children"], button:has-text("Children")');
    if (childrenLinks.length > 0) {
      await childrenLinks[0].click();
      await page.waitForTimeout(2000);
      await takeScreenshot('parent-children');
      console.log('✅ Children page loaded');
    }

    // Check results
    await page.goto(`${FRONTEND_URL}/results`, { waitUntil: 'networkidle0' });
    await takeScreenshot('parent-results');
    console.log('✅ Results page loaded');

    testResults.tests.push({ name: 'Parent Workflow', status: 'passed' });
    testResults.summary.passed++;

  } catch (error) {
    console.log('❌ Parent workflow error:', error.message);
    testResults.tests.push({ name: 'Parent Workflow', status: 'failed', error: error.message });
    testResults.summary.failed++;
  }
}

async function testStudentWorkflow() {
  console.log('\n' + '='.repeat(60));
  console.log('STUDENT WORKFLOW');
  console.log('='.repeat(60));

  if (!await login('Student', STUDENT)) return;

  try {
    // Check student dashboard
    console.log('\n--- Student Dashboard ---');
    await takeScreenshot('student-dashboard');

    // Check assigned exams
    await page.goto(`${FRONTEND_URL}/exams/take`, { waitUntil: 'networkidle0' });
    await takeScreenshot('student-exams');
    console.log('✅ Student exams page loaded');

    // Check study modules
    await page.goto(`${FRONTEND_URL}/study`, { waitUntil: 'networkidle0' });
    await takeScreenshot('student-study');
    console.log('✅ Student study page loaded');

    testResults.tests.push({ name: 'Student Workflow', status: 'passed' });
    testResults.summary.passed++;

  } catch (error) {
    console.log('❌ Student workflow error:', error.message);
    testResults.tests.push({ name: 'Student Workflow', status: 'failed', error: error.message });
    testResults.summary.failed++;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('COMPLETE WORKFLOW TEST');
  console.log('='.repeat(80));

  try {
    await setup();

    // Test each role
    await testTeacherWorkflow();
    await testParentWorkflow();
    await testStudentWorkflow();

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    if (browser) await browser.close();

    // Save results
    await fs.writeFile(RESULTS_FILE, JSON.stringify(testResults, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Passed: ${testResults.summary.passed}`);
    console.log(`❌ Failed: ${testResults.summary.failed}`);
    console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
    console.log(`📄 Results saved to: ${RESULTS_FILE}`);
  }
}

// Run the tests
runTests().catch(console.error);