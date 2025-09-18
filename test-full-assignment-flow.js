const puppeteer = require('puppeteer');

async function testFullAssignmentFlow() {
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

    // 3. Get the first module ID and navigate directly to assignment page
    console.log('3. Getting module information...');
    const moduleInfo = await page.evaluate(() => {
      // Try to find module cards
      const moduleCards = document.querySelectorAll('.bg-white');
      if (moduleCards.length > 0) {
        // Look for the first Assign button
        const assignButton = document.querySelector('button:has-text("Assign"), button[class*="bg-blue"]');
        if (assignButton) {
          // Try to extract module ID from the page or button
          const href = assignButton.closest('a')?.href ||
                      assignButton.getAttribute('onclick') ||
                      assignButton.parentElement?.querySelector('a')?.href;
          return { found: true, href, buttonText: assignButton.textContent };
        }
      }
      return { found: false };
    });

    console.log('Module info:', moduleInfo);

    // 4. Click the first Assign button
    console.log('4. Clicking first Assign button...');
    const assignButtons = await page.$$('button');
    let moduleId = null;

    for (const button of assignButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.toLowerCase().includes('assign')) {
        console.log(`Found assign button: "${text}"`);

        // Click and wait for navigation
        await Promise.all([
          button.click(),
          page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {
            console.log('No navigation occurred, checking if modal opened...');
          })
        ]);

        await new Promise(r => setTimeout(r, 2000));
        break;
      }
    }

    // 5. Check current URL to see if we navigated
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    await page.screenshot({ path: 'assignment-page.png' });

    // 6. Check if we're on the assignment page
    if (currentUrl.includes('/assign')) {
      console.log('✓ On assignment page');

      // Wait for students to load
      await new Promise(r => setTimeout(r, 3000));

      // Check for students
      const studentsInfo = await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        const studentElements = document.querySelectorAll('.flex.items-center.space-x-3.p-3.border');
        const noStudentsMessage = document.querySelector('p:has-text("No students found")');

        return {
          checkboxCount: checkboxes.length,
          studentCount: studentElements.length,
          hasNoStudentsMessage: !!noStudentsMessage,
          pageText: document.body.innerText.substring(0, 500)
        };
      });

      console.log('Students info:', studentsInfo);

      if (studentsInfo.checkboxCount > 0) {
        console.log(`✓ Found ${studentsInfo.checkboxCount} student checkboxes`);

        // Select first student
        const firstCheckbox = await page.$('input[type="checkbox"]');
        await firstCheckbox.click();
        console.log('✓ Selected first student');
        await page.screenshot({ path: 'student-selected.png' });

        // Find and click assign button
        const confirmButtons = await page.$$('button');
        for (const btn of confirmButtons) {
          const btnText = await btn.evaluate(el => el.textContent);
          if (btnText && btnText.includes('Assign to')) {
            console.log(`Clicking: "${btnText}"`);
            await btn.click();
            await new Promise(r => setTimeout(r, 3000));
            await page.screenshot({ path: 'assignment-result.png' });
            console.log('✓ Assignment submitted');
            break;
          }
        }
      }
    }

    // 7. Test as student
    console.log('\n7. Logging out and testing as student...');
    await page.goto('http://localhost:3001/api/auth/signout', { waitUntil: 'networkidle0' });
    const signOutBtn = await page.$('button[type="submit"]');
    if (signOutBtn) await signOutBtn.click();

    await new Promise(r => setTimeout(r, 2000));
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });

    await page.type('input[name="emailOrUsername"]', 'student@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Student logged in');

    // Check study modules
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'student-modules-final.png' });

    const studentModules = await page.evaluate(() => {
      const modules = document.querySelectorAll('.bg-white');
      return modules.length;
    });

    console.log(`✓ Student can see ${studentModules} modules`);

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\nKeeping browser open for 10 seconds...');
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
}

testFullAssignmentFlow().catch(console.error);