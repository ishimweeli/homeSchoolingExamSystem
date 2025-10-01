const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const API_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function testLoginDebug() {
  console.log('🔍 Debugging Login Process...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  // Capture network responses
  const networkLog = [];
  page.on('response', response => {
    if (response.url().includes('/api/') || response.url().includes('/auth/')) {
      networkLog.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    }
  });

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('🔴 Console Error:', msg.text().substring(0, 200));
    }
  });

  try {
    // Go to login page
    console.log('📍 Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    // Fill login form
    console.log('📍 Filling login form...');
    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug-login-filled.png') });

    // Clear network log before submitting
    networkLog.length = 0;

    // Submit form and wait for response
    console.log('📍 Submitting form...');
    const [response] = await Promise.all([
      page.waitForResponse(res =>
        res.url().includes('/api/auth/') ||
        res.url().includes('/login') ||
        res.url().includes('/signin'),
        { timeout: 10000 }
      ).catch(() => null),
      page.click('button[type="submit"]')
    ]);

    // Wait for navigation or error
    await page.waitForTimeout(3000);

    // Check results
    const currentUrl = page.url();
    console.log('\n📊 Results:');
    console.log('================');
    console.log('Current URL:', currentUrl);
    console.log('Login successful:', currentUrl.includes('dashboard'));

    // Check for error messages on page
    const errorElement = await page.$('.text-red-700, .error, .alert-error');
    if (errorElement) {
      const errorText = await errorElement.evaluate(el => el.textContent);
      console.log('Error message:', errorText);
    }

    // Show network requests
    console.log('\n📡 Network Activity:');
    console.log('===================');
    if (networkLog.length > 0) {
      networkLog.forEach(req => {
        const icon = req.status < 400 ? '✅' : '❌';
        console.log(`${icon} ${req.method} ${req.url} - Status: ${req.status}`);
      });
    } else {
      console.log('No API calls detected');
    }

    // Try direct API login to verify credentials
    console.log('\n📍 Testing direct API login...');
    const apiPage = await browser.newPage();

    const apiResponse = await apiPage.evaluate(async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'teacher@example.com',
            password: 'password123'
          })
        });
        return {
          status: response.status,
          ok: response.ok,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, API_URL);

    console.log('API Response:', JSON.stringify(apiResponse, null, 2));

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug-login-result.png') });

  } catch (error) {
    console.error('❌ Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

testLoginDebug().catch(console.error);