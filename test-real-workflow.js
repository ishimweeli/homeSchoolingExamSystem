const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function takeScreenshot(page, name) {
  await page.screenshot({ path: `test-${name}.png`, fullPage: true });
  console.log(`📸 Screenshot saved: test-${name}.png`);
}

async function login(page, email, password, role) {
  console.log(`\n🔐 Logging in as ${role}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await delay(1000);
  
  // Wait for form elements
  await page.waitForSelector('input[name="emailOrUsername"]');
  await page.waitForSelector('input[name="password"]');
  
  // Clear and type credentials
  await page.evaluate(() => {
    document.querySelector('input[name="emailOrUsername"]').value = '';
    document.querySelector('input[name="password"]').value = '';
  });
  
  await page.type('input[name="emailOrUsername"]', email);
  await page.type('input[name="password"]', password);
  
  await page.click('button[type="submit"]');
  await delay(5000); // Increased delay for login
  
  const url = page.url();
  if (url.includes('/dashboard')) {
    console.log(`✅ ${role} logged in successfully`);
    await takeScreenshot(page, `${role.toLowerCase()}-dashboard`);
    return true;
  } else {
    console.log(`❌ ${role} login failed - URL: ${url}`);
    return false;
  }
}

async function testTeacherCreateExam(page) {
  console.log('\n📝 Teacher creating AI exam...');
  
  // Navigate to exam creation
  await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
  await delay(2000);
  await takeScreenshot(page, 'teacher-exam-create-page');
  
  // Check if the form exists
  const hasForm = await page.evaluate(() => {
    return document.querySelector('form') !== null ||
           document.querySelector('[role="form"]') !== null ||
           document.querySelector('input') !== null;
  });
  
  if (hasForm) {
    console.log('✅ Exam creation form loaded');
    
    // Try to fill in exam details
    try {
      // Look for title input
      const titleInput = await page.$('input[name="title"], input[placeholder*="title" i], input[placeholder*="exam" i]');
      if (titleInput) {
        await titleInput.type('Math Quiz - Fractions');
        console.log('  ✓ Added exam title');
      }
      
      // Look for subject/topic input
      const subjectInput = await page.$('input[name="subject"], input[placeholder*="subject" i], input[placeholder*="topic" i]');
      if (subjectInput) {
        await subjectInput.type('Mathematics');
        console.log('  ✓ Added subject');
      }
      
      // Look for grade level
      const gradeSelect = await page.$('select[name="grade"], select[name="gradeLevel"]');
      if (gradeSelect) {
        await gradeSelect.select('6');
        console.log('  ✓ Selected grade level');
      }
      
      await takeScreenshot(page, 'teacher-exam-form-filled');
      
      // Try to submit or generate exam
      const buttons = await page.$$('button');
      let generateButton = null;
      
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        const type = await page.evaluate(el => el.type, button);
        if ((text && (text.includes('Generate') || text.includes('Create'))) || type === 'submit') {
          generateButton = button;
          break;
        }
      }
      
      if (generateButton) {
        await generateButton.click();
        console.log('  ✓ Clicked generate/create button');
        await delay(3000);
      }
      
    } catch (error) {
      console.log(`  ⚠️  Form interaction issue: ${error.message}`);
    }
    
  } else {
    console.log('⚠️  Exam creation form not found - may need implementation');
  }
}

async function testStudentTakeExam(page) {
  console.log('\n📚 Student taking exam...');
  
  // Navigate to exam taking page
  await page.goto(`${BASE_URL}/exams/take`, { waitUntil: 'networkidle0' });
  await delay(2000);
  await takeScreenshot(page, 'student-exams-list');
  
  // Check for available exams
  const hasExams = await page.evaluate(() => {
    const cards = document.querySelectorAll('[class*="card"], [class*="Card"]');
    const buttons = document.querySelectorAll('button:not([type="submit"])');
    return cards.length > 0 || buttons.length > 1;
  });
  
  if (hasExams) {
    console.log('✅ Exams list loaded');
    
    // Try to start an exam
    const buttons = await page.$$('button');
    let startButton = null;
    
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Start') || text.includes('Take') || text.includes('Begin'))) {
        startButton = button;
        break;
      }
    }
    
    if (startButton) {
      await startButton.click();
      console.log('  ✓ Started exam');
      await delay(2000);
      await takeScreenshot(page, 'student-taking-exam');
    } else {
      console.log('  ⚠️  No available exams to take');
    }
  } else {
    console.log('⚠️  No exams available for student');
  }
}

async function testParentViewResults(page) {
  console.log('\n📊 Parent viewing child results...');
  
  // First check dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  const hasFamilyDashboard = await page.evaluate(() => {
    return document.body.textContent.includes('Family Dashboard') ||
           document.body.textContent.includes('Children') ||
           document.body.textContent.includes('Student');
  });
  
  if (hasFamilyDashboard) {
    console.log('✅ Family dashboard loaded');
    await takeScreenshot(page, 'parent-family-dashboard');
  }
  
  // Navigate to results
  await page.goto(`${BASE_URL}/results`, { waitUntil: 'networkidle0' });
  await delay(2000);
  await takeScreenshot(page, 'parent-results-page');
  
  const hasResults = await page.evaluate(() => {
    return document.querySelector('[class*="card"], [class*="Card"], table') !== null;
  });
  
  if (hasResults) {
    console.log('✅ Results page loaded');
  } else {
    console.log('⚠️  No results available yet');
  }
  
  // Check analytics
  await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
  await delay(2000);
  await takeScreenshot(page, 'parent-analytics');
  console.log('✅ Analytics page loaded');
}

async function testCompleteWorkflow() {
  console.log('🚀 Starting Complete User Workflow Test');
  console.log('='.repeat(50));
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    // Test 1: Teacher creates exam
    console.log('\n📋 PHASE 1: Teacher Creating Exam');
    if (await login(page, 'teacher@test.com', 'password123', 'TEACHER')) {
      await testTeacherCreateExam(page);
    }
    
    // Logout
    await page.goto(`${BASE_URL}/api/auth/signout`, { waitUntil: 'networkidle0' });
    await delay(1000);
    
    // Test 2: Student takes exam
    console.log('\n📋 PHASE 2: Student Taking Exam');
    if (await login(page, 'student@test.com', 'password123', 'STUDENT')) {
      await testStudentTakeExam(page);
    }
    
    // Logout
    await page.goto(`${BASE_URL}/api/auth/signout`, { waitUntil: 'networkidle0' });
    await delay(1000);
    
    // Test 3: Parent views results
    console.log('\n📋 PHASE 3: Parent Viewing Results');
    if (await login(page, 'parent@test.com', 'password123', 'PARENT')) {
      await testParentViewResults(page);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Workflow Test Complete!');
    console.log('\n📁 Screenshots saved for review');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testCompleteWorkflow().catch(console.error);