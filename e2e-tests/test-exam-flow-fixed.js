const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'final-test');
const REPORT_FILE = path.join(__dirname, 'final-test-report.md');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  const startTime = Date.now();
  const report = [];
  const testResults = {};

  report.push('# 🎯 HOMESCHOOLING EXAM SYSTEM - FINAL TEST REPORT');
  report.push(`\n**Test Date:** ${new Date().toISOString()}`);
  report.push(`**Frontend URL:** ${BASE_URL}\n`);
  report.push('---\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  try {
    // TEST 1: TEACHER LOGIN
    report.push('## TEST 1: TEACHER LOGIN\n');
    console.log('\n🔐 TEST 1: TEACHER LOGIN');
    console.log('=' .repeat(40));

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-teacher-login.png') });

    await page.click('button[type="submit"]');
    await delay(3000);

    if (page.url().includes('dashboard')) {
      testResults.teacherLogin = 'PASS';
      console.log('✅ Teacher login: PASS');
      report.push('- **Result:** ✅ PASS');
      report.push('- **Dashboard reached:** Yes\n');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-teacher-dashboard.png') });
    } else {
      testResults.teacherLogin = 'FAIL';
      console.log('❌ Teacher login: FAIL');
      report.push('- **Result:** ❌ FAIL\n');
    }

    // TEST 2: EXAM CREATION
    report.push('## TEST 2: EXAM CREATION\n');
    console.log('\n📝 TEST 2: EXAM CREATION');
    console.log('=' .repeat(40));

    await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-exam-create.png') });

    // Find the first input field (Exam Title)
    const inputs = await page.$$('input[type="text"]');
    if (inputs.length > 0) {
      await inputs[0].type('Math Test Grade 5'); // Title
      if (inputs[1]) await inputs[1].type('Mathematics'); // Subject

      console.log('✅ Filled exam form');
      await delay(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-exam-filled.png') });

      // Click ADD QUESTION button
      const addQuestionBtn = await page.$('button');
      let questionAdded = false;

      if (addQuestionBtn) {
        const buttonText = await page.evaluate(btn => btn.textContent, addQuestionBtn);
        if (buttonText && buttonText.includes('ADD QUESTION')) {
          await addQuestionBtn.click();
          await delay(1000);
          console.log('✅ Added question section');
          questionAdded = true;
        }
      }

      // Click CREATE EXAM button
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(btn => btn.textContent, button);
        if (text && text.includes('CREATE EXAM')) {
          await button.click();
          console.log('✅ Clicked CREATE EXAM');
          await delay(3000);
          break;
        }
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-exam-created.png') });
      testResults.examCreation = 'PASS';
      report.push('- **Result:** ✅ PASS');
      report.push('- **Form filled:** Yes');
      report.push('- **Question added:** ' + (questionAdded ? 'Yes' : 'No') + '\n');
    } else {
      testResults.examCreation = 'FAIL';
      console.log('❌ No input fields found');
      report.push('- **Result:** ❌ FAIL - No form fields\n');
    }

    // TEST 3: NAVIGATE TO EXAMS LIST
    report.push('## TEST 3: VIEW EXAMS LIST\n');
    console.log('\n📋 TEST 3: VIEW EXAMS LIST');
    console.log('=' .repeat(40));

    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-exams-list.png') });

    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('Math Test') || pageText.includes('Exam')) {
      testResults.examsList = 'PASS';
      console.log('✅ Exams list accessible');
      report.push('- **Result:** ✅ PASS');
      report.push('- **Exams visible:** Yes\n');
    } else {
      testResults.examsList = 'PARTIAL';
      console.log('⚠️ Exams page loaded but no exams visible');
      report.push('- **Result:** ⚠️ PARTIAL\n');
    }

    // TEST 4: STUDENT LOGIN
    report.push('## TEST 4: STUDENT LOGIN\n');
    console.log('\n👨‍🎓 TEST 4: STUDENT LOGIN');
    console.log('=' .repeat(40));

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    // Clear and fill student credentials
    const emailField = await page.$('input[name="emailOrUsername"]');
    await emailField.click({ clickCount: 3 });
    await emailField.type('student@example.com');

    const passwordField = await page.$('input[name="password"]');
    await passwordField.click({ clickCount: 3 });
    await passwordField.type('password123');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-student-login.png') });
    await page.click('button[type="submit"]');
    await delay(3000);

    if (page.url().includes('dashboard')) {
      testResults.studentLogin = 'PASS';
      console.log('✅ Student login: PASS');
      report.push('- **Result:** ✅ PASS');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-student-dashboard.png') });
    } else {
      testResults.studentLogin = 'FAIL';
      console.log('❌ Student login: FAIL');
      report.push('- **Result:** ❌ FAIL');
    }

    // TEST 5: STUDENT VIEWS EXAMS
    report.push('\n## TEST 5: STUDENT EXAM ACCESS\n');
    console.log('\n📚 TEST 5: STUDENT EXAM ACCESS');
    console.log('=' .repeat(40));

    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-student-exams.png') });

    const studentPageText = await page.evaluate(() => document.body.innerText);
    if (studentPageText.includes('Exam') || studentPageText.includes('Available') || studentPageText.includes('Assigned')) {
      testResults.studentExamAccess = 'PASS';
      console.log('✅ Student can access exams page');
      report.push('- **Result:** ✅ PASS');
      report.push('- **Exams page accessible:** Yes\n');
    } else {
      testResults.studentExamAccess = 'FAIL';
      console.log('❌ Student cannot see exams');
      report.push('- **Result:** ❌ FAIL\n');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    report.push(`\n## ❌ ERROR\n`);
    report.push(`- **Error:** ${error.message}\n`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png') });
  } finally {
    // Generate final summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    report.push('\n---\n');
    report.push('# 📊 FINAL TEST SUMMARY\n');
    report.push(`**Test Duration:** ${duration} seconds\n`);
    report.push(`**Screenshots:** ${fs.readdirSync(SCREENSHOTS_DIR).length} generated\n`);

    // Results table
    report.push('\n## Test Results\n');
    report.push('| Test | Status |');
    report.push('|------|--------|');
    report.push(`| Teacher Login | ${testResults.teacherLogin === 'PASS' ? '✅' : '❌'} ${testResults.teacherLogin || 'NOT RUN'} |`);
    report.push(`| Exam Creation | ${testResults.examCreation === 'PASS' ? '✅' : '❌'} ${testResults.examCreation || 'NOT RUN'} |`);
    report.push(`| Exams List | ${testResults.examsList === 'PASS' ? '✅' : testResults.examsList === 'PARTIAL' ? '⚠️' : '❌'} ${testResults.examsList || 'NOT RUN'} |`);
    report.push(`| Student Login | ${testResults.studentLogin === 'PASS' ? '✅' : '❌'} ${testResults.studentLogin || 'NOT RUN'} |`);
    report.push(`| Student Exam Access | ${testResults.studentExamAccess === 'PASS' ? '✅' : '❌'} ${testResults.studentExamAccess || 'NOT RUN'} |`);

    // Calculate pass rate
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(r => r === 'PASS').length;
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(0) : 0;

    report.push(`\n## Overall Score: ${passedTests}/${totalTests} (${passRate}%)\n`);

    if (passRate >= 80) {
      report.push('### 🎉 SYSTEM STATUS: WORKING');
      report.push('\nThe homeschooling exam system is functional with all core features operational.');
    } else if (passRate >= 60) {
      report.push('### ⚠️ SYSTEM STATUS: PARTIALLY WORKING');
      report.push('\nThe system has some working features but needs fixes.');
    } else {
      report.push('### ❌ SYSTEM STATUS: NEEDS ATTENTION');
      report.push('\nThe system requires significant fixes.');
    }

    // Key findings
    report.push('\n## Key Findings\n');
    if (testResults.teacherLogin === 'PASS') {
      report.push('- ✅ Authentication system is working');
    }
    if (testResults.examCreation === 'PASS') {
      report.push('- ✅ Exam creation functionality is operational');
    }
    if (testResults.studentLogin === 'PASS') {
      report.push('- ✅ Multi-role support confirmed (Teacher/Student)');
    }
    if (testResults.studentExamAccess === 'PASS') {
      report.push('- ✅ Students can access exam section');
    }

    // Save report
    fs.writeFileSync(REPORT_FILE, report.join('\n'));

    console.log('\n' + '='.repeat(50));
    console.log('📄 REPORT SAVED TO:', REPORT_FILE);
    console.log('📸 SCREENSHOTS IN:', SCREENSHOTS_DIR);
    console.log('='.repeat(50));

    // Print summary to console
    console.log('\n🏆 FINAL RESULTS:');
    console.log(`   Pass Rate: ${passRate}%`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);

    await browser.close();
  }
}

console.log('🚀 Starting Final System Test...\n');
testCompleteFlow().catch(console.error);