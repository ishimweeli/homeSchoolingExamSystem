const puppeteer = require('puppeteer');

async function testProgressFlow() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    // 1. Login as teacher and check progress page
    console.log('1. Logging in as teacher...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Teacher logged in');

    // 2. Navigate to Student Progress page
    console.log('2. Navigating to Student Progress page...');
    await page.goto('http://localhost:3001/study/progress', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'teacher-progress-dashboard.png' });

    // Check page content
    const progressInfo = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent;
      const stats = document.querySelectorAll('.text-3xl.font-bold');
      const studentCards = document.querySelectorAll('.border.rounded-lg.p-4');

      const studentsProgress = Array.from(studentCards).map(card => {
        const name = card.querySelector('.font-semibold')?.textContent;
        const progress = card.querySelector('.font-semibold:last-child')?.textContent;
        const status = card.querySelector('[class*="bg-"][class*="50"]')?.textContent;
        return { name, progress, status };
      });

      return {
        title,
        totalStudents: stats[0]?.textContent,
        averageProgress: stats[1]?.textContent,
        completed: stats[2]?.textContent,
        activeToday: stats[3]?.textContent,
        studentsProgress
      };
    });

    console.log('Progress Dashboard Info:', JSON.stringify(progressInfo, null, 2));

    // 3. Check if Student User progress is shown
    const studentUser = progressInfo.studentsProgress.find(s => s.name === 'Student User');
    if (studentUser) {
      console.log(`✓ Student User progress visible: ${studentUser.progress}`);
    }

    // 4. Now login as student and complete some lessons
    console.log('\n3. Logging out and logging in as student...');
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

    // 5. Check student's study modules
    console.log('4. Checking student modules...');
    await page.goto('http://localhost:3001/study', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'student-modules-with-progress.png' });

    const moduleInfo = await page.evaluate(() => {
      const progressElement = document.querySelector('[class*="Progress"]')?.nextElementSibling;
      const progressText = document.querySelector('span:contains("%")')?.textContent ||
                          Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('%'))?.textContent;
      const lessonText = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('Lesson'))?.textContent;
      const xpText = Array.from(document.querySelectorAll('span')).find(el => el.textContent.includes('XP'))?.textContent;

      return {
        progress: progressText,
        lesson: lessonText,
        xp: xpText
      };
    });

    console.log('Student Module Info:', moduleInfo);

    // 6. Go back as teacher to check updated progress
    console.log('\n5. Logging back in as teacher to check updated progress...');
    await page.goto('http://localhost:3001/api/auth/signout', { waitUntil: 'networkidle0' });
    const signOutBtn2 = await page.$('button[type="submit"]');
    if (signOutBtn2) await signOutBtn2.click();
    await new Promise(r => setTimeout(r, 2000));

    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    await page.goto('http://localhost:3001/study/progress', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'teacher-sees-updated-progress.png' });

    console.log('\n✅ Progress tracking test completed!');
    console.log('Check the screenshots to see:');
    console.log('  - teacher-progress-dashboard.png: Teacher progress view');
    console.log('  - student-modules-with-progress.png: Student module with progress');
    console.log('  - teacher-sees-updated-progress.png: Teacher sees student progress');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: `error-${Date.now()}.png` });
  }

  console.log('\nClosing browser in 5 seconds...');
  await new Promise(r => setTimeout(r, 5000));
  await browser.close();
}

testProgressFlow().catch(console.error);