const puppeteer = require('puppeteer');

async function testAssignmentTracking() {
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
    console.log('✓ Teacher logged in');

    // Navigate to assignment page
    console.log('2. Navigating to assignment page...');
    await page.goto('http://localhost:3001/study/modules/cmfgde73z0001qpei496b8pna/assign', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));

    // Check page content
    console.log('3. Checking student list...');
    const pageInfo = await page.evaluate(() => {
      const students = document.querySelectorAll('.flex.items-center.space-x-3.p-3.border');
      const assignedBadges = document.querySelectorAll('.bg-blue-100.text-blue-700');
      const checkboxes = document.querySelectorAll('input[type="checkbox"]:not(:disabled)');
      const disabledCheckboxes = document.querySelectorAll('input[type="checkbox"]:disabled');
      const counterText = document.querySelector('.text-sm.text-gray-600')?.textContent;

      const studentDetails = Array.from(students).map(el => {
        const name = el.querySelector('.font-medium')?.textContent;
        const hasAssignedBadge = el.querySelector('.bg-blue-100.text-blue-700')?.textContent === 'Already Assigned';
        const checkbox = el.querySelector('input[type="checkbox"]');
        const isDisabled = checkbox?.disabled;

        return {
          name,
          hasAssignedBadge,
          isDisabled
        };
      });

      return {
        totalStudents: students.length,
        assignedCount: assignedBadges.length,
        enabledCheckboxes: checkboxes.length,
        disabledCheckboxes: disabledCheckboxes.length,
        counterText,
        studentDetails
      };
    });

    console.log('Page info:', JSON.stringify(pageInfo, null, 2));
    await page.screenshot({ path: 'assignment-tracking.png' });

    // Check if Student User (already assigned) is marked correctly
    const studentUserInfo = pageInfo.studentDetails.find(s => s.name === 'Student User');
    if (studentUserInfo) {
      if (studentUserInfo.hasAssignedBadge && studentUserInfo.isDisabled) {
        console.log('✓ Student User is correctly marked as already assigned');
      } else {
        console.log('⚠ Student User assignment status issue:', studentUserInfo);
      }
    }

    // Try to select unassigned students
    console.log('\n4. Selecting unassigned students...');
    const availableCheckboxes = await page.$$('input[type="checkbox"]:not(:disabled)');
    let selectedCount = 0;

    for (const checkbox of availableCheckboxes) {
      const isChecked = await checkbox.evaluate(el => el.checked);
      if (!isChecked && selectedCount < 2) {
        await checkbox.click();
        selectedCount++;
      }
    }

    if (selectedCount > 0) {
      console.log(`✓ Selected ${selectedCount} unassigned students`);
      await page.screenshot({ path: 'students-selected.png' });

      // Check the assign button
      const assignButton = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('Assign to'));
      });

      if (assignButton) {
        const buttonText = await assignButton.evaluate(el => el.textContent);
        console.log(`✓ Assign button shows: "${buttonText}"`);
      }
    }

    console.log('\n✅ Assignment tracking test completed!');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\nClosing browser in 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

testAssignmentTracking().catch(console.error);