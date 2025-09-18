const puppeteer = require('puppeteer');

async function testStudentsAPI() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // First login as teacher
    console.log('1. Logging in as teacher...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);

    // Now test the students API
    console.log('2. Testing /api/students endpoint...');
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/students');
      const data = await res.json();
      return { status: res.status, data };
    });

    console.log('API Response:', JSON.stringify(response, null, 2));

    if (response.data.students) {
      console.log(`\n✓ Found ${response.data.students.length} students`);
      response.data.students.forEach(student => {
        console.log(`  - ${student.name} (${student.email})`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  await browser.close();
}

testStudentsAPI().catch(console.error);