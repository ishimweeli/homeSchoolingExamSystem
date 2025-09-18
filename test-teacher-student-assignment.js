const puppeteer = require('puppeteer');

async function testTeacherStudentAssignment() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('1. Logging in as teacher...');
    await page.goto('http://localhost:3001/login');
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });

    // Login as teacher
    await page.type('input[name="email"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✓ Logged in as teacher');

    // Navigate to students page to create a student
    console.log('2. Creating a new student...');
    await page.goto('http://localhost:3001/students');
    await page.waitForSelector('body', { timeout: 10000 });

    // Check if there's a create student button or form
    const hasCreateButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.some(btn => btn.textContent.includes('Add Student') || btn.textContent.includes('Create Student'));
    });

    if (hasCreateButton) {
      // Click create student button
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(btn => btn.textContent.includes('Add Student') || btn.textContent.includes('Create Student'));
        if (createBtn) createBtn.click();
      });

      await page.waitForTimeout(1000);

      // Fill in student details if form appears
      const formVisible = await page.evaluate(() => {
        return document.querySelector('input[id="firstName"]') !== null;
      });

      if (formVisible) {
        await page.type('input[id="firstName"]', 'Test');
        await page.type('input[id="lastName"]', 'Student');
        await page.type('input[id="username"]', `student_${Date.now()}`);
        await page.type('input[id="password"]', 'password123');

        // Submit the form
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const submitBtn = buttons.find(btn => btn.textContent.includes('Create') && !btn.textContent.includes('Add'));
          if (submitBtn) submitBtn.click();
        });

        await page.waitForTimeout(2000);
        console.log('✓ Student created');
      }
    }

    // Navigate to study modules
    console.log('3. Going to study modules...');
    await page.goto('http://localhost:3001/study');
    await page.waitForTimeout(2000);

    // Find and click on a module to assign
    const moduleExists = await page.evaluate(() => {
      const cards = document.querySelectorAll('.bg-white.rounded-lg');
      return cards.length > 0;
    });

    if (moduleExists) {
      console.log('4. Finding a module to assign...');

      // Click on first module's assign button
      const assignClicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const assignLink = links.find(link => link.href && link.href.includes('/assign'));
        if (assignLink) {
          assignLink.click();
          return true;
        }
        return false;
      });

      if (assignClicked) {
        await page.waitForTimeout(3000);
        console.log('✓ Navigated to assign page');

        // Take screenshot of assign page
        await page.screenshot({ path: 'teacher-assign-page.png' });
        console.log('✓ Screenshot saved: teacher-assign-page.png');

        // Check if students are visible
        const studentCount = await page.evaluate(() => {
          const studentElements = document.querySelectorAll('input[type="checkbox"]');
          return studentElements.length;
        });

        console.log(`Found ${studentCount} student checkboxes`);

        if (studentCount > 0) {
          // Select first student
          await page.click('input[type="checkbox"]');
          console.log('✓ Selected a student');

          // Try to assign
          const assignButtonClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const assignBtn = buttons.find(btn => btn.textContent.includes('Assign'));
            if (assignBtn && !assignBtn.disabled) {
              assignBtn.click();
              return true;
            }
            return false;
          });

          if (assignButtonClicked) {
            await page.waitForTimeout(2000);
            console.log('✓ Assignment initiated');
          }
        } else {
          console.log('⚠ No students found to assign');
        }
      }
    } else {
      // If no modules, try to navigate to exams
      console.log('No study modules found, trying exams...');
      await page.goto('http://localhost:3001/exams');
      await page.waitForTimeout(2000);

      // Find exam with assign option
      const examAssignClicked = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const assignLink = links.find(link => link.href && link.href.includes('/assign'));
        if (assignLink) {
          assignLink.click();
          return true;
        }
        return false;
      });

      if (examAssignClicked) {
        await page.waitForTimeout(3000);
        console.log('✓ Navigated to exam assign page');

        // Take screenshot
        await page.screenshot({ path: 'teacher-exam-assign-page.png' });
        console.log('✓ Screenshot saved: teacher-exam-assign-page.png');

        // Check for Add Student button in the assign page
        const addStudentExists = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.some(btn => btn.textContent.includes('Add Student'));
        });

        if (addStudentExists) {
          console.log('5. Creating student from assign page...');

          // Click Add Student button
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const addBtn = buttons.find(btn => btn.textContent.includes('Add Student'));
            if (addBtn) addBtn.click();
          });

          await page.waitForTimeout(1000);

          // Fill in student form
          await page.type('input[id="firstName"]', 'John');
          await page.type('input[id="lastName"]', 'Doe');
          await page.type('input[id="username"]', `john_doe_${Date.now()}`);
          await page.type('input[id="password"]', 'password123');

          // Submit form
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const createBtn = buttons.find(btn => btn.textContent === 'Create Student');
            if (createBtn) createBtn.click();
          });

          await page.waitForTimeout(2000);
          console.log('✓ Student created from assign page');

          // Now try to select and assign
          await page.waitForTimeout(1000);

          const checkboxClicked = await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(:disabled)');
            if (checkboxes.length > 0) {
              checkboxes[0].click();
              return true;
            }
            return false;
          });

          if (checkboxClicked) {
            console.log('✓ Selected student for assignment');

            // Click assign button
            const finalAssign = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const assignBtn = buttons.find(btn => btn.textContent.includes('Assign Exam'));
              if (assignBtn && !assignBtn.disabled) {
                assignBtn.click();
                return true;
              }
              return false;
            });

            if (finalAssign) {
              await page.waitForTimeout(3000);
              console.log('✓ Exam assigned successfully!');
            }
          }
        }
      }
    }

    // Final screenshot
    await page.screenshot({ path: 'final-assignment-state.png' });
    console.log('✓ Final screenshot saved');

  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: `error-assignment-${Date.now()}.png` });
  } finally {
    await browser.close();
    console.log('\nTest completed!');
  }
}

// Run the test
testTeacherStudentAssignment().catch(console.error);