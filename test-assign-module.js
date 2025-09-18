const puppeteer = require('puppeteer');

async function testAssignment() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('2. Logging in as teacher...');
    await page.type('input[name="emailOrUsername"]', 'johndoe@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.screenshot({ path: 'login-filled.png' });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);
    await page.screenshot({ path: 'after-teacher-login.png' });

    // Go to study modules page
    console.log('3. Going to study page...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'study-page.png' });

    // Look for assign buttons
    console.log('4. Looking for assign buttons...');
    const assignButtons = await page.$$('button');
    console.log(`Found ${assignButtons.length} buttons`);

    // Click the first assign-related button
    for (let i = 0; i < assignButtons.length; i++) {
      const buttonText = await assignButtons[i].evaluate(el => el.textContent);
      if (buttonText && buttonText.toLowerCase().includes('assign')) {
        console.log(`Clicking button: "${buttonText}"`);
        await assignButtons[i].click();
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'after-assign-click.png' });
        break;
      }
    }

    // Check if a modal or new page opened
    await new Promise(r => setTimeout(r, 2000));

    // Look for student checkboxes
    const checkboxes = await page.$$('input[type="checkbox"]');
    console.log(`Found ${checkboxes.length} checkboxes`);

    if (checkboxes.length > 0) {
      console.log('5. Selecting first student...');
      await checkboxes[0].click();
      await page.screenshot({ path: 'student-selected.png' });

      // Look for confirm button
      const buttons = await page.$$('button');
      for (let i = 0; i < buttons.length; i++) {
        const buttonText = await buttons[i].evaluate(el => el.textContent);
        if (buttonText && (buttonText.includes('Assign') || buttonText.includes('Submit') || buttonText.includes('Confirm'))) {
          console.log(`Clicking confirm button: "${buttonText}"`);
          await buttons[i].click();
          await new Promise(r => setTimeout(r, 3000));
          await page.screenshot({ path: 'assignment-complete.png' });
          break;
        }
      }
    }

    console.log('✅ Test completed!');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  await browser.close();
}

testAssignment().catch(console.error);