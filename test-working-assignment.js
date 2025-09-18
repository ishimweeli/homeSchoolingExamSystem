const puppeteer = require('puppeteer');

async function testWorkingAssignment() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    // 1. Login as teacher
    console.log('1. Logging in as teacher...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Teacher logged in');

    // 2. Go to study modules
    console.log('2. Navigating to study modules...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Find module ID and navigate directly
    console.log('3. Finding a module to assign...');
    const moduleId = await page.evaluate(() => {
      // Find the first link that contains '/assign'
      const assignLink = document.querySelector('a[href*="/assign"]');
      if (assignLink) {
        const href = assignLink.getAttribute('href');
        const match = href.match(/modules\/([^\/]+)\/assign/);
        return match ? match[1] : null;
      }
      return null;
    });

    if (moduleId) {
      console.log(`Found module ID: ${moduleId}`);

      // 4. Navigate directly to assignment page
      console.log('4. Navigating to assignment page...');
      await page.goto(`http://localhost:3001/study/modules/${moduleId}/assign`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 3000));

      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      await page.screenshot({ path: 'on-assignment-page.png' });

      // 5. Wait for students to load and check
      console.log('5. Checking for students...');
      const studentCheckboxes = await page.$$('input[type="checkbox"]');
      console.log(`Found ${studentCheckboxes.length} student checkboxes`);

      if (studentCheckboxes.length > 0) {
        // 6. Select first student
        console.log('6. Selecting first student...');
        await studentCheckboxes[0].click();
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'student-selected.png' });

        // 7. Add optional instructions
        console.log('7. Adding instructions...');
        const instructionsField = await page.$('textarea[id="instructions"]');
        if (instructionsField) {
          await instructionsField.type('Please complete this module by the end of the week.');
        }

        // 8. Click assign button
        console.log('8. Looking for assign button...');
        const assignButtons = await page.$$('button');
        for (const btn of assignButtons) {
          const btnText = await btn.evaluate(el => el.textContent.trim());
          if (btnText && btnText.includes('Assign to')) {
            console.log(`Clicking: "${btnText}"`);
            await btn.click();
            await new Promise(r => setTimeout(r, 3000));

            // Check if we navigated away (success) or if there's an error
            const newUrl = page.url();
            if (newUrl !== currentUrl) {
              console.log('✓ Assignment successful! Redirected to:', newUrl);
            } else {
              console.log('Still on assignment page, checking for messages...');
              const messages = await page.evaluate(() => {
                const toasts = document.querySelectorAll('[role="status"], [role="alert"]');
                return Array.from(toasts).map(t => t.textContent);
              });
              if (messages.length > 0) {
                console.log('Messages:', messages);
              }
            }
            await page.screenshot({ path: 'after-assignment.png' });
            break;
          }
        }
      } else {
        console.log('No students found - checking page content...');
        const pageText = await page.evaluate(() => document.body.innerText);
        if (pageText.includes('No students found')) {
          console.log('⚠ Message: No students found. Add students first.');
        }
      }
    } else {
      console.log('No modules found with assign links');
    }

    // 9. Now test as student
    console.log('\n9. Switching to student account...');
    await page.goto('http://localhost:3001/api/auth/signout', { waitUntil: 'networkidle0' });
    const signOutBtn = await page.$('button[type="submit"]');
    if (signOutBtn) {
      await signOutBtn.click();
      await new Promise(r => setTimeout(r, 2000));
    }

    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'student@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Student logged in');

    // 10. Check study modules as student
    console.log('10. Checking student study modules...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'student-study-page.png' });

    const studentModulesInfo = await page.evaluate(() => {
      const modules = document.querySelectorAll('.bg-white');
      const assignedBadges = document.querySelectorAll('[class*="badge"], [class*="assigned"]');
      return {
        moduleCount: modules.length,
        assignedCount: assignedBadges.length,
        pageHasContent: document.body.innerText.length > 100
      };
    });

    console.log('Student modules info:', studentModulesInfo);
    console.log(`✓ Student can see ${studentModulesInfo.moduleCount} modules`);

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\nClosing browser...');
  await browser.close();
}

testWorkingAssignment().catch(console.error);