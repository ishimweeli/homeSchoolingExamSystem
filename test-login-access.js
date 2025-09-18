const puppeteer = require('puppeteer');

async function testLoginAccess() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  try {
    console.log('1. Testing website accessibility...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle0' });
    console.log('✓ Website is accessible at http://localhost:3001');

    console.log('\n2. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    console.log('✓ Login page loaded');

    await page.screenshot({ path: 'test-login-page.png' });

    console.log('\n3. Attempting login with student credentials...');
    await page.waitForSelector('input[name="emailOrUsername"]');
    await page.waitForSelector('input[name="password"]');
    await page.waitForSelector('button[type="submit"]');

    await page.type('input[name="emailOrUsername"]', 'student@test.com');
    await page.type('input[name="password"]', 'password123');

    console.log('Submitting login form...');

    // Click submit and wait for navigation
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
        console.log('No navigation occurred, checking current state...');
      })
    ]);

    // Wait a bit more for any async operations
    await new Promise(resolve => setTimeout(resolve, 3000));

    const currentUrl = page.url();
    console.log('\n4. Current URL after login:', currentUrl);

    if (currentUrl.includes('/dashboard')) {
      console.log('✓ Successfully logged in and redirected to dashboard!');
      await page.screenshot({ path: 'test-dashboard-success.png' });
    } else if (currentUrl.includes('/login')) {
      console.log('✗ Still on login page, checking for errors...');

      // Check for error messages
      const errorMessage = await page.evaluate(() => {
        const toasts = document.querySelectorAll('[data-sonner-toast]');
        if (toasts.length > 0) {
          return Array.from(toasts).map(t => t.textContent).join(', ');
        }
        const errors = document.querySelectorAll('.text-red-500, .text-destructive, [role="alert"]');
        if (errors.length > 0) {
          return Array.from(errors).map(e => e.textContent).join(', ');
        }
        return null;
      });

      if (errorMessage) {
        console.log('Error message:', errorMessage);
      }

      await page.screenshot({ path: 'test-login-failed.png' });
    } else {
      console.log('Redirected to:', currentUrl);
      await page.screenshot({ path: 'test-redirect-page.png' });
    }

    // Try teacher login
    console.log('\n5. Testing teacher login...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    await page.waitForSelector('input[name="emailOrUsername"]');
    await page.evaluate(() => {
      document.querySelector('input[name="emailOrUsername"]').value = '';
      document.querySelector('input[name="password"]').value = '';
    });

    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
        console.log('No navigation occurred for teacher login');
      })
    ]);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const teacherUrl = page.url();
    console.log('Teacher login result - URL:', teacherUrl);

    if (teacherUrl.includes('/dashboard')) {
      console.log('✓ Teacher login successful!');
      await page.screenshot({ path: 'test-teacher-dashboard.png' });
    } else {
      console.log('✗ Teacher login failed');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  }

  console.log('\nTest complete. Browser will close in 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  await browser.close();
}

testLoginAccess().catch(console.error);