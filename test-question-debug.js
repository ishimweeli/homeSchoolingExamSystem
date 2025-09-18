const puppeteer = require('puppeteer');

async function debugQuestion() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  try {
    // Login as student
    console.log('1. Logging in as student...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle0' });
    await page.type('input[name="emailOrUsername"]', 'student@test.com');
    await page.type('input[name="password"]', 'password123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    console.log('✓ Student logged in');

    // Navigate directly to the module
    console.log('2. Navigating to module...');
    await page.goto('http://localhost:3001/study/modules/cmfgde73z0001qpei496b8pna', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 3000));

    // Check what's on the page
    console.log('3. Checking page content...');
    const pageInfo = await page.evaluate(() => {
      const questionText = document.querySelector('.bg-gray-50 h3')?.textContent;
      const inputField = document.querySelector('input[type="text"]');
      const multipleChoiceButtons = document.querySelectorAll('button.w-full.text-left');
      const checkAnswerButton = document.querySelector('button:contains("Check Answer")');

      // Try to find the Check Answer button
      const buttons = Array.from(document.querySelectorAll('button'));
      const checkBtn = buttons.find(btn => btn.textContent.includes('Check Answer'));

      return {
        questionText,
        hasInputField: !!inputField,
        inputFieldValue: inputField?.value,
        inputFieldPlaceholder: inputField?.placeholder,
        inputFieldDisabled: inputField?.disabled,
        hasMultipleChoice: multipleChoiceButtons.length > 0,
        multipleChoiceCount: multipleChoiceButtons.length,
        hasCheckButton: !!checkBtn,
        checkButtonText: checkBtn?.textContent,
        checkButtonDisabled: checkBtn?.disabled
      };
    });

    console.log('Page info:', JSON.stringify(pageInfo, null, 2));

    // If there's an input field, try to type in it
    if (pageInfo.hasInputField) {
      console.log('4. Typing answer in input field...');
      const inputField = await page.$('input[type="text"]');
      if (inputField) {
        await inputField.type('7');
        await new Promise(r => setTimeout(r, 1000));

        // Check if the value was entered
        const newValue = await inputField.evaluate(el => el.value);
        console.log('Input field value after typing:', newValue);

        // Try to click Check Answer
        const checkButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Check Answer'));
        });

        if (checkButton) {
          console.log('5. Clicking Check Answer...');
          await checkButton.click();
          await new Promise(r => setTimeout(r, 2000));
          await page.screenshot({ path: 'after-check-answer.png' });
        }
      }
    }

    await page.screenshot({ path: 'question-debug.png' });

  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\nKeeping browser open for inspection...');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
}

debugQuestion().catch(console.error);