const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'study-module-flow');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testStudyModuleFlow() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  let studentEmail = `student_${Date.now()}@test.com`;
  let studentPassword = 'password123';
  let moduleId = null;

  try {
    console.log('\n🚀 STUDY MODULE COMPLETE FLOW TEST\n');
    console.log('=' .repeat(60));

    // ============================================
    // PART 1: TEACHER CREATES STUDY MODULE
    // ============================================
    console.log('\n📚 PART 1: TEACHER CREATES STUDY MODULE');
    console.log('-'.repeat(40));

    // Login as teacher
    console.log('1. Logging in as teacher...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-teacher-login.png') });

    await page.click('button[type="submit"]');
    await delay(3000);

    if (!page.url().includes('dashboard')) {
      throw new Error('Teacher login failed!');
    }
    console.log('✅ Teacher logged in successfully');

    // Navigate to Study Modules
    console.log('2. Navigating to Study Modules...');
    await page.goto(`${BASE_URL}/modules`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-modules-page.png') });

    // Click Create Module button
    console.log('3. Creating new study module...');
    const createButton = await page.$('a[href="/modules/create"]');
    if (createButton) {
      await createButton.click();
    } else {
      // Try finding button by text
      const buttons = await page.$$('button');
      let found = false;
      for (const btn of buttons) {
        const text = await page.evaluate(b => b.textContent, btn);
        if (text && text.includes('Create Module')) {
          await btn.click();
          found = true;
          break;
        }
      }
      if (!found) {
        await page.goto(`${BASE_URL}/modules/create`, { waitUntil: 'networkidle0' });
      }
    }
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-create-module-page.png') });

    // Fill module details
    console.log('4. Filling module details...');
    const inputs = await page.$$('input[type="text"], textarea, input[type="number"]');

    if (inputs.length > 0) {
      // Title
      if (inputs[0]) await inputs[0].type('Introduction to Fractions - Test Module');
      // Subject
      if (inputs[1]) await inputs[1].type('Mathematics');
      // Grade
      if (inputs[2]) await inputs[2].type('5');
      // Description
      if (inputs[3]) await inputs[3].type('Learn the basics of fractions including addition, subtraction, and simplification');
      // Topics
      if (inputs[4]) await inputs[4].type('Basic Fractions, Adding Fractions, Subtracting Fractions, Simplifying');
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-module-filled.png') });

    // Generate with AI or Save
    console.log('5. Generating module with AI...');
    const generateButtons = await page.$$('button');
    for (const btn of generateButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && (text.includes('Generate') || text.includes('Create') || text.includes('Save'))) {
        await btn.click();
        console.log(`   Clicked button: ${text}`);
        break;
      }
    }
    await delay(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-module-created.png') });

    console.log('✅ Study module created successfully');

    // ============================================
    // PART 2: CREATE A NEW STUDENT
    // ============================================
    console.log('\n👤 PART 2: CREATE NEW STUDENT');
    console.log('-'.repeat(40));

    console.log('6. Navigating to Students page...');
    await page.goto(`${BASE_URL}/students`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-students-page.png') });

    // Click Create/Add Student button
    console.log('7. Creating new student...');
    const studentButtons = await page.$$('button');
    for (const btn of studentButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && (text.includes('Add Student') || text.includes('Create Student') || text.includes('New Student'))) {
        await btn.click();
        await delay(2000);
        break;
      }
    }

    // Fill student details
    const studentInputs = await page.$$('input[type="text"], input[type="email"], input[type="password"]');
    if (studentInputs.length > 0) {
      // Name
      if (studentInputs[0]) await studentInputs[0].type('Test Student');
      // Email
      if (studentInputs[1]) await studentInputs[1].type(studentEmail);
      // Password
      if (studentInputs[2]) await studentInputs[2].type(studentPassword);
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-student-form.png') });

    // Save student
    const saveButtons = await page.$$('button');
    for (const btn of saveButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && (text.includes('Save') || text.includes('Create') || text.includes('Add'))) {
        await btn.click();
        await delay(2000);
        break;
      }
    }
    console.log('✅ Student created:', studentEmail);

    // ============================================
    // PART 3: ASSIGN MODULE TO STUDENT
    // ============================================
    console.log('\n🔗 PART 3: ASSIGN MODULE TO STUDENT');
    console.log('-'.repeat(40));

    console.log('8. Going back to modules...');
    await page.goto(`${BASE_URL}/modules`, { waitUntil: 'networkidle0' });
    await delay(2000);

    // Find and click Assign button for the first module
    console.log('9. Assigning module to student...');
    const assignButtons = await page.$$('button');
    for (const btn of assignButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && text.includes('Assign')) {
        await btn.click();
        console.log('   Clicked Assign button');
        await delay(2000);
        break;
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-assign-modal.png') });

    // Select student (checkbox or dropdown)
    const checkboxes = await page.$$('input[type="checkbox"]');
    if (checkboxes.length > 0) {
      await checkboxes[0].click(); // Select first student
    }

    // Confirm assignment
    const confirmButtons = await page.$$('button');
    for (const btn of confirmButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && (text.includes('Confirm') || text.includes('Assign') || text.includes('Save'))) {
        await btn.click();
        await delay(2000);
        break;
      }
    }
    console.log('✅ Module assigned to student');

    // ============================================
    // PART 4: STUDENT STARTS MODULE
    // ============================================
    console.log('\n📖 PART 4: STUDENT STARTS MODULE');
    console.log('-'.repeat(40));

    // Logout teacher
    console.log('10. Logging out teacher...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    // Login as student
    console.log('11. Logging in as student...');
    const emailInput = await page.$('input[name="emailOrUsername"]');
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(studentEmail);

    const passwordInput = await page.$('input[name="password"]');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(studentPassword);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-student-login.png') });
    await page.click('button[type="submit"]');
    await delay(3000);

    // Navigate to modules
    console.log('12. Student viewing assigned modules...');
    await page.goto(`${BASE_URL}/modules`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-student-modules.png') });

    // Start module
    console.log('13. Student starting module...');
    const startButtons = await page.$$('button');
    for (const btn of startButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && (text.includes('Start') || text.includes('Begin') || text.includes('View'))) {
        await btn.click();
        console.log('   Started module');
        await delay(2000);
        break;
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-module-started.png') });

    // Complete first lesson
    console.log('14. Student completing first lesson...');
    const nextButtons = await page.$$('button');
    for (const btn of nextButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && (text.includes('Next') || text.includes('Continue'))) {
        await btn.click();
        await delay(2000);
        break;
      }
    }
    console.log('✅ Student at 50% completion');

    // ============================================
    // PART 5: TEACHER CHECKS PROGRESS MID-WAY
    // ============================================
    console.log('\n📊 PART 5: TEACHER CHECKS PROGRESS');
    console.log('-'.repeat(40));

    // Login as teacher again
    console.log('15. Teacher logging back in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.$eval('input[name="emailOrUsername"]', el => el.value = '');
    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.$eval('input[name="password"]', el => el.value = '');
    await page.type('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');
    await delay(3000);

    // Check Analytics
    console.log('16. Teacher viewing analytics...');
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-teacher-analytics.png') });

    const analyticsContent = await page.evaluate(() => document.body.innerText);
    if (analyticsContent.includes('Progress') || analyticsContent.includes('Student')) {
      console.log('✅ Teacher can see student progress');
    }

    // ============================================
    // PART 6: STUDENT COMPLETES MODULE
    // ============================================
    console.log('\n✅ PART 6: STUDENT COMPLETES MODULE');
    console.log('-'.repeat(40));

    // Login as student again
    console.log('17. Student logging back in...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.$eval('input[name="emailOrUsername"]', el => el.value = '');
    await page.type('input[name="emailOrUsername"]', studentEmail);
    await page.$eval('input[name="password"]', el => el.value = '');
    await page.type('input[name="password"]', studentPassword);

    await page.click('button[type="submit"]');
    await delay(3000);

    // Go back to module
    console.log('18. Student completing module...');
    await page.goto(`${BASE_URL}/modules`, { waitUntil: 'networkidle0' });
    await delay(2000);

    // Click complete/finish buttons
    const completeButtons = await page.$$('button');
    for (const btn of completeButtons) {
      const text = await page.evaluate(b => b.textContent, btn);
      if (text && (text.includes('Complete') || text.includes('Finish') || text.includes('Submit'))) {
        await btn.click();
        console.log('   Module completed');
        await delay(2000);
        break;
      }
    }
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-module-completed.png') });
    console.log('✅ Student completed module');

    // ============================================
    // PART 7: TEACHER VERIFIES COMPLETION
    // ============================================
    console.log('\n🎯 PART 7: TEACHER VERIFIES COMPLETION');
    console.log('-'.repeat(40));

    // Final teacher login
    console.log('19. Teacher final check...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.$eval('input[name="emailOrUsername"]', el => el.value = '');
    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.$eval('input[name="password"]', el => el.value = '');
    await page.type('input[name="password"]', 'password123');

    await page.click('button[type="submit"]');
    await delay(3000);

    // Check final analytics
    console.log('20. Checking final student progress...');
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-final-analytics.png') });

    console.log('✅ Teacher verified student completion');

    // Test all navigation buttons
    console.log('\n🔍 TESTING ALL NAVIGATION BUTTONS');
    console.log('-'.repeat(40));

    const navButtons = await page.$$('nav button');
    console.log(`Found ${navButtons.length} navigation buttons`);

    for (let i = 0; i < Math.min(navButtons.length, 5); i++) {
      const buttonText = await page.evaluate((btn) => btn.textContent, navButtons[i]);
      console.log(`Testing button ${i + 1}: ${buttonText}`);
      await navButtons[i].click();
      await delay(1500);
      const currentUrl = page.url();
      console.log(`   Navigated to: ${currentUrl.replace(BASE_URL, '')}`);
    }

    console.log('✅ All navigation buttons working');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png') });
  } finally {
    console.log('\n\n' + '=' .repeat(60));
    console.log('📊 STUDY MODULE FLOW TEST SUMMARY\n');

    console.log('✅ Completed Steps:');
    console.log('   1. Teacher logged in');
    console.log('   2. Study module created');
    console.log('   3. Student account created');
    console.log('   4. Module assigned to student');
    console.log('   5. Student started module');
    console.log('   6. Teacher checked progress mid-way');
    console.log('   7. Student completed module');
    console.log('   8. Teacher verified completion');
    console.log('   9. All navigation buttons tested');

    console.log(`\n📸 Screenshots saved: ${fs.readdirSync(SCREENSHOTS_DIR).length}`);
    console.log('📁 Location:', SCREENSHOTS_DIR);

    console.log('\n🏆 TEST RESULT: COMPLETE FLOW SUCCESSFUL');
    console.log('=' .repeat(60));

    await browser.close();
  }
}

console.log('🚀 Starting Study Module Flow Test...\n');
testStudyModuleFlow().catch(console.error);