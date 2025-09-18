// Very simple test to check what's happening
const puppeteer = require('puppeteer');

async function simpleTest() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: { width: 1200, height: 800 }
    });
    const page = await browser.newPage();
    
    try {
        console.log('Going to login page...');
        await page.goto('http://localhost:3003/login');
        
        console.log('Taking screenshot...');
        await page.screenshot({ path: 'debug-login.png' });
        
        console.log('Page title:', await page.title());
        console.log('Page URL:', page.url());
        
        // Check if inputs exist
        const emailInput = await page.$('input[name="emailOrUsername"]');
        const passwordInput = await page.$('input[name="password"]');
        const submitButton = await page.$('button[type="submit"]');
        
        console.log('Email input exists:', !!emailInput);
        console.log('Password input exists:', !!passwordInput);
        console.log('Submit button exists:', !!submitButton);
        
        if (emailInput && passwordInput && submitButton) {
            console.log('Filling form...');
            await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
            await page.type('input[name="password"]', 'password123');
            
            console.log('Clicking submit...');
            await submitButton.click();
            
            // Wait a bit and see what happens
            await page.waitForTimeout(3000);
            console.log('After submit - URL:', page.url());
            
            await page.screenshot({ path: 'debug-after-submit.png' });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        await page.screenshot({ path: 'debug-error.png' });
    }
    
    await browser.close();
}

simpleTest();