const puppeteer = require('puppeteer');

async function testLogin() {
  const browser = await puppeteer.launch({
    headless: false, // Show browser to see what's happening
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  
  console.log('Opening login page...');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  
  console.log('Taking screenshot before login...');
  await page.screenshot({ path: 'before-login.png' });
  
  // Wait for form elements
  await page.waitForSelector('input[name="emailOrUsername"]');
  await page.waitForSelector('input[name="password"]');
  await page.waitForSelector('button[type="submit"]');
  
  console.log('Filling in student credentials...');
  await page.type('input[name="emailOrUsername"]', 'student@test.com');
  await page.type('input[name="password"]', 'password123');
  
  console.log('Clicking submit button...');
  await page.click('button[type="submit"]');
  
  // Wait a bit for response
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Taking screenshot after login attempt...');
  await page.screenshot({ path: 'after-login.png' });
  
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);
  
  // Check for error messages
  const errorMessage = await page.evaluate(() => {
    const toasts = document.querySelectorAll('[data-sonner-toast]');
    if (toasts.length > 0) {
      return Array.from(toasts).map(t => t.textContent).join(', ');
    }
    return null;
  });
  
  if (errorMessage) {
    console.log('Error message found:', errorMessage);
  }
  
  // Keep browser open for 5 seconds to see result
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await browser.close();
}

testLogin().catch(console.error);