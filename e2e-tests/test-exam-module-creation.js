const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function testExamAndModuleCreation() {
  console.log('🚀 Testing Exam and Module Creation...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  // Track network requests
  page.on('response', response => {
    if (response.url().includes('/api/exams') || response.url().includes('/api/study')) {
      const status = response.status();
      const icon = status < 400 ? '✅' : '❌';
      console.log(`${icon} API: ${response.request().method()} ${response.url()} - ${status}`);
    }
  });

  try {
    // Login as teacher
    console.log('📍 STEP 1: Teacher Login');
    console.log('========================');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);

    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    if (page.url().includes('dashboard')) {
      console.log('✅ Logged in successfully\n');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'teacher-dashboard-exam-test.png') });
    } else {
      throw new Error('Login failed');
    }

    // TEST EXAM CREATION
    console.log('📍 STEP 2: Navigate to Exam Creation');
    console.log('====================================');
    await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'exam-create-page.png') });

    // Check what's on the page
    const pageContent = await page.evaluate(() => document.body.innerText);
    console.log('Page contains:', pageContent.substring(0, 100));

    // Look for exam form elements
    const examTitle = await page.$('input[name="title"]') ||
                      await page.$('input[placeholder*="title"]') ||
                      await page.$('input[placeholder*="Title"]');

    if (examTitle) {
      console.log('✅ Exam creation form found\n');

      console.log('📍 STEP 3: Fill Exam Details');
      console.log('============================');
      await examTitle.type('Mathematics Test Grade 5');

      // Try different selectors for other fields
      const description = await page.$('textarea[name="description"]') ||
                         await page.$('textarea');
      if (description) {
        await description.type('Testing fractions and decimals');
      }

      // Look for any AI generation button
      const aiButton = await page.$('button:has-text("Generate")') ||
                      await page.$('button:has-text("AI")') ||
                      await page.$('button[class*="ai"]');

      if (aiButton) {
        console.log('✅ Found AI generation button');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'exam-form-filled.png') });

        // Click AI generate
        await aiButton.click();
        console.log('⏳ Waiting for AI generation...');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'exam-after-generate.png') });
      } else {
        console.log('⚠️ AI button not found, trying manual creation');
      }
    } else {
      console.log('❌ Exam creation form not found\n');
    }

    // TEST STUDY MODULE CREATION
    console.log('\n📍 STEP 4: Navigate to Study Module Creation');
    console.log('===========================================');
    await page.goto(`${BASE_URL}/modules/create`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'module-create-page.png') });

    // Look for module form
    const moduleTitle = await page.$('input[name="title"]') ||
                       await page.$('input[placeholder*="title"]') ||
                       await page.$('input[placeholder*="Title"]');

    if (moduleTitle) {
      console.log('✅ Module creation form found\n');

      console.log('📍 STEP 5: Fill Module Details');
      console.log('==============================');
      await moduleTitle.type('Introduction to Fractions');

      const topic = await page.$('input[name="topic"]') ||
                   await page.$('input[placeholder*="topic"]');
      if (topic) {
        await topic.type('fractions, mathematics, grade 5');
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'module-form-filled.png') });

      // Look for generate button
      const generateBtn = await page.$('button:has-text("Generate")') ||
                         await page.$('button:has-text("Create")');

      if (generateBtn) {
        console.log('✅ Found generate/create button');
        await generateBtn.click();
        console.log('⏳ Waiting for module generation...');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'module-after-generate.png') });
      }
    } else {
      console.log('❌ Module creation form not found\n');
    }

    // TEST ALL ROLE DASHBOARDS
    console.log('\n📍 STEP 6: Test Student Dashboard');
    console.log('=================================');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);

    // Clear and login as student
    const emailField = await page.$('input[name="emailOrUsername"]');
    await emailField.click({ clickCount: 3 });
    await emailField.type('student@example.com');

    const passwordField = await page.$('input[name="password"]');
    await passwordField.click({ clickCount: 3 });
    await passwordField.type('password123');

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    if (page.url().includes('dashboard')) {
      console.log('✅ Student login successful');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'student-dashboard-test.png') });

      // Check for exams or modules
      const examsSection = await page.$('a[href="/exams"]') ||
                          await page.$(':has-text("Exams")');
      if (examsSection) {
        console.log('✅ Student can see exams section');
      }
    }

    console.log('\n📍 STEP 7: Test Parent Dashboard');
    console.log('================================');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(1000);

    const emailField2 = await page.$('input[name="emailOrUsername"]');
    await emailField2.click({ clickCount: 3 });
    await emailField2.type('parent@example.com');

    const passwordField2 = await page.$('input[name="password"]');
    await passwordField2.click({ clickCount: 3 });
    await passwordField2.type('password123');

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    if (page.url().includes('dashboard')) {
      console.log('✅ Parent login successful');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'parent-dashboard-test.png') });
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-exam-module.png') });
  } finally {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('Check screenshots folder for visual results');
    console.log('All tests completed!');

    await browser.close();
  }
}

testExamAndModuleCreation().catch(console.error);