const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login(page, email, password, role) {
  console.log(`\n🔐 Logging in as ${role}...`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await delay(1000);
  
  // Wait for and fill form
  await page.waitForSelector('input[name="emailOrUsername"]');
  await page.type('input[name="emailOrUsername"]', email);
  await page.type('input[name="password"]', password);
  
  await page.click('button[type="submit"]');
  await delay(5000);
  
  const url = page.url();
  if (url.includes('/dashboard')) {
    console.log(`✅ ${role} logged in successfully`);
    return true;
  } else {
    console.log(`❌ ${role} login failed`);
    return false;
  }
}

async function createExamAsTeacher(page) {
  console.log('\n📝 CREATING EXAM AS TEACHER');
  console.log('='.repeat(40));
  
  // Navigate to exam creation
  await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  console.log('📋 Filling exam form...');
  
  // Fill exam title
  await page.type('input[placeholder*="Mathematics"]', 'Fractions and Decimals Quiz');
  console.log('  ✓ Added title');
  
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
  
  // Click Mathematics option
  const options = await page.$$('[role="option"]');
  for (const option of options) {
    const text = await page.evaluate(el => el.textContent, option);
    if (text && text.includes('Mathematics')) {
      await option.click();
      break;
    }
  }
  console.log('  ✓ Selected Mathematics');
  
  // Set grade level
  const gradeInput = await page.$('input[value="7"]');
  if (gradeInput) {
    await gradeInput.click({ clickCount: 3 });
    await gradeInput.type('6');
    console.log('  ✓ Set grade to 6');
  }
  
  // Add topics
  const topicInput = await page.$('input[placeholder*="topic"]');
  if (topicInput) {
    await topicInput.type('Fractions');
    await page.keyboard.press('Enter');
    await delay(500);
    
    await topicInput.type('Decimals');
    await page.keyboard.press('Enter');
    await delay(500);
    
    await topicInput.type('Percentages');
    await page.keyboard.press('Enter');
    console.log('  ✓ Added 3 topics');
  }
  
  // Take screenshot of filled form
  await page.screenshot({ path: 'exam-form-filled.png', fullPage: true });
  console.log('📸 Form screenshot saved');
  
  // Click Generate Exam button
  console.log('\n🚀 Generating exam with AI...');
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
    console.log('  ⏳ Waiting for AI to generate exam...');
    
    // Wait for response (this might take a while with actual AI)
    await delay(10000);
    
    // Check if we got redirected or see success
    const currentUrl = page.url();
    if (currentUrl !== `${BASE_URL}/exams/create`) {
      console.log('  ✅ Exam created successfully!');
      console.log('  📍 Redirected to:', currentUrl);
      return true;
    } else {
      // Check for any success message
      const pageContent = await page.content();
      if (pageContent.includes('success') || pageContent.includes('created')) {
        console.log('  ✅ Exam created!');
        return true;
      } else {
        console.log('  ⚠️  Exam may not have been created');
        return false;
      }
    }
  } else {
    console.log('  ❌ Generate button not found');
    return false;
  }
}

async function viewExamsAsTeacher(page) {
  console.log('\n📚 Viewing created exams...');
  await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  const examCards = await page.$$('[class*="card"], [class*="Card"]');
  console.log(`  Found ${examCards.length} exam(s)`);
  
  if (examCards.length > 0) {
    // Try to find and click assign button on first exam
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('Assign')) {
        await button.click();
        console.log('  ✓ Clicked Assign button');
        await delay(2000);
        
        // Try to assign to student
        const checkboxes = await page.$$('input[type="checkbox"]');
        if (checkboxes.length > 0) {
          await checkboxes[0].click();
          console.log('  ✓ Selected student');
          
          let assignBtn = null;
          const btns = await page.$$('button');
          for (const btn of btns) {
            const txt = await page.evaluate(el => el.textContent, btn);
            if (txt && txt === 'Assign') {
              assignBtn = btn;
              break;
            }
          }
          if (assignBtn) {
            await assignBtn.click();
            console.log('  ✅ Exam assigned to student');
            await delay(2000);
          }
        }
        break;
      }
    }
  }
  
  await page.screenshot({ path: 'teacher-exams-list.png', fullPage: true });
}

async function takeExamAsStudent(page) {
  console.log('\n📚 TAKING EXAM AS STUDENT');
  console.log('='.repeat(40));
  
  // Go to exam taking page
  await page.goto(`${BASE_URL}/exams/take`, { waitUntil: 'networkidle0' });
  await delay(2000);
  
  await page.screenshot({ path: 'student-available-exams.png', fullPage: true });
  
  // Check for available exams
  const examCards = await page.$$('[class*="card"], [class*="Card"]');
  console.log(`  Found ${examCards.length} available exam(s)`);
  
  if (examCards.length > 0) {
    // Find start/take button
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Start') || text.includes('Take') || text.includes('Begin'))) {
        await button.click();
        console.log('  ✓ Started exam');
        await delay(3000);
        
        // Take screenshot of exam interface
        await page.screenshot({ path: 'student-taking-exam.png', fullPage: true });
        
        // Try to answer some questions
        console.log('  📝 Answering questions...');
        
        // For multiple choice, click first option
        const radioButtons = await page.$$('input[type="radio"]');
        for (let i = 0; i < Math.min(5, radioButtons.length); i++) {
          await radioButtons[i].click();
          console.log(`    ✓ Answered question ${i + 1}`);
          await delay(500);
        }
        
        // For text inputs, add sample answers
        const textInputs = await page.$$('input[type="text"], textarea');
        for (let i = 0; i < Math.min(3, textInputs.length); i++) {
          await textInputs[i].type(`Sample answer ${i + 1}`);
          console.log(`    ✓ Filled text answer ${i + 1}`);
          await delay(500);
        }
        
        // Submit exam
        const submitBtn = await page.$('button:has-text("Submit")');
        if (submitBtn) {
          await submitBtn.click();
          console.log('  ✅ Exam submitted');
          await delay(3000);
          
          // Take screenshot of results
          await page.screenshot({ path: 'student-exam-results.png', fullPage: true });
        }
        
        return true;
      }
    }
    console.log('  ⚠️  No exam to take');
  } else {
    console.log('  ⚠️  No exams available');
  }
  
  return false;
}

async function viewResultsAsParent(page) {
  console.log('\n📊 VIEWING RESULTS AS PARENT');
  console.log('='.repeat(40));
  
  // Check family dashboard
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
  await delay(2000);
  console.log('  ✓ Viewing family dashboard');
  await page.screenshot({ path: 'parent-family-view.png', fullPage: true });
  
  // Go to results page
  await page.goto(`${BASE_URL}/results`, { waitUntil: 'networkidle0' });
  await delay(2000);
  console.log('  ✓ Viewing results page');
  await page.screenshot({ path: 'parent-results-view.png', fullPage: true });
  
  // Check analytics
  await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
  await delay(2000);
  console.log('  ✓ Viewing analytics');
  await page.screenshot({ path: 'parent-analytics-view.png', fullPage: true });
}

async function runCompleteWorkflow() {
  console.log('🚀 COMPLETE EXAM SYSTEM WORKFLOW TEST');
  console.log('='.repeat(50));
  console.log('This test will:');
  console.log('1. Teacher creates an AI-generated exam');
  console.log('2. Teacher assigns exam to student');
  console.log('3. Student takes the exam');
  console.log('4. Parent views results\n');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // PHASE 1: Teacher creates and assigns exam
    if (await login(page, 'teacher@test.com', 'password123', 'TEACHER')) {
      await createExamAsTeacher(page);
      await viewExamsAsTeacher(page);
    }
    
    // Logout
    await page.goto(`${BASE_URL}/api/auth/signout`);
    await delay(2000);
    
    // PHASE 2: Student takes exam
    if (await login(page, 'student@test.com', 'password123', 'STUDENT')) {
      await takeExamAsStudent(page);
    }
    
    // Logout
    await page.goto(`${BASE_URL}/api/auth/signout`);
    await delay(2000);
    
    // PHASE 3: Parent views results
    if (await login(page, 'parent@test.com', 'password123', 'PARENT')) {
      await viewResultsAsParent(page);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ WORKFLOW TEST COMPLETE!');
    console.log('\n📁 Screenshots saved:');
    console.log('  - exam-form-filled.png');
    console.log('  - teacher-exams-list.png');
    console.log('  - student-available-exams.png');
    console.log('  - student-taking-exam.png');
    console.log('  - student-exam-results.png');
    console.log('  - parent-family-view.png');
    console.log('  - parent-results-view.png');
    console.log('  - parent-analytics-view.png');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await delay(5000); // Keep browser open for review
    await browser.close();
  }
}

// Run the complete workflow
runCompleteWorkflow().catch(console.error);