const puppeteer = require('puppeteer');

async function debugLogin() {
  console.log('🔍 Debugging login page...');
  
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
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Take screenshot
    await page.screenshot({ path: 'debug-login-page.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-login-page.png');
    
    // Get page HTML
    const html = await page.content();
    console.log('📄 Page HTML length:', html.length);
    
    // Try to find any input elements
    const inputs = await page.$$eval('input', elements => 
      elements.map(el => ({
        type: el.type,
        name: el.name,
        id: el.id,
        className: el.className,
        placeholder: el.placeholder
      }))
    );
    
    console.log('🔍 Found inputs:', inputs);
    
    // Check for forms
    const forms = await page.$$eval('form', elements => 
      elements.map(el => ({
        action: el.action,
        method: el.method,
        className: el.className,
        id: el.id
      }))
    );
    
    console.log('📝 Found forms:', forms);
    
    // Get page title and URL
    console.log('📍 Page URL:', page.url());
    console.log('📄 Page title:', await page.title());
    
    // Check if there are any error messages or loading states
    const bodyText = await page.$eval('body', el => el.innerText);
    console.log('📄 Page body text (first 500 chars):', bodyText.substring(0, 500));
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugLogin().catch(console.error);