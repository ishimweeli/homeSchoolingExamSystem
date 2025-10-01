const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function testTeacherFlow() {
  console.log('🚀 Starting Teacher Flow Test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  const results = {
    timestamp: Date.now(),
    tests: []
  };

  try {
    // Test 1: Navigate to login page
    console.log('📍 Test 1: Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-page.png') });
    results.tests.push({ name: 'Navigate to login', status: 'passed' });
    console.log('✅ Login page loaded\n');

    // Test 2: Login as teacher
    console.log('📍 Test 2: Logging in as teacher...');
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'teacher@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-login-filled.png') });

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-teacher-dashboard.png') });
    results.tests.push({ name: 'Teacher login', status: 'passed' });
    console.log('✅ Logged in successfully\n');

    // Test 3: Navigate to Exams page
    console.log('📍 Test 3: Navigating to Exams page...');
    await page.click('a[href="/exams"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-exams-page.png') });
    results.tests.push({ name: 'Navigate to exams', status: 'passed' });
    console.log('✅ Exams page loaded\n');

    // Test 4: Create new exam
    console.log('📍 Test 4: Creating new exam...');
    const createButton = await page.$('a[href="/exams/create"], button:has-text("Create Exam"), button:has-text("New Exam")');
    if (createButton) {
      await createButton.click();
      await page.waitForSelector('form', { timeout: 5000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-exam-create-form.png') });

      // Fill exam form
      await page.type('input[name="title"]', 'Test Math Exam');
      await page.type('textarea[name="description"]', 'This is a test exam for grade 5 mathematics');

      // Select grade
      const gradeSelect = await page.$('select[name="grade"]');
      if (gradeSelect) {
        await page.select('select[name="grade"]', '5');
      }

      // Select subject
      const subjectSelect = await page.$('select[name="subject"]');
      if (subjectSelect) {
        await page.select('select[name="subject"]', 'Mathematics');
      }

      await page.type('input[name="duration"]', '60');
      await page.type('textarea[name="topics"]', 'fractions, decimals, geometry');

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-exam-form-filled.png') });

      // Submit form
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-exam-created.png') });
      results.tests.push({ name: 'Create exam', status: 'passed' });
      console.log('✅ Exam created successfully\n');
    } else {
      console.log('⚠️ Create exam button not found\n');
      results.tests.push({ name: 'Create exam', status: 'failed', error: 'Button not found' });
    }

    // Test 5: Navigate to Study Modules
    console.log('📍 Test 5: Navigating to Study Modules...');
    await page.click('a[href="/study"]');
    await page.waitForSelector('h1', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-study-modules-page.png') });
    results.tests.push({ name: 'Navigate to study modules', status: 'passed' });
    console.log('✅ Study modules page loaded\n');

    // Test 6: Create new study module
    console.log('📍 Test 6: Creating new study module...');
    const createModuleButton = await page.$('a[href="/study/create"], button:has-text("Create Module"), button:has-text("New Module")');
    if (createModuleButton) {
      await createModuleButton.click();
      await page.waitForSelector('form', { timeout: 5000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-module-create-form.png') });

      // Fill module form
      await page.type('input[name="title"]', 'Introduction to Fractions');
      await page.type('textarea[name="description"]', 'Learn the basics of fractions with interactive exercises');
      await page.type('input[name="topic"]', 'fractions');

      const moduleGradeSelect = await page.$('select[name="gradeLevel"]');
      if (moduleGradeSelect) {
        await page.select('select[name="gradeLevel"]', '5');
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-module-form-filled.png') });

      // Submit form
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-module-created.png') });
      results.tests.push({ name: 'Create study module', status: 'passed' });
      console.log('✅ Study module created successfully\n');
    } else {
      console.log('⚠️ Create module button not found\n');
      results.tests.push({ name: 'Create study module', status: 'failed', error: 'Button not found' });
    }

    console.log('🎉 All tests completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png') });
    results.tests.push({ name: 'Error', status: 'failed', error: error.message });
  } finally {
    // Save results
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    results.tests.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} ${test.name}: ${test.status}`);
      if (test.error) console.log(`   Error: ${test.error}`);
    });

    await browser.close();
  }
}

// Run the test
testTeacherFlow().catch(console.error);