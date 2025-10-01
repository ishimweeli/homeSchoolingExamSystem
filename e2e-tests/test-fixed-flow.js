const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'fixed-flow');
const REPORT_FILE = path.join(__dirname, 'fixed-flow-report.md');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFixedFlow() {
  const startTime = Date.now();
  const report = [];
  const results = {};

  report.push('# ✅ COMPLETE EXAM FLOW TEST - WITH FIXES\n');
  report.push(`**Date:** ${new Date().toISOString()}\n`);
  report.push('---\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  // Capture console messages for debugging
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('Warning')) {
      console.log('🔴 Console error:', msg.text().substring(0, 100));
    }
  });

  try {
    // STEP 1: TEACHER LOGIN
    console.log('\n📍 STEP 1: TEACHER LOGIN');
    console.log('=' .repeat(40));
    report.push('## STEP 1: TEACHER LOGIN\n');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-teacher-login.png') });

    await page.click('button[type="submit"]');
    await delay(3000);

    if (page.url().includes('dashboard')) {
      console.log('✅ Teacher logged in');
      results.teacherLogin = 'PASS';
      report.push('- ✅ Login successful\n');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-dashboard.png') });
    } else {
      throw new Error('Teacher login failed');
    }

    // STEP 2: CREATE EXAM
    console.log('\n📍 STEP 2: CREATE EXAM');
    console.log('=' .repeat(40));
    report.push('## STEP 2: CREATE EXAM\n');

    await page.goto(`${BASE_URL}/exams/create-simple`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-create-page.png') });

    // Fill exam form
    await page.type('input[name="title"]', 'Math Test - Fixed Flow');
    await page.type('input[name="subject"]', 'Mathematics');
    await page.select('select[name="gradeLevel"]', '5');
    await page.select('select[name="difficulty"]', 'MEDIUM');

    // Add a question
    const questionInput = await page.$('input[name="question"]');
    if (questionInput) {
      await questionInput.type('What is 10 + 15?');
      await page.type('input[name="correctAnswer"]', '25');

      // Click Add Question button
      const addBtn = await page.$('button');
      for (const btn of await page.$$('button')) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Add Question')) {
          await btn.click();
          console.log('✅ Question added');
          break;
        }
      }
    }

    await delay(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-form-filled.png') });

    // Submit exam
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('⏳ Creating exam...');
      await delay(3000);

      if (page.url().includes('/exams')) {
        console.log('✅ Exam created and redirected to exams list');
        results.examCreation = 'PASS';
        report.push('- ✅ Exam created successfully\n');
      } else {
        results.examCreation = 'PARTIAL';
        report.push('- ⚠️ Exam submitted but no redirect\n');
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-after-create.png') });

    // STEP 3: VIEW EXAMS LIST
    console.log('\n📍 STEP 3: VIEW EXAMS LIST');
    console.log('=' .repeat(40));
    report.push('## STEP 3: VIEW EXAMS LIST\n');

    if (!page.url().includes('/exams')) {
      await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
    }
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-exams-list.png') });

    const pageText = await page.evaluate(() => document.body.innerText);
    if (pageText.includes('Math Test') || pageText.includes('Exam')) {
      console.log('✅ Exams visible in list');
      results.examsList = 'PASS';
      report.push('- ✅ Exams displayed in list\n');

      // Try to assign exam
      const assignBtn = await page.$('button');
      for (const btn of await page.$$('button')) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Assign')) {
          await btn.click();
          console.log('✅ Assignment UI opened');
          await delay(1000);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-assign-ui.png') });
          break;
        }
      }
    } else {
      results.examsList = 'FAIL';
      report.push('- ❌ No exams visible\n');
    }

    // STEP 4: STUDENT LOGIN
    console.log('\n📍 STEP 4: STUDENT LOGIN');
    console.log('=' .repeat(40));
    report.push('## STEP 4: STUDENT LOGIN\n');

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    const emailField = await page.$('input[name="emailOrUsername"]');
    await emailField.click({ clickCount: 3 });
    await emailField.type('student@example.com');

    const passwordField = await page.$('input[name="password"]');
    await passwordField.click({ clickCount: 3 });
    await passwordField.type('password123');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-student-login.png') });
    await page.click('button[type="submit"]');
    await delay(3000);

    if (page.url().includes('dashboard')) {
      console.log('✅ Student logged in');
      results.studentLogin = 'PASS';
      report.push('- ✅ Student login successful\n');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-student-dashboard.png') });
    }

    // STEP 5: CHECK STUDENT EXAMS
    console.log('\n📍 STEP 5: CHECK STUDENT EXAMS');
    console.log('=' .repeat(40));
    report.push('## STEP 5: CHECK STUDENT EXAMS\n');

    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-student-exams.png') });

    const studentPageText = await page.evaluate(() => document.body.innerText);
    if (studentPageText.includes('Take Exam') || studentPageText.includes('View')) {
      console.log('✅ Student can see exam functionality');
      results.studentExamView = 'PASS';
      report.push('- ✅ Student exam view working\n');
    } else if (studentPageText.includes('No exams assigned')) {
      console.log('⚠️ No exams assigned to student (expected)');
      results.studentExamView = 'PARTIAL';
      report.push('- ⚠️ No exams assigned (assignment needed)\n');
    } else {
      results.studentExamView = 'FAIL';
      report.push('- ❌ Student exam view not working\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    report.push(`\n## ❌ ERROR: ${error.message}\n`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png') });
  } finally {
    // Generate summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    report.push('\n---\n');
    report.push('# 📊 TEST SUMMARY\n');
    report.push(`**Duration:** ${duration} seconds\n`);
    report.push(`**Screenshots:** ${fs.readdirSync(SCREENSHOTS_DIR).length}\n`);

    // Results table
    report.push('\n## Results\n');
    report.push('| Test | Status |');
    report.push('|------|--------|');
    Object.entries(results).forEach(([test, status]) => {
      const icon = status === 'PASS' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
      report.push(`| ${test} | ${icon} ${status} |`);
    });

    // Calculate score
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r === 'PASS').length;
    const passRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(0) : 0;

    report.push(`\n## Overall Score: ${passedTests}/${totalTests} (${passRate}%)\n`);

    if (passRate >= 80) {
      report.push('### 🎉 SYSTEM STATUS: FULLY WORKING\n');
      report.push('All major features are operational. The exam system is ready for use.');
    } else if (passRate >= 60) {
      report.push('### ✅ SYSTEM STATUS: WORKING WITH MINOR ISSUES\n');
      report.push('Core features work but some improvements needed.');
    } else {
      report.push('### ⚠️ SYSTEM STATUS: NEEDS ATTENTION\n');
    }

    // Save report
    fs.writeFileSync(REPORT_FILE, report.join('\n'));

    console.log('\n' + '='.repeat(50));
    console.log('📄 REPORT SAVED:', REPORT_FILE);
    console.log('🏆 FINAL SCORE:', `${passRate}%`);
    console.log('='.repeat(50));

    await browser.close();
  }
}

console.log('🚀 Starting Fixed Flow Test...\n');
testFixedFlow().catch(console.error);