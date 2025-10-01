const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5002';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function debugLogin() {
  console.log('🔍 Debugging login page...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  try {
    // Navigate to login
    console.log('📍 Going to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug-login-page.png') });

    // Get page content
    const pageContent = await page.content();
    console.log('📄 Page URL:', page.url());

    // Check for different input selectors
    const selectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input#email',
      'input[type="text"]',
      'input[name="username"]',
      'input'
    ];

    console.log('\n🔍 Checking for input fields:');
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        // Get attributes of first element
        const attrs = await elements[0].evaluate(el => {
          return {
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            className: el.className
          };
        });
        console.log('   Attributes:', attrs);
      }
    }

    // Check for forms
    const forms = await page.$$('form');
    console.log(`\n📝 Found ${forms.length} forms on the page`);

    // Check for buttons
    const buttons = await page.$$('button');
    console.log(`🔘 Found ${buttons.length} buttons on the page`);

    // Get all text on page
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n📄 Page text preview:');
    console.log(bodyText.substring(0, 500));

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'debug-error.png') });
  } finally {
    console.log('\n✅ Debug complete. Check screenshots folder for images.');
    await browser.close();
  }
}

debugLogin().catch(console.error);