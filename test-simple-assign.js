const puppeteer = require('puppeteer');

async function testSimpleAssign() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    // Login as teacher
    console.log('1. Logging in as teacher...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    await page.type('input[name="password"]', 'password123');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Logged in');

    // Go directly to assignment page for the module
    console.log('2. Going to assignment page...');
    await page.goto('http://localhost:3001/study/modules/cmfgde73z0001qpei496b8pna/assign', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));

    // Wait for page to fully load
    await page.waitForSelector('h1', { timeout: 5000 });

    // Check what's on the page
    const pageContent = await page.evaluate(() => {
      return {
        title: document.querySelector('h1')?.textContent,
        hasCheckboxes: document.querySelectorAll('input[type="checkbox"]').length,
        bodyText: document.body.innerText.substring(0, 200)
      };
    });

    console.log('Page content:', pageContent);

    // Look for any text about students
    const studentSectionText = await page.evaluate(() => {
      const section = document.querySelector('*:has-text("Select Students")');
      return section ? section.innerText : null;
    });

    console.log('Student section:', studentSectionText);

    // Screenshot to see what's happening
    await page.screenshot({ path: 'assignment-page-state.png' });

    console.log('\n✅ Check assignment-page-state.png to see the current state');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\nKeeping browser open for manual inspection...');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
}

testSimpleAssign().catch(console.error);