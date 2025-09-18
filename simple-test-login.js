// Simple test to login as teacher and create students
const puppeteer = require('puppeteer');

async function testLogin() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('Testing Teacher Login and Student Creation');
    console.log('=' .repeat(50));

    // Go to login page
    console.log('\n1. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    // Wait a bit for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Type credentials
    console.log('2. Entering credentials...');

    // Find and type in email field
    await page.type('input[type="email"], input[name="email"], input#email, input[placeholder*="mail"]', 'teacher@test.com');

    // Find and type in password field
    await page.type('input[type="password"], input[name="password"], input#password', 'password123');

    // Take screenshot before login
    await page.screenshot({ path: 'before-login.png' });
    console.log('✓ Screenshot: before-login.png');

    // Click login button
    console.log('3. Clicking login button...');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');

    // Wait for navigation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png' });
    console.log('✓ Screenshot: after-login.png');

    // Check current URL
    const currentUrl = page.url();
    console.log(`4. Current URL: ${currentUrl}`);

    if (currentUrl.includes('dashboard') || currentUrl.includes('exams')) {
      console.log('✓ Login successful!');

      // Try to navigate to students page
      console.log('\n5. Navigating to students page...');
      await page.goto('http://localhost:3001/students', { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot
      await page.screenshot({ path: 'students-page.png' });
      console.log('✓ Screenshot: students-page.png');

      // Now navigate to exam assignment page
      console.log('\n6. Navigating to exams...');
      await page.goto('http://localhost:3001/exams', { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot
      await page.screenshot({ path: 'exams-page.png' });
      console.log('✓ Screenshot: exams-page.png');

      // Find and click on an assign link
      const assignLink = await page.$('a[href*="/assign"]');
      if (assignLink) {
        console.log('7. Found assign link, clicking...');
        await assignLink.click();
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take screenshot of assign page
        await page.screenshot({ path: 'assign-page.png' });
        console.log('✓ Screenshot: assign-page.png');

        // Look for Add Student button
        const addStudentBtn = await page.$('button:has-text("Add Student")');
        if (addStudentBtn) {
          console.log('8. Found Add Student button!');
        } else {
          console.log('⚠ Add Student button not found');
        }
      } else {
        console.log('⚠ No assign link found');
      }
    } else {
      console.log('⚠ Login may have failed, still on:', currentUrl);
    }

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\n' + '='.repeat(50));
  console.log('Browser will remain open for manual inspection.');
}

// Run the test
testLogin().catch(console.error);