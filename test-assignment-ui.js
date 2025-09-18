const puppeteer = require('puppeteer');

async function testAssignmentUI() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080'],
    defaultViewport: null
  });
  const page = await browser.newPage();

  try {
    console.log('Testing Assignment UI with Student Creation');
    console.log('=' .repeat(50));

    // Go directly to the exam assign page (assuming user is already logged in)
    console.log('\n1. Navigating to exam assign page...');

    // First, go to login page
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    // Check if already logged in by looking for dashboard elements
    const isLoggedIn = await page.evaluate(() => {
      return window.location.pathname !== '/login';
    });

    if (!isLoggedIn) {
      console.log('2. Logging in as teacher...');

      // Try different selectors for login
      await page.waitForTimeout(1000);

      // Type email
      const emailInput = await page.$('input[type="email"]') || await page.$('input[name="email"]') || await page.$('#email');
      if (emailInput) {
        await emailInput.type('teacher@example.com');
      }

      // Type password
      const passwordInput = await page.$('input[type="password"]') || await page.$('input[name="password"]') || await page.$('#password');
      if (passwordInput) {
        await passwordInput.type('password123');
      }

      // Click submit
      const submitButton = await page.$('button[type="submit"]') || await page.$('button');
      if (submitButton) {
        await submitButton.click();
      }

      await page.waitForTimeout(3000);
      console.log('✓ Login attempted');
    }

    // Go to exams page
    console.log('3. Navigating to exams...');
    await page.goto('http://localhost:3001/exams', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    // Take screenshot of exams page
    await page.screenshot({ path: 'exams-page.png' });
    console.log('✓ Screenshot: exams-page.png');

    // Find the first exam's assign link
    const assignLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const link = links.find(a => a.href && a.href.includes('/exams/') && a.href.includes('/assign'));
      return link ? link.href : null;
    });

    if (assignLink) {
      console.log(`4. Found assign link: ${assignLink}`);
      await page.goto(assignLink, { waitUntil: 'networkidle0' });
      await page.waitForTimeout(3000);

      // Take screenshot of assign page
      await page.screenshot({ path: 'assign-page-initial.png' });
      console.log('✓ Screenshot: assign-page-initial.png');

      // Look for "Add Student" button and click it
      console.log('5. Looking for Add Student button...');
      const addStudentClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(btn =>
          btn.textContent && btn.textContent.includes('Add Student')
        );
        if (addBtn) {
          addBtn.click();
          return true;
        }
        return false;
      });

      if (addStudentClicked) {
        console.log('✓ Clicked Add Student button');
        await page.waitForTimeout(2000);

        // Fill in the student form
        console.log('6. Filling student form...');

        // Try to fill form fields
        await page.evaluate(() => {
          const firstName = document.querySelector('#firstName');
          const lastName = document.querySelector('#lastName');
          const username = document.querySelector('#username');
          const password = document.querySelector('#password');

          if (firstName) firstName.value = 'Test';
          if (lastName) lastName.value = 'Student';
          if (username) username.value = `test_student_${Date.now()}`;
          if (password) password.value = 'password123';
        });

        await page.waitForTimeout(1000);

        // Take screenshot of filled form
        await page.screenshot({ path: 'student-form-filled.png' });
        console.log('✓ Screenshot: student-form-filled.png');

        // Click Create Student button
        const createClicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const createBtn = buttons.find(btn =>
            btn.textContent === 'Create Student'
          );
          if (createBtn) {
            createBtn.click();
            return true;
          }
          return false;
        });

        if (createClicked) {
          console.log('✓ Clicked Create Student');
          await page.waitForTimeout(3000);

          // Take screenshot after creation
          await page.screenshot({ path: 'after-student-creation.png' });
          console.log('✓ Screenshot: after-student-creation.png');

          // Check if student appears in list
          const studentCount = await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(:disabled)');
            return checkboxes.length;
          });

          console.log(`\n7. Found ${studentCount} selectable students`);

          if (studentCount > 0) {
            // Select first student
            await page.evaluate(() => {
              const checkbox = document.querySelector('input[type="checkbox"]:not(:disabled)');
              if (checkbox) checkbox.click();
            });
            console.log('✓ Selected a student');

            // Try to assign
            const assignClicked = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const assignBtn = buttons.find(btn =>
                btn.textContent && btn.textContent.includes('Assign Exam')
              );
              if (assignBtn && !assignBtn.disabled) {
                assignBtn.click();
                return true;
              }
              return false;
            });

            if (assignClicked) {
              console.log('✓ Clicked Assign Exam');
              await page.waitForTimeout(3000);

              // Final screenshot
              await page.screenshot({ path: 'assignment-complete.png' });
              console.log('✓ Screenshot: assignment-complete.png');
            } else {
              console.log('⚠ Assign button is disabled or not found');
            }
          }
        }
      } else {
        console.log('⚠ Add Student button not found');

        // Check current page content
        const pageContent = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            hasCheckboxes: document.querySelectorAll('input[type="checkbox"]').length,
            buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim())
          };
        });

        console.log('\nPage analysis:');
        console.log('  URL:', pageContent.url);
        console.log('  Checkboxes found:', pageContent.hasCheckboxes);
        console.log('  Buttons:', pageContent.buttonTexts);
      }
    } else {
      console.log('⚠ No exam with assign link found');

      // List all links on the page for debugging
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
          text: a.textContent.trim(),
          href: a.href
        }));
      });

      console.log('\nAvailable links:');
      links.forEach(link => {
        if (link.href.includes('exam')) {
          console.log(`  - ${link.text}: ${link.href}`);
        }
      });
    }

  } catch (error) {
    console.error('\nError during test:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  } finally {
    console.log('\n' + '='.repeat(50));
    console.log('Test completed! Check the screenshots.');

    // Keep browser open for manual inspection
    console.log('\nBrowser will remain open for inspection.');
    console.log('Close it manually when done.');
  }
}

// Run the test
testAssignmentUI().catch(console.error);