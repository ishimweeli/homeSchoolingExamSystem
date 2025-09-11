const puppeteer = require('puppeteer');

/**
 * Simple Student Login Test
 * Tests login with student@test.com / password123
 */
async function testStudentLogin() {
  console.log('🧪 Testing Student Login...');
  
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
    await page.screenshot({ path: 'student-login-page.png', fullPage: true });
    console.log('📸 Screenshot: student-login-page.png');
    
    // Fill login form
    await page.waitForSelector('input[name="emailOrUsername"]');
    await page.type('input[name="emailOrUsername"]', 'student@test.com');
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
    await page.screenshot({ path: 'student-dashboard.png', fullPage: true });
    console.log('📸 Screenshot: student-dashboard.png');
    
    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/exams') || !currentUrl.includes('/login')) {
      console.log('✅ Student login successful!');
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
  testStudentLogin().catch(console.error);
}

module.exports = testStudentLogin;