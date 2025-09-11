const puppeteer = require('puppeteer');

/**
 * Simple Teacher Login Test
 * Tests login with teacher@test.com / password123
 */
async function testTeacherLogin() {
  console.log('🧪 Testing Teacher Login...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to login
    await page.goto('http://localhost:3001/login');
    console.log('📍 Navigated to login page');
    
    // Take screenshot of login page
    await page.screenshot({ path: 'teacher-login-page.png', fullPage: true });
    console.log('📸 Screenshot: teacher-login-page.png');
    
    // Fill login form
    await page.waitForSelector('input[name="emailOrUsername"]');
    await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
    console.log('✏️ Entered email');
    
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', 'password123');
    console.log('✏️ Entered password');
    
    // Submit form
    await page.click('button[type="submit"]');
    console.log('🖱️ Clicked login button');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    // Take screenshot of dashboard
    await page.screenshot({ path: 'teacher-dashboard.png', fullPage: true });
    console.log('📸 Screenshot: teacher-dashboard.png');
    
    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/exams') || !currentUrl.includes('/login')) {
      console.log('✅ Teacher login successful!');
      console.log(`📍 Current URL: ${currentUrl}`);
    } else {
      console.log('❌ Login may have failed');
      console.log(`📍 Current URL: ${currentUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testTeacherLogin().catch(console.error);
}

module.exports = testTeacherLogin;