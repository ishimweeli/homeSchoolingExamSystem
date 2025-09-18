const puppeteer = require('puppeteer');

async function testAppBasics() {
  console.log('🚀 Testing Homeschool Exam System...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 100,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test 1: Homepage loads
    console.log('📖 Testing homepage...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.screenshot({ path: 'test-homepage.png' });
    console.log('✅ Homepage loaded successfully');
    
    // Test 2: Navigation works
    console.log('🔐 Testing login page...');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-login.png' });
    console.log('✅ Login page loaded successfully');
    
    // Test 3: Check if exam creation page exists
    console.log('📝 Testing exam creation access...');
    await page.goto('http://localhost:3001/exams/create', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'test-exam-create.png' });
    console.log('✅ Exam creation page accessible');
    
    console.log('🎉 Basic functionality test PASSED!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
}

testAppBasics();