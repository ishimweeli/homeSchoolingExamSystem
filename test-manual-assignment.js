const puppeteer = require('puppeteer');

async function testManualAssignment() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    slowMo: 100 // Slow down actions to see what's happening
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    console.log('2. Filling login form...');
    await page.type('input[name="emailOrUsername"]', 'johndoe@example.com');
    await page.type('input[name="password"]', 'password123');

    console.log('3. Clicking sign in button...');
    await page.click('button[type="submit"]');

    // Wait for either navigation or error message
    await new Promise(r => setTimeout(r, 5000));

    // Check if we're still on login page
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('login')) {
      console.log('Still on login page, checking for error message...');
      const errorMessage = await page.$eval('.text-red-500, .text-red-600, .error, [role="alert"]', el => el.textContent).catch(() => null);
      if (errorMessage) {
        console.log('Error message:', errorMessage);
      }

      // Take screenshot to see what happened
      await page.screenshot({ path: 'login-failed.png' });

      // Try with username instead
      console.log('Trying with username instead of email...');
      await page.evaluate(() => {
        document.querySelector('input[name="emailOrUsername"]').value = '';
        document.querySelector('input[name="password"]').value = '';
      });

      await page.type('input[name="emailOrUsername"]', 'teacher1');
      await page.type('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await new Promise(r => setTimeout(r, 5000));
      const newUrl = page.url();
      console.log('URL after username attempt:', newUrl);
    }

    // If we made it to dashboard
    if (!page.url().includes('login')) {
      console.log('✓ Successfully logged in!');
      await page.screenshot({ path: 'dashboard.png' });

      // Navigate to study modules
      console.log('4. Navigating to study modules...');
      await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 3000));
      await page.screenshot({ path: 'study-modules.png' });

      // Look for modules on the page
      const moduleCards = await page.$$('.bg-white');
      console.log(`Found ${moduleCards.length} module cards`);

      if (moduleCards.length > 0) {
        // Look for assign button
        const buttons = await page.$$('button');
        for (const button of buttons) {
          const text = await button.evaluate(el => el.textContent);
          console.log(`Button text: "${text}"`);
          if (text && text.toLowerCase().includes('assign')) {
            console.log('Found assign button, clicking...');
            await button.click();
            await new Promise(r => setTimeout(r, 2000));
            await page.screenshot({ path: 'assign-modal.png' });

            // Look for student selection
            const checkboxes = await page.$$('input[type="checkbox"]');
            if (checkboxes.length > 0) {
              console.log('Selecting student...');
              await checkboxes[0].click();
              await page.screenshot({ path: 'student-selected.png' });

              // Look for confirm button
              const confirmButtons = await page.$$('button');
              for (const btn of confirmButtons) {
                const btnText = await btn.evaluate(el => el.textContent);
                if (btnText && (btnText.includes('Confirm') || btnText.includes('Assign') || btnText.includes('Save'))) {
                  console.log(`Clicking ${btnText} button...`);
                  await btn.click();
                  await new Promise(r => setTimeout(r, 3000));
                  await page.screenshot({ path: 'assignment-result.png' });
                  break;
                }
              }
            }
            break;
          }
        }
      }
    }

    console.log('\n✅ Test complete!');
    console.log('Check the screenshots to see what happened.');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\nKeeping browser open for manual inspection...');
  console.log('Press Ctrl+C to close.');

  // Keep browser open for manual inspection
  await new Promise(r => setTimeout(r, 60000));

  await browser.close();
}

testManualAssignment().catch(console.error);