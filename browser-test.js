const puppeteer = require('puppeteer');

async function runBrowserTest() {
  console.log('Starting browser test...');
  
  try {
    // Launch browser
    const browser = await puppeteer.launch({ 
      headless: false, // Set to true for headless mode
      defaultViewport: null,
      args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    // Navigate to a test page
    console.log('Navigating to test page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    
    // Take a screenshot
    await page.screenshot({ path: 'test-screenshot.png', fullPage: true });
    console.log('Screenshot saved as test-screenshot.png');
    
    // Example: Test form interactions
    // await page.type('#username', 'testuser');
    // await page.type('#password', 'testpass');
    // await page.click('#login-button');
    
    // Wait for navigation or specific elements
    // await page.waitForSelector('.dashboard');
    
    console.log('Browser test completed successfully');
    
    await browser.close();
  } catch (error) {
    console.error('Browser test failed:', error);
  }
}

// Export for use as module or run directly
if (require.main === module) {
  runBrowserTest();
}

module.exports = { runBrowserTest };