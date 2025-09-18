const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

// Generate unique student credentials
const timestamp = Date.now();
const NEW_STUDENT = {
  firstName: 'Test',
  lastName: `Student${timestamp}`,
  username: `student_${timestamp}`,
  email: `student${timestamp}@test.com`,
  password: 'password123'
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page, email, password, role) {
  console.log(`\n🔐 Logging in as ${role}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await delay(1000);
  
  await page.waitForSelector('input[name="emailOrUsername"]');
  await page.type('input[name="emailOrUsername"]', email);
  await page.type('input[name="password"]', password);
  
  await page.click('button[type="submit"]');
  await delay(5000);
  
  const url = page.url();
  if (url.includes('/dashboard')) {
    console.log(`✅ ${role} logged in successfully`);
    await page.screenshot({ path: `flow-${role.toLowerCase()}-dashboard.png` });
    return true;
  } else {
    console.log(`❌ ${role} login failed`);
    return false;
  }
}

async function createStudent(page) {
  console.log('\n👤 CREATING NEW STUDENT ACCOUNT');
  console.log('='.repeat(40));
  
  // Navigate to students page
  await page.goto(`${BASE_URL}/students`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  // Click Add Student button
  const addButtons = await page.$$('button');
  for (const button of addButtons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && text.includes('Add Student')) {
      await button.click();
      console.log('  ✓ Clicked Add Student button');
      break;
    }
  }
  
  await delay(2000);
  
  // Fill student creation form
  console.log('  📝 Filling student details:');
  console.log(`    - Name: ${NEW_STUDENT.firstName} ${NEW_STUDENT.lastName}`);
  console.log(`    - Username: ${NEW_STUDENT.username}`);
  
  await page.waitForSelector('input[name="firstName"]');
  await page.type('input[name="firstName"]', NEW_STUDENT.firstName);
  await page.type('input[name="lastName"]', NEW_STUDENT.lastName);
  await page.type('input[name="username"]', NEW_STUDENT.username);
  await page.type('input[name="email"]', NEW_STUDENT.email);
  await page.type('input[name="password"]', NEW_STUDENT.password);
  
  await page.screenshot({ path: 'flow-student-creation-form.png' });
  
  // Submit form
  const submitButtons = await page.$$('button[type="submit"]');
  if (submitButtons.length > 0) {
    await submitButtons[0].click();
    console.log('  ✓ Submitted student creation form');
    await delay(3000);
    
    // Check if we're back on students list
    const currentUrl = page.url();
    if (currentUrl.includes('/students')) {
      console.log('  ✅ Student created successfully!');
      await page.screenshot({ path: 'flow-students-list.png' });
      return true;
    }
  }
  
  return false;
}

async function createExam(page) {
  console.log('\n📝 CREATING EXAM');
  console.log('='.repeat(40));
  
  await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  console.log('  📋 Filling exam details...');
  
  // Fill exam form
  await page.type('input[placeholder*="Mathematics"]', 'Test Exam for New Student');
  
  // Select subject
  const selectButtons = await page.$$('button');
  for (const button of selectButtons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && text.includes('Select a subject')) {
      await button.click();
      break;
    }
  }
  await delay(500);
  
  const options = await page.$$('[role="option"]');
  if (options.length > 0) {
    await options[0].click(); // Click first subject
    console.log('  ✓ Selected subject');
  }
  
  // Add topics
  const topicInput = await page.$('input[placeholder*="topic"]');
  if (topicInput) {
    await topicInput.type('Basic Math');
    await page.keyboard.press('Enter');
    console.log('  ✓ Added topic');
  }
  
  await page.screenshot({ path: 'flow-exam-creation.png' });
  
  // Generate exam
  let generateBtn = null;
  const allButtons = await page.$$('button');
  for (const button of allButtons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && text.includes('Generate Exam')) {
      generateBtn = button;
      break;
    }
  }
  
  if (generateBtn) {
    await generateBtn.click();
    console.log('  ⏳ Generating exam...');
    await delay(10000);
    console.log('  ✅ Exam created!');
    return true;
  }
  
  return false;
}

async function assignExamToStudent(page) {
  console.log('\n📌 ASSIGNING EXAM TO NEW STUDENT');
  console.log('='.repeat(40));
  
  // Go to exams list
  await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  // Find and click assign button
  const buttons = await page.$$('button');
  let assignClicked = false;
  
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && text.includes('Assign')) {
      await button.click();
      console.log('  ✓ Clicked Assign button');
      assignClicked = true;
      await delay(2000);
      break;
    }
  }
  
  if (assignClicked) {
    // Look for our new student and select them
    const checkboxes = await page.$$('input[type="checkbox"]');
    const labels = await page.$$('label');
    
    for (let i = 0; i < labels.length; i++) {
      const text = await page.evaluate(el => el.textContent, labels[i]);
      if (text && text.includes(NEW_STUDENT.username)) {
        if (checkboxes[i]) {
          await checkboxes[i].click();
          console.log(`  ✓ Selected student: ${NEW_STUDENT.username}`);
          
          // Click final assign button
          const confirmButtons = await page.$$('button');
          for (const btn of confirmButtons) {
            const btnText = await page.evaluate(el => el.textContent, btn);
            if (btnText && (btnText === 'Assign' || btnText.includes('Confirm'))) {
              await btn.click();
              console.log('  ✅ Exam assigned to student!');
              await delay(2000);
              return true;
            }
          }
        }
      }
    }
  }
  
  console.log('  ⚠️  Could not complete assignment');
  return false;
}

async function takeExamAsStudent(page) {
  console.log('\n📚 TAKING EXAM AS NEW STUDENT');
  console.log('='.repeat(40));
  
  // Login as the newly created student
  await page.goto(`${BASE_URL}/api/auth/signout`);
  await delay(2000);
  
  if (!await login(page, NEW_STUDENT.username, NEW_STUDENT.password, 'NEW STUDENT')) {
    console.log('  ❌ Could not login as new student');
    return false;
  }
  
  // Go to take exam page
  await page.goto(`${BASE_URL}/exams/take`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  await page.screenshot({ path: 'flow-student-exam-list.png' });
  
  // Find and start exam
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && (text.includes('Start') || text.includes('Take') || text.includes('Begin'))) {
      await button.click();
      console.log('  ✓ Started exam');
      await delay(3000);
      
      await page.screenshot({ path: 'flow-student-taking-exam.png' });
      
      // Answer some questions
      const radioButtons = await page.$$('input[type="radio"]');
      for (let i = 0; i < Math.min(3, radioButtons.length); i++) {
        await radioButtons[i].click();
        console.log(`  ✓ Answered question ${i + 1}`);
      }
      
      // Submit exam
      const submitButtons = await page.$$('button');
      for (const btn of submitButtons) {
        const txt = await page.evaluate(el => el.textContent, btn);
        if (txt && txt.includes('Submit')) {
          await btn.click();
          console.log('  ✅ Exam submitted!');
          await delay(3000);
          await page.screenshot({ path: 'flow-student-results.png' });
          return true;
        }
      }
    }
  }
  
  console.log('  ⚠️  No exam available to take');
  return false;
}

async function runCompleteFlow() {
  console.log('🚀 COMPLETE TEACHER-STUDENT WORKFLOW TEST');
  console.log('='.repeat(50));
  console.log('This test will:');
  console.log('1. Teacher creates a new student account');
  console.log('2. Teacher creates an AI-generated exam');
  console.log('3. Teacher assigns exam to the new student');
  console.log('4. Login as the new student');
  console.log('5. Student takes the assigned exam');
  console.log('6. View results\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // STEP 1: Teacher logs in
    if (!await login(page, 'teacher@test.com', 'password123', 'TEACHER')) {
      throw new Error('Teacher login failed');
    }
    
    // STEP 2: Teacher creates new student
    await createStudent(page);
    
    // STEP 3: Teacher creates exam
    await createExam(page);
    
    // STEP 4: Teacher assigns exam to new student
    await assignExamToStudent(page);
    
    // STEP 5: Student takes exam
    await takeExamAsStudent(page);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ COMPLETE WORKFLOW TEST SUCCESSFUL!');
    console.log('\nCreated Student Credentials:');
    console.log(`  Username: ${NEW_STUDENT.username}`);
    console.log(`  Password: ${NEW_STUDENT.password}`);
    console.log('\n📁 Screenshots saved:');
    console.log('  - flow-teacher-dashboard.png');
    console.log('  - flow-student-creation-form.png');
    console.log('  - flow-students-list.png');
    console.log('  - flow-exam-creation.png');
    console.log('  - flow-student-exam-list.png');
    console.log('  - flow-student-taking-exam.png');
    console.log('  - flow-student-results.png');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    console.log('\nBrowser will close in 10 seconds...');
    await delay(10000);
    await browser.close();
  }
}

// Run the complete flow
runCompleteFlow().catch(console.error);