const puppeteer = require('puppeteer');
const path = require('path');

async function testAssignmentFlow() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    // Login as teacher
    console.log('2. Logging in as teacher...');
    await page.waitForSelector('input[name="emailOrUsername"]', { timeout: 10000 });
    await page.type('input[name="emailOrUsername"]', 'johndoe@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-teacher-logged-in.png' });
    console.log('✓ Teacher logged in');

    // Navigate to study modules
    console.log('3. Navigating to study modules...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-study-modules-page.png' });

    // Find a study module
    console.log('4. Looking for study modules...');
    await page.waitForTimeout(2000);

    // Check if there are any modules
    const modules = await page.$$('[data-module-id]');
    if (modules.length === 0) {
      console.log('No modules found, checking for module cards...');
      const moduleCards = await page.$$('.bg-white.rounded-lg');
      if (moduleCards.length > 0) {
        console.log(`Found ${moduleCards.length} module cards`);

        // Click on the first module's assign button
        const assignButton = await page.$('button:has-text("Assign"), button:has-text("assign"), [class*="assign"]');
        if (assignButton) {
          await assignButton.click();
          console.log('Clicked assign button');
        } else {
          // Try to find any button in the first module card
          const firstCard = moduleCards[0];
          const buttons = await firstCard.$$('button');
          console.log(`Found ${buttons.length} buttons in first card`);
          if (buttons.length > 0) {
            await buttons[0].click();
            console.log('Clicked first button in module card');
          }
        }
      }
    } else {
      console.log(`Found ${modules.length} modules`);
      // Click the first module
      await modules[0].click();
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-after-module-click.png' });

    // Check if we're on an assignment page or modal
    console.log('5. Checking for assignment interface...');

    // Try to find student selection
    const studentCheckboxes = await page.$$('input[type="checkbox"]');
    if (studentCheckboxes.length > 0) {
      console.log(`Found ${studentCheckboxes.length} checkboxes, selecting first student...`);
      await studentCheckboxes[0].click();
      await page.screenshot({ path: 'test-student-selected.png' });

      // Look for submit/assign button
      const submitButton = await page.$('button:has-text("Assign"), button:has-text("Submit"), button[type="submit"]');
      if (submitButton) {
        console.log('Clicking assign/submit button...');
        await submitButton.click();
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'test-after-assignment.png' });
        console.log('✓ Assignment submitted');
      }
    }

    // Now login as student to verify
    console.log('\n6. Logging out and logging in as student...');
    await page.goto('http://localhost:3001/api/auth/signout', { waitUntil: 'networkidle0' });
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    console.log('7. Logging in as student...');
    await page.waitForSelector('input[name="emailOrUsername"]', { timeout: 10000 });
    await page.type('input[name="emailOrUsername"]', 'janedoe@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'test-student-logged-in.png' });
    console.log('✓ Student logged in');

    // Navigate to study modules
    console.log('8. Checking student study modules...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-student-study-modules.png' });

    // Check for assigned modules
    const assignedModules = await page.$$('.bg-white.rounded-lg');
    console.log(`✓ Student has ${assignedModules.length} modules visible`);

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
    if (page) {
      await page.screenshot({ path: `test-error-${Date.now()}.png` });
    }
  } finally {
    await browser.close();
  }
}

testAssignmentFlow().catch(console.error);