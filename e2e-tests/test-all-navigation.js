const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'navigation-test');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAllNavigation() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  const results = {
    working: [],
    broken: [],
    missing: []
  };

  try {
    console.log('\n🔍 TESTING ALL NAVIGATION LINKS\n');
    console.log('=' .repeat(60));

    // Login first
    console.log('📍 Logging in as teacher...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await delay(3000);

    if (!page.url().includes('dashboard')) {
      throw new Error('Login failed!');
    }
    console.log('✅ Logged in successfully\n');

    // Test each sidebar link
    const sidebarLinks = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Exams', path: '/exams' },
      { name: 'Study Modules', path: '/study-modules' },
      { name: 'Students', path: '/students' },
      { name: 'Classes', path: '/classes' },
      { name: 'Reports', path: '/reports' },
      { name: 'Analytics', path: '/analytics' },
      { name: 'Materials', path: '/materials' },
      { name: 'Community', path: '/community' },
      { name: 'Settings', path: '/settings' }
    ];

    for (const link of sidebarLinks) {
      console.log(`\n📍 Testing: ${link.name}`);
      console.log('-'.repeat(40));

      try {
        // Try clicking the sidebar link
        const linkSelector = `a[href="${link.path}"]`;
        const linkElement = await page.$(linkSelector);

        if (linkElement) {
          await linkElement.click();
          await delay(2000);

          const currentUrl = page.url();
          const pageContent = await page.evaluate(() => document.body.innerText);

          // Check if page loaded properly
          if (currentUrl.includes(link.path)) {
            if (pageContent.includes('404') || pageContent.includes('not found')) {
              console.log(`❌ ${link.name}: Page exists but shows 404`);
              results.broken.push(link.name);
            } else if (pageContent.includes('Error') && !pageContent.includes('No errors')) {
              console.log(`⚠️ ${link.name}: Page has errors`);
              results.broken.push(link.name);
            } else {
              console.log(`✅ ${link.name}: Working`);
              results.working.push(link.name);
            }
          } else {
            console.log(`❌ ${link.name}: Navigation failed`);
            results.broken.push(link.name);
          }

          // Take screenshot
          await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${link.name.toLowerCase().replace(/\s+/g, '-')}.png`)
          });
        } else {
          // Try direct navigation
          await page.goto(`${BASE_URL}${link.path}`, { waitUntil: 'networkidle0' });
          await delay(2000);

          const pageContent = await page.evaluate(() => document.body.innerText);

          if (page.url().includes('login')) {
            console.log(`🔒 ${link.name}: Redirected to login (auth issue)`);
            results.broken.push(link.name);
          } else if (pageContent.includes('404') || pageContent.includes('Cannot GET')) {
            console.log(`❌ ${link.name}: Page doesn't exist`);
            results.missing.push(link.name);
          } else {
            console.log(`⚠️ ${link.name}: No sidebar link but page exists`);
            results.broken.push(link.name);
          }

          await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, `${link.name.toLowerCase().replace(/\s+/g, '-')}-direct.png`)
          });
        }

        // Go back to dashboard for next test
        await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
        await delay(1000);

      } catch (error) {
        console.log(`❌ ${link.name}: Error - ${error.message}`);
        results.broken.push(link.name);
      }
    }

    // Test specific features on working pages
    console.log('\n\n📍 TESTING PAGE FEATURES\n');
    console.log('=' .repeat(60));

    // Test Exam Creation
    console.log('\n🧪 Testing Exam Creation...');
    await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
    await delay(2000);
    const hasQuestionTypes = await page.$$('.question-type-card');
    if (hasQuestionTypes.length === 6) {
      console.log('✅ Exam creation has 6 question types with controls');
    } else {
      console.log(`⚠️ Exam creation has ${hasQuestionTypes.length} question types (expected 6)`);
    }

    // Check for AI generation tab
    const aiTab = await page.$('button:has-text("AI Generation")');
    if (aiTab) {
      console.log('✅ AI Generation tab present');
    } else {
      console.log('⚠️ AI Generation tab might be missing');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    console.log('\n\n' + '=' .repeat(60));
    console.log('📊 NAVIGATION TEST RESULTS\n');
    console.log(`✅ Working pages (${results.working.length}): ${results.working.join(', ') || 'None'}`);
    console.log(`❌ Broken pages (${results.broken.length}): ${results.broken.join(', ') || 'None'}`);
    console.log(`🚫 Missing pages (${results.missing.length}): ${results.missing.join(', ') || 'None'}`);
    console.log('=' .repeat(60));

    await browser.close();
  }
}

console.log('🚀 Starting Navigation Test...\n');
testAllNavigation().catch(console.error);