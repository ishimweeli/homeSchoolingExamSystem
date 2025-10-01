const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = 'http://localhost:5002';
const BACKEND_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function testBasicAccess() {
  console.log('🚀 Testing Basic System Access...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  try {
    // Test 1: Frontend homepage
    console.log('📍 Test 1: Checking frontend homepage...');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homepage.png') });
    console.log('✅ Frontend URL:', page.url());

    // Get page title
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Check for React app
    const reactRoot = await page.$('#root');
    if (reactRoot) {
      console.log('✅ React app detected');
    } else {
      console.log('⚠️ React root not found');
    }

    // Check page content
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('📄 Page has content:', bodyHTML.length > 100 ? 'Yes' : 'No');

    // Test 2: Try login route directly
    console.log('\n📍 Test 2: Navigating to /login...');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-login-route.png') });
    console.log('📄 Login URL:', page.url());

    // Wait for any content to load
    await page.waitForTimeout(2000);

    // Check for any forms or inputs
    const forms = await page.$$('form');
    const inputs = await page.$$('input');
    const buttons = await page.$$('button');

    console.log(`📝 Forms found: ${forms.length}`);
    console.log(`📝 Inputs found: ${inputs.length}`);
    console.log(`🔘 Buttons found: ${buttons.length}`);

    // Get all visible text
    const visibleText = await page.evaluate(() => {
      return document.body.innerText || document.body.textContent || '';
    });

    if (visibleText) {
      console.log('\n📄 Visible text on page:');
      console.log(visibleText.substring(0, 200));
    }

    // Test 3: Check backend health
    console.log('\n📍 Test 3: Checking backend...');
    const backendResponse = await page.goto(`${BACKEND_URL}/api/health`, { waitUntil: 'networkidle0' });
    if (backendResponse) {
      console.log('✅ Backend status:', backendResponse.status());
      const responseText = await page.evaluate(() => document.body.innerText);
      console.log('📄 Backend response:', responseText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error-state.png') });
  } finally {
    console.log('\n✅ Test complete. Check screenshots folder.');
    await browser.close();
  }
}

testBasicAccess().catch(console.error);