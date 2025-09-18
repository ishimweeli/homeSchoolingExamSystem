const puppeteer = require('puppeteer');

async function testStudentLearning() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    // Login as student
    console.log('1. Logging in as student...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'student@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Student logged in');

    // Go to study modules
    console.log('2. Navigating to study modules...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'student-study-page.png' });

    // Click Start Learning button
    console.log('3. Looking for Start Learning button...');
    const buttons = await page.$$('button');
    let startButton = null;

    for (const button of buttons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Start Learning')) {
        startButton = button;
        break;
      }
    }

    if (startButton) {
      console.log('Found Start Learning button, clicking...');
      await startButton.click();
      await new Promise(r => setTimeout(r, 3000));

      const currentUrl = page.url();
      console.log('Current URL after clicking:', currentUrl);
      await page.screenshot({ path: 'learning-page.png' });

      if (currentUrl.includes('/study/modules/')) {
        console.log('✓ Successfully navigated to learning page');

        // Check if page loaded without errors
        const pageContent = await page.evaluate(() => {
          const errorText = document.querySelector('.error, [class*="error"]');
          const lessonTitle = document.querySelector('h1, h2');
          return {
            hasError: !!errorText,
            errorText: errorText?.textContent,
            title: lessonTitle?.textContent,
            bodyText: document.body.innerText.substring(0, 200)
          };
        });

        if (pageContent.hasError) {
          console.log('⚠ Error on page:', pageContent.errorText);
        } else {
          console.log('✓ Learning page loaded successfully');
          console.log('Page title:', pageContent.title);
        }
      }
    } else {
      // Try direct navigation
      console.log('Start button not found, trying direct navigation...');
      await page.goto('http://localhost:3001/study/modules/cmfgde73z0001qpei496b8pna', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: 'direct-learning-page.png' });

      const pageStatus = await page.evaluate(() => {
        const errorText = document.body.innerText.includes('error') ||
                         document.body.innerText.includes('Error') ||
                         document.body.innerText.includes('undefined');
        return {
          hasError: errorText,
          pageText: document.body.innerText.substring(0, 300)
        };
      });

      if (pageStatus.hasError) {
        console.log('⚠ Page has errors');
      } else {
        console.log('✓ Page loaded without errors');
      }
      console.log('Page content preview:', pageStatus.pageText);
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\nKeeping browser open for 10 seconds...');
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
}

testStudentLearning().catch(console.error);