const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3002';
const TEACHER_EMAIL = 'teacher@test.com';
const TEACHER_PASSWORD = 'password123';

async function testAIGeneration() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  
  try {
    console.log('🧪 Testing AI Generation with Extended Timeout');
    
    // Login as teacher
    console.log('📋 Logging in as teacher...');
    await page.goto(`${BASE_URL}/login`);
    
    await page.focus('input[name="emailOrUsername"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.type('input[name="emailOrUsername"]', TEACHER_EMAIL);
    
    await page.focus('input[name="password"]');
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.type('input[name="password"]', TEACHER_PASSWORD);
    
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    console.log('✅ Teacher login successful');
    
    // Navigate to create module
    console.log('📋 Navigating to create module...');
    await page.goto(`${BASE_URL}/study/create`);
    await page.waitForSelector('text=Create Interactive Study Module', { timeout: 10000 });
    
    // Fill form
    console.log('📋 Filling form...');
    const topicInput = await page.waitForSelector('#topic', { timeout: 5000 });
    await topicInput.type('Simple Present Tense');
    await page.select('select#subject', 'English');
    await page.select('select#gradeLevel', '5');
    await page.select('select#numberOfLessons', '10');
    
    console.log('📋 Submitting form with 60-second timeout...');
    const startTime = Date.now();
    await page.click('button[type="submit"]');
    
    // Wait with extended timeout (60 seconds)
    let completed = false;
    const maxWaitTime = 60000; // 60 seconds
    const checkInterval = 2000;

    while (!completed && (Date.now() - startTime) < maxWaitTime) {
      try {
        const currentUrl = page.url();
        if (currentUrl.includes('/study/modules/')) {
          completed = true;
          const moduleId = currentUrl.split('/study/modules/')[1];
          const generationTime = Date.now() - startTime;
          console.log(`✅ AI generation successful! Module ID: ${moduleId}`);
          console.log(`🕒 Generation time: ${generationTime}ms`);
          
          // Take screenshot of success
          await page.screenshot({ path: 'ai-generation-success.png', fullPage: true });
          
          return { success: true, moduleId, generationTime };
        }

        const successToast = await page.$('text=Study module created successfully!');
        if (successToast) {
          completed = true;
          const generationTime = Date.now() - startTime;
          console.log('✅ AI generation successful (toast detected)!');
          console.log(`🕒 Generation time: ${generationTime}ms`);
          return { success: true, generationTime };
        }

        const errorToast = await page.$('text=Failed to create study module');
        if (errorToast) {
          throw new Error('AI generation failed - error toast');
        }

        await page.waitForTimeout(checkInterval);
      } catch (e) {
        // Continue checking
      }
    }
    
    if (!completed) {
      console.log('❌ AI generation timeout after 60 seconds');
      await page.screenshot({ path: 'ai-generation-timeout.png', fullPage: true });
      return { success: false, error: 'Timeout' };
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ path: 'ai-generation-error.png', fullPage: true });
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

testAIGeneration().then(result => {
  console.log('\n📊 Test Result:', result);
}).catch(console.error);