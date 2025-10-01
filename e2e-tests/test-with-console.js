const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5003';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function testWithConsole() {
  console.log('🚀 Testing with console error detection...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  // Capture console messages
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const error = msg.text();
      console.log('🔴 Console Error:', error);
      consoleErrors.push(error);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log('🔴 Page Error:', error.message);
    consoleErrors.push(error.message);
  });

  try {
    // Test homepage
    console.log('📍 Going to homepage...');
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'homepage-console.png') });

    // Test login page
    console.log('\n📍 Going to login page...');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'login-console.png') });

    // Check if content loaded
    const hasContent = await page.evaluate(() => {
      const root = document.querySelector('#root');
      return root && root.innerHTML.length > 100;
    });

    console.log('\n📊 Results:');
    console.log('- Has content:', hasContent);
    console.log('- Console errors:', consoleErrors.length);

    if (consoleErrors.length > 0) {
      console.log('\n❌ Console Errors Found:');
      consoleErrors.forEach((err, i) => {
        console.log(`${i + 1}. ${err}`);
      });
    }

    // Try to get any rendered text
    const bodyText = await page.evaluate(() => {
      return document.body.innerText || '';
    });

    if (bodyText) {
      console.log('\n📄 Page text found:');
      console.log(bodyText.substring(0, 200));
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-console.png') });
  } finally {
    await browser.close();
  }
}

testWithConsole().catch(console.error);