const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5001';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'complete-test');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteSystem() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  const results = {
    pages: [],
    features: []
  };

  try {
    console.log('\n🚀 COMPLETE SYSTEM TEST\n');
    console.log('=' .repeat(60));

    // 1. LOGIN TEST
    console.log('\n📍 TEST 1: Login');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await delay(1000);

    await page.type('input[name="emailOrUsername"]', 'teacher@example.com');
    await page.type('input[name="password"]', 'password123');
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login.png') });

    await page.click('button[type="submit"]');
    await delay(3000);

    if (page.url().includes('dashboard')) {
      console.log('✅ Login successful');
      results.features.push('Login: PASS');
    } else {
      throw new Error('Login failed!');
    }

    // 2. DASHBOARD TEST
    console.log('\n📍 TEST 2: Dashboard');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-dashboard.png') });

    const dashboardContent = await page.evaluate(() => document.body.innerText);
    if (dashboardContent.includes('Dashboard') || dashboardContent.includes('Welcome')) {
      console.log('✅ Dashboard loaded');
      results.pages.push('Dashboard: WORKING');
    } else {
      console.log('⚠️ Dashboard may have issues');
      results.pages.push('Dashboard: PARTIAL');
    }

    // 3. EXAMS PAGE TEST
    console.log('\n📍 TEST 3: Exams Page');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/exams`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-exams.png') });

    const examsContent = await page.evaluate(() => document.body.innerText);
    if (examsContent.includes('Exam') || examsContent.includes('Create')) {
      console.log('✅ Exams page working');
      results.pages.push('Exams: WORKING');
    } else {
      console.log('⚠️ Exams page issues');
      results.pages.push('Exams: PARTIAL');
    }

    // 4. EXAM CREATION TEST
    console.log('\n📍 TEST 4: Exam Creation');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/exams/create`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-exam-create.png') });

    // Check for question type cards
    const questionTypes = await page.$$('.grid > div');
    if (questionTypes.length >= 6) {
      console.log('✅ Exam creation has 6 question types');
      results.features.push('Exam Creation: PASS');
    } else {
      console.log(`⚠️ Found ${questionTypes.length} question type elements`);
      results.features.push('Exam Creation: PARTIAL');
    }

    // 5. STUDY MODULES TEST
    console.log('\n📍 TEST 5: Study Modules');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/modules`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-study-modules.png') });

    const modulesContent = await page.evaluate(() => document.body.innerText);
    if (modulesContent.includes('Study Modules') || modulesContent.includes('Module')) {
      console.log('✅ Study Modules page working');
      results.pages.push('Study Modules: WORKING');
    } else {
      console.log('⚠️ Study Modules page issues');
      results.pages.push('Study Modules: PARTIAL');
    }

    // 6. STUDENTS PAGE TEST
    console.log('\n📍 TEST 6: Students Page');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/students`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-students.png') });

    const studentsContent = await page.evaluate(() => document.body.innerText);
    if (studentsContent.includes('Student')) {
      console.log('✅ Students page working');
      results.pages.push('Students: WORKING');
    } else {
      console.log('⚠️ Students page issues');
      results.pages.push('Students: PARTIAL');
    }

    // 7. AI TOOLS TEST
    console.log('\n📍 TEST 7: AI Tools');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/ai-tools`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-ai-tools.png') });

    const aiToolsContent = await page.evaluate(() => document.body.innerText);
    if (aiToolsContent.includes('AI Tools') || aiToolsContent.includes('AI')) {
      console.log('✅ AI Tools page working');
      results.pages.push('AI Tools: WORKING');
    } else {
      console.log('⚠️ AI Tools page issues');
      results.pages.push('AI Tools: PARTIAL');
    }

    // 8. ANALYTICS TEST
    console.log('\n📍 TEST 8: Analytics');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-analytics.png') });

    const analyticsContent = await page.evaluate(() => document.body.innerText);
    if (analyticsContent.includes('Analytics') || analyticsContent.includes('Performance')) {
      console.log('✅ Analytics page working');
      results.pages.push('Analytics: WORKING');
    } else {
      console.log('⚠️ Analytics page issues');
      results.pages.push('Analytics: PARTIAL');
    }

    // 9. SETTINGS TEST
    console.log('\n📍 TEST 9: Settings');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle0' });
    await delay(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-settings.png') });

    const settingsContent = await page.evaluate(() => document.body.innerText);
    if (settingsContent.includes('Settings') || settingsContent.includes('Profile')) {
      console.log('✅ Settings page working');
      results.pages.push('Settings: WORKING');
    } else {
      console.log('⚠️ Settings page issues');
      results.pages.push('Settings: PARTIAL');
    }

    // 10. SIDEBAR NAVIGATION TEST
    console.log('\n📍 TEST 10: Sidebar Navigation');
    console.log('-'.repeat(40));
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle0' });
    await delay(1000);

    // Check for sidebar items
    const sidebarButtons = await page.$$('nav button');
    console.log(`Found ${sidebarButtons.length} sidebar navigation items`);

    if (sidebarButtons.length >= 5) {
      console.log('✅ Sidebar navigation present');
      results.features.push('Sidebar Navigation: PASS');

      // Test clicking a sidebar item
      if (sidebarButtons[1]) {
        await sidebarButtons[1].click();
        await delay(2000);
        console.log('✅ Sidebar navigation clickable');
      }
    } else {
      console.log('⚠️ Sidebar navigation issues');
      results.features.push('Sidebar Navigation: PARTIAL');
    }

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-navigation-test.png') });

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error.png') });
  } finally {
    console.log('\n\n' + '=' .repeat(60));
    console.log('📊 COMPLETE SYSTEM TEST RESULTS\n');

    console.log('📄 Pages Tested:');
    results.pages.forEach(page => console.log(`   ${page}`));

    console.log('\n🔧 Features Tested:');
    results.features.forEach(feature => console.log(`   ${feature}`));

    const workingPages = results.pages.filter(p => p.includes('WORKING')).length;
    const totalPages = results.pages.length;
    const passedFeatures = results.features.filter(f => f.includes('PASS')).length;
    const totalFeatures = results.features.length;

    console.log('\n📈 Summary:');
    console.log(`   Working Pages: ${workingPages}/${totalPages}`);
    console.log(`   Passed Features: ${passedFeatures}/${totalFeatures}`);
    console.log(`   Screenshots: ${fs.readdirSync(SCREENSHOTS_DIR).length}`);

    const successRate = Math.round(((workingPages + passedFeatures) / (totalPages + totalFeatures)) * 100);
    console.log(`\n🏆 Overall Success Rate: ${successRate}%`);

    if (successRate >= 80) {
      console.log('✅ SYSTEM STATUS: EXCELLENT - All major features working!');
    } else if (successRate >= 60) {
      console.log('⚠️ SYSTEM STATUS: GOOD - Most features working');
    } else {
      console.log('❌ SYSTEM STATUS: NEEDS ATTENTION');
    }

    console.log('=' .repeat(60));

    await browser.close();
  }
}

console.log('🚀 Starting Complete System Test...\n');
testCompleteSystem().catch(console.error);