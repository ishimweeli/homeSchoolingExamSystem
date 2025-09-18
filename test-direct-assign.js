const puppeteer = require('puppeteer');

async function testDirectAssign() {
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

    // Direct API call to assign module
    console.log('2. Assigning module via API...');
    const assignResult = await page.evaluate(async () => {
      const response = await fetch('/api/study-modules/cmfgde73z0001qpei496b8pna/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: ['cmeqs8hfy00049d9ez39zw3fk'], // Student User
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          instructions: 'Please complete this module by next week'
        })
      });
      const data = await response.json();
      return { status: response.status, data };
    });

    console.log('Assignment result:', JSON.stringify(assignResult, null, 2));

    if (assignResult.status === 200) {
      console.log('✓ Module assigned successfully!');
    }

    // Now check as student
    console.log('\n3. Logging out...');
    await page.goto('http://localhost:3001/api/auth/signout', { waitUntil: 'networkidle0' });
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2000));

    console.log('4. Logging in as student...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'student@test.com');
    await page.type('input[name="password"]', 'password123');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Student logged in');

    // Check study modules
    console.log('5. Checking student study modules...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'student-assigned-modules.png' });

    // Check for assigned modules via API
    const assignedModules = await page.evaluate(async () => {
      const response = await fetch('/api/study-modules/assigned');
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return null;
    });

    if (assignedModules) {
      console.log('✓ Student has assigned modules:', assignedModules);
    }

    console.log('\n✅ Assignment test completed!');

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testDirectAssign().catch(console.error);