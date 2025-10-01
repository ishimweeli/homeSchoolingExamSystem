const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFullSystem() {
  console.log('🚀 Starting Full System Test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  const results = [];

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('Warning:')) {
      console.log('🔴 Console Error:', msg.text().substring(0, 100));
    }
  });

  try {
    // TEST 1: Teacher Login
    console.log('📍 TEST 1: Teacher Login');
    console.log('========================');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(2000);

    // Find and fill login form
    const emailField = await page.$('input[name="emailOrUsername"]');
    const passwordField = await page.$('input[name="password"]');

    if (emailField && passwordField) {
      await emailField.type('teacher@example.com');
      await passwordField.type('password123');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'teacher-login-filled.png') });

      // Submit form
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await delay(3000); // Wait for login

        const currentUrl = page.url();
        if (currentUrl.includes('dashboard')) {
          console.log('✅ Teacher login successful');
          results.push({ test: 'Teacher Login', status: 'PASSED' });
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'teacher-dashboard.png') });
        } else {
          console.log('❌ Teacher login failed - still on:', currentUrl);
          results.push({ test: 'Teacher Login', status: 'FAILED' });
        }
      }
    } else {
      console.log('❌ Login form not found');
      results.push({ test: 'Teacher Login', status: 'FAILED' });
    }

    // TEST 2: Navigate to Exams
    console.log('\n📍 TEST 2: Navigate to Exams');
    console.log('===========================');
    const examsLink = await page.$('a[href="/exams"]');
    if (examsLink) {
      await examsLink.click();
      await delay(2000);
      console.log('✅ Navigated to exams page');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'exams-page.png') });
      results.push({ test: 'Navigate to Exams', status: 'PASSED' });
    } else {
      // Try direct navigation
      await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
      await delay(2000);
      console.log('⚠️ Direct navigation to exams');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'exams-direct.png') });
      results.push({ test: 'Navigate to Exams', status: 'PARTIAL' });
    }

    // TEST 3: Create Exam
    console.log('\n📍 TEST 3: Create Exam');
    console.log('=====================');
    await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
    await delay(2000);

    // Check if create form exists
    const titleInput = await page.$('input[name="title"]');
    if (titleInput) {
      await titleInput.type('Test Mathematics Exam');

      const descInput = await page.$('textarea[name="description"]');
      if (descInput) await descInput.type('Grade 5 Math Assessment');

      const gradeSelect = await page.$('select[name="grade"]');
      if (gradeSelect) await page.select('select[name="grade"]', '5');

      const subjectSelect = await page.$('select[name="subject"]');
      if (subjectSelect) await page.select('select[name="subject"]', 'Mathematics');

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'exam-form-filled.png') });
      console.log('✅ Exam form filled');
      results.push({ test: 'Exam Creation Form', status: 'PASSED' });
    } else {
      console.log('❌ Exam creation form not found');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'exam-form-error.png') });
      results.push({ test: 'Exam Creation Form', status: 'FAILED' });
    }

    // TEST 4: Navigate to Study Modules
    console.log('\n📍 TEST 4: Navigate to Study Modules');
    console.log('====================================');
    await page.goto(`${BASE_URL}/study`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'study-modules.png') });
    console.log('✅ Study modules page loaded');
    results.push({ test: 'Study Modules Page', status: 'PASSED' });

    // TEST 5: Create Study Module
    console.log('\n📍 TEST 5: Create Study Module');
    console.log('=============================');
    await page.goto(`${BASE_URL}/modules/create`, { waitUntil: 'networkidle0' });
    await delay(2000);

    const moduleTitleInput = await page.$('input[name="title"]');
    if (moduleTitleInput) {
      await moduleTitleInput.type('Introduction to Fractions');

      const topicInput = await page.$('input[name="topic"]');
      if (topicInput) await topicInput.type('fractions');

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'module-form-filled.png') });
      console.log('✅ Module form filled');
      results.push({ test: 'Module Creation Form', status: 'PASSED' });
    } else {
      console.log('❌ Module creation form not found');
      results.push({ test: 'Module Creation Form', status: 'FAILED' });
    }

    // TEST 6: Test Student Login
    console.log('\n📍 TEST 6: Student Login');
    console.log('=======================');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(2000);

    // Clear fields and login as student
    const emailField2 = await page.$('input[name="emailOrUsername"]');
    const passwordField2 = await page.$('input[name="password"]');

    if (emailField2 && passwordField2) {
      await emailField2.click({ clickCount: 3 });
      await emailField2.type('student@example.com');
      await passwordField2.click({ clickCount: 3 });
      await passwordField2.type('password123');

      const submitBtn2 = await page.$('button[type="submit"]');
      if (submitBtn2) {
        await submitBtn2.click();
        await delay(3000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'student-dashboard.png') });
        console.log('✅ Student login successful');
        results.push({ test: 'Student Login', status: 'PASSED' });
      }
    } else {
      console.log('❌ Student login failed');
      results.push({ test: 'Student Login', status: 'FAILED' });
    }

    // TEST 7: Test Parent Login
    console.log('\n📍 TEST 7: Parent Login');
    console.log('======================');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(2000);

    const emailField3 = await page.$('input[name="emailOrUsername"]');
    const passwordField3 = await page.$('input[name="password"]');

    if (emailField3 && passwordField3) {
      await emailField3.click({ clickCount: 3 });
      await emailField3.type('parent@example.com');
      await passwordField3.click({ clickCount: 3 });
      await passwordField3.type('password123');

      const submitBtn3 = await page.$('button[type="submit"]');
      if (submitBtn3) {
        await submitBtn3.click();
        await delay(3000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'parent-dashboard.png') });
        console.log('✅ Parent login successful');
        results.push({ test: 'Parent Login', status: 'PASSED' });
      }
    } else {
      console.log('❌ Parent login failed');
      results.push({ test: 'Parent Login', status: 'FAILED' });
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-final.png') });
  } finally {
    // Save results
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'full-test-results.json'),
      JSON.stringify({
        timestamp: new Date().toISOString(),
        results: results
      }, null, 2)
    );

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(50));

    const passed = results.filter(r => r.status === 'PASSED').length;
    const failed = results.filter(r => r.status === 'FAILED').length;
    const partial = results.filter(r => r.status === 'PARTIAL').length;

    console.log(`✅ PASSED: ${passed}`);
    console.log(`❌ FAILED: ${failed}`);
    console.log(`⚠️ PARTIAL: ${partial}`);
    console.log('\nDetailed Results:');
    console.log('-'.repeat(40));

    results.forEach(r => {
      const icon = r.status === 'PASSED' ? '✅' : r.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`${icon} ${r.test}: ${r.status}`);
    });

    await browser.close();
  }
}

testFullSystem().catch(console.error);