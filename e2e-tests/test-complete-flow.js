const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const BACKEND_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  console.log('🚀 Starting Complete System Test...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  const results = {
    timestamp: Date.now(),
    tests: []
  };

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Console Error:', msg.text());
    }
  });

  try {
    // Test 1: Check homepage
    console.log('📍 Test 1: Checking homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homepage.png') });

    const pageTitle = await page.title();
    console.log('   Page title:', pageTitle);
    results.tests.push({ name: 'Homepage loads', status: 'passed' });
    console.log('✅ Homepage loaded\n');

    // Test 2: Navigate to login
    console.log('📍 Test 2: Going to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-login-page.png') });

    // Check for any input fields
    const inputs = await page.$$('input');
    console.log(`   Found ${inputs.length} input fields`);

    if (inputs.length > 0) {
      // Try to find username/email field
      let emailField = await page.$('input[name="emailOrUsername"]') ||
                       await page.$('input[name="email"]') ||
                       await page.$('input[type="email"]') ||
                       await page.$('input[name="username"]');

      let passwordField = await page.$('input[name="password"]') ||
                         await page.$('input[type="password"]');

      if (emailField && passwordField) {
        console.log('✅ Login form found\n');

        // Test 3: Try to login as teacher
        console.log('📍 Test 3: Logging in as teacher...');
        await emailField.type('teacher@example.com');
        await passwordField.type('password123');
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-login-filled.png') });

        // Find and click submit button
        const submitButton = await page.$('button[type="submit"]') ||
                           await page.$('button');

        if (submitButton) {
          await submitButton.click();

          // Wait for navigation or error
          await delay(3000);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-after-login.png') });

          const currentUrl = page.url();
          console.log('   Current URL:', currentUrl);

          if (currentUrl.includes('dashboard')) {
            console.log('✅ Login successful - redirected to dashboard\n');
            results.tests.push({ name: 'Teacher login', status: 'passed' });

            // Test 4: Check dashboard
            console.log('📍 Test 4: Checking dashboard...');
            await delay(2000);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-dashboard.png') });

            // Try to find exams link
            const examsLink = await page.$('a[href="/exams"]') ||
                             await page.$('a:has-text("Exams")');

            if (examsLink) {
              console.log('✅ Found exams link\n');

              // Test 5: Navigate to exams
              console.log('📍 Test 5: Going to exams page...');
              await examsLink.click();
              await delay(2000);
              await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-exams-page.png') });
              results.tests.push({ name: 'Navigate to exams', status: 'passed' });
            }
          } else {
            console.log('⚠️ Login did not redirect to dashboard');
            results.tests.push({ name: 'Teacher login', status: 'failed', error: 'No redirect' });
          }
        } else {
          console.log('⚠️ Submit button not found');
        }
      } else {
        console.log('⚠️ Login form fields not found');
        console.log('   Looking for alternative selectors...');

        // Get all input attributes for debugging
        for (let i = 0; i < Math.min(inputs.length, 3); i++) {
          const attrs = await inputs[i].evaluate(el => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder
          }));
          console.log(`   Input ${i + 1}:`, attrs);
        }
      }
    } else {
      console.log('⚠️ No input fields found on page');

      // Check if page has any content
      const bodyText = await page.evaluate(() => document.body.innerText);
      console.log('   Page text:', bodyText.substring(0, 100));
    }

    // Test 6: Check backend health
    console.log('\n📍 Test 6: Checking backend...');
    const backendPage = await browser.newPage();
    try {
      await backendPage.goto(`${BACKEND_URL}/health`, { waitUntil: 'networkidle0', timeout: 5000 });
      const backendText = await backendPage.evaluate(() => document.body.innerText);
      console.log('   Backend response:', backendText);
      results.tests.push({ name: 'Backend health', status: 'passed' });
    } catch (error) {
      console.log('   Backend error:', error.message);
      results.tests.push({ name: 'Backend health', status: 'failed', error: error.message });
    }
    await backendPage.close();

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png') });
    results.tests.push({ name: 'Error', status: 'failed', error: error.message });
  } finally {
    // Save results
    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'test-results.json'),
      JSON.stringify(results, null, 2)
    );

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    const passed = results.tests.filter(t => t.status === 'passed').length;
    const failed = results.tests.filter(t => t.status === 'failed').length;
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('\nDetailed Results:');
    results.tests.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} ${test.name}`);
      if (test.error) console.log(`   Error: ${test.error}`);
    });

    await browser.close();
  }
}

testCompleteFlow().catch(console.error);