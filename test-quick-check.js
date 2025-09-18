const puppeteer = require('puppeteer');

async function quickCheck() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log('Navigating to login page...');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'current-login-page.png' });
  console.log('Screenshot saved as current-login-page.png');

  // Check what elements are on the page
  const inputs = await page.evaluate(() => {
    const allInputs = document.querySelectorAll('input');
    return Array.from(allInputs).map(input => ({
      type: input.type,
      name: input.name,
      id: input.id,
      placeholder: input.placeholder,
      className: input.className
    }));
  });

  console.log('Found inputs:', JSON.stringify(inputs, null, 2));

  // Try to find the actual email field
  const emailField = await page.$('input[type="email"]') ||
                     await page.$('input[placeholder*="email" i]') ||
                     await page.$('input[id*="email" i]') ||
                     await page.$('input[name*="email" i]');

  if (emailField) {
    console.log('Found email field!');
    await emailField.type('johndoe@example.com');

    // Find password field
    const passwordField = await page.$('input[type="password"]') ||
                         await page.$('input[placeholder*="password" i]') ||
                         await page.$('input[id*="password" i]') ||
                         await page.$('input[name*="password" i]');

    if (passwordField) {
      console.log('Found password field!');
      await passwordField.type('password123');

      // Find submit button
      const submitButton = await page.$('button[type="submit"]') ||
                          await page.$('button:has-text("Sign")') ||
                          await page.$('button:has-text("Login")');

      if (submitButton) {
        console.log('Clicking submit button...');
        await submitButton.click();

        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        await page.screenshot({ path: 'after-login.png' });
        console.log('Login successful! Screenshot saved as after-login.png');

        // Check current URL
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
      }
    }
  } else {
    console.log('Could not find email field');
  }

  await browser.close();
}

quickCheck().catch(console.error);