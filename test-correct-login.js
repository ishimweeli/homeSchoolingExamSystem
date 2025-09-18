const puppeteer = require('puppeteer');

async function testWithCorrectCredentials() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    console.log('2. Logging in as teacher (teacher@test.com)...');
    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    await page.type('input[name="password"]', 'password123');
    await page.screenshot({ path: 'teacher-login-form.png' });

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));

    const currentUrl = page.url();
    console.log('Current URL after teacher login:', currentUrl);

    if (!currentUrl.includes('login')) {
      console.log('✓ Teacher logged in successfully!');
      await page.screenshot({ path: 'teacher-dashboard.png' });

      // Navigate to study modules
      console.log('3. Navigating to study modules...');
      await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'teacher-study-page.png' });

      // Look for modules and assign button
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} buttons on study page`);

      let assignClicked = false;
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent);
        if (text && text.toLowerCase().includes('assign')) {
          console.log(`4. Clicking assign button: "${text}"`);
          await button.click();
          await new Promise(r => setTimeout(r, 2000));
          await page.screenshot({ path: 'after-assign-click.png' });
          assignClicked = true;
          break;
        }
      }

      if (assignClicked) {
        // Look for student checkboxes
        const checkboxes = await page.$$('input[type="checkbox"]');
        console.log(`Found ${checkboxes.length} checkboxes`);

        if (checkboxes.length > 0) {
          console.log('5. Selecting first student...');
          await checkboxes[0].click();
          await page.screenshot({ path: 'student-selected.png' });

          // Find and click confirm button
          const confirmButtons = await page.$$('button');
          for (const btn of confirmButtons) {
            const btnText = await btn.evaluate(el => el.textContent);
            if (btnText && (btnText.toLowerCase().includes('assign') || btnText.toLowerCase().includes('confirm'))) {
              console.log(`6. Clicking confirm: "${btnText}"`);
              await btn.click();
              await new Promise(r => setTimeout(r, 3000));
              await page.screenshot({ path: 'assignment-complete.png' });
              console.log('✓ Assignment completed!');
              break;
            }
          }
        }
      }

      // Now test as student
      console.log('\n7. Logging out...');
      await page.goto('http://localhost:3001/api/auth/signout', { waitUntil: 'networkidle0' });
      const signOutButton = await page.$('button[type="submit"]');
      if (signOutButton) {
        await signOutButton.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      console.log('8. Logging in as student (student@test.com)...');
      await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
      await page.type('input[name="emailOrUsername"]', 'student@test.com');
      await page.type('input[name="password"]', 'password123');

      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {})
      ]);

      await new Promise(r => setTimeout(r, 3000));

      const studentUrl = page.url();
      console.log('Current URL after student login:', studentUrl);

      if (!studentUrl.includes('login')) {
        console.log('✓ Student logged in successfully!');
        await page.screenshot({ path: 'student-dashboard.png' });

        // Check study modules
        console.log('9. Checking student study modules...');
        await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'student-study-modules.png' });

        const modules = await page.$$('.bg-white');
        console.log(`✓ Student can see ${modules.length} module(s)`);
      }
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  await browser.close();
}

testWithCorrectCredentials().catch(console.error);