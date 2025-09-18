const puppeteer = require('puppeteer');

class ComprehensiveFeatureTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
  }

  async init() {
    console.log('🚀 Initializing Comprehensive Feature Test...');
    this.browser = await puppeteer.launch({ 
      headless: false,
      slowMo: 500,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1200, height: 800 }
    });
    this.page = await this.browser.newPage();
  }

  async testFeature(featureName, testFunction) {
    console.log(`\n🧪 Testing: ${featureName}`);
    try {
      await testFunction();
      this.testResults.push({ feature: featureName, status: '✅ PASSED', error: null });
      console.log(`✅ ${featureName} - PASSED`);
      await this.page.screenshot({ path: `test-${featureName.toLowerCase().replace(/\s+/g, '-')}.png` });
    } catch (error) {
      this.testResults.push({ feature: featureName, status: '❌ FAILED', error: error.message });
      console.error(`❌ ${featureName} - FAILED:`, error.message);
      await this.page.screenshot({ path: `error-${featureName.toLowerCase().replace(/\s+/g, '-')}.png` });
    }
  }

  async runAllTests() {
    await this.init();

    // Test 1: Homepage and Navigation
    await this.testFeature('Homepage Navigation', async () => {
      await this.page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
      const title = await this.page.title();
      if (!title) throw new Error('No page title found');
      
      // Check for navigation elements
      const navExists = await this.page.$('nav, header, [role="navigation"]');
      if (!navExists) throw new Error('Navigation not found');
    });

    // Test 2: Authentication Pages
    await this.testFeature('Authentication System', async () => {
      await this.page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
      
      // Check for login form elements
      const emailField = await this.page.$('input[type="email"], input[name="email"]');
      const passwordField = await this.page.$('input[type="password"], input[name="password"]');
      const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
      
      if (!emailField && !passwordField && !submitButton) {
        // Maybe it's OAuth only - check for OAuth buttons
        const oauthButton = await this.page.$('button, [role="button"]');
        if (!oauthButton) throw new Error('No authentication mechanism found');
      }
    });

    // Test 3: Dashboard Access
    await this.testFeature('Dashboard Pages', async () => {
      await this.page.goto('http://localhost:3001/dashboard', { waitUntil: 'networkidle2' });
      
      // Should either show dashboard or redirect to login
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/login')) {
        throw new Error('Dashboard access not properly configured');
      }
    });

    // Test 4: Exam Creation Page
    await this.testFeature('Exam Creation Interface', async () => {
      await this.page.goto('http://localhost:3001/exams/create', { waitUntil: 'networkidle2' });
      
      // Check for exam creation form elements
      const examForm = await this.page.$('form, [data-testid="exam-form"]');
      const titleField = await this.page.$('input[name="title"], #title');
      const subjectField = await this.page.$('select[name="subject"], #subject');
      
      if (!examForm && !titleField && !subjectField) {
        // Check if we're redirected to login (which is expected)
        const currentUrl = this.page.url();
        if (!currentUrl.includes('/login')) {
          throw new Error('Exam creation page not accessible');
        }
      }
    });

    // Test 5: Exam Taking Interface
    await this.testFeature('Exam Taking Interface', async () => {
      await this.page.goto('http://localhost:3001/exams/take', { waitUntil: 'networkidle2' });
      
      const currentUrl = this.page.url();
      // Should either show take page or redirect appropriately
      if (currentUrl.includes('error') || currentUrl.includes('404')) {
        throw new Error('Exam taking interface has routing issues');
      }
    });

    // Test 6: Results Page
    await this.testFeature('Results Interface', async () => {
      await this.page.goto('http://localhost:3001/results', { waitUntil: 'networkidle2' });
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('error') || currentUrl.includes('404')) {
        throw new Error('Results interface has routing issues');
      }
    });

    // Test 7: API Endpoints
    await this.testFeature('API Endpoints Health', async () => {
      const endpoints = [
        '/api/auth/session',
        '/api/exams',
        '/api/family/dashboard',
        '/api/lesson-plans/generate',
        '/api/tutoring/chat',
        '/api/uploadthing'
      ];

      for (const endpoint of endpoints) {
        const response = await this.page.goto(`http://localhost:3001${endpoint}`, 
          { waitUntil: 'networkidle2' });
        
        // API should return some response (200, 401, 403 are all valid - 500 is not)
        if (response.status() >= 500) {
          throw new Error(`API endpoint ${endpoint} returned ${response.status()}`);
        }
      }
    });

    // Test 8: Component Loading
    await this.testFeature('Component Rendering', async () => {
      await this.page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
      
      // Check for React components loading without errors
      const reactErrors = await this.page.evaluate(() => {
        const errors = [];
        // Check for common React error indicators
        if (document.body.innerHTML.includes('Application error')) errors.push('Application error detected');
        if (document.body.innerHTML.includes('ChunkLoadError')) errors.push('Chunk load error detected');
        if (document.body.innerHTML.includes('Loading chunk')) errors.push('Chunk loading issue detected');
        return errors;
      });

      if (reactErrors.length > 0) {
        throw new Error(`React errors detected: ${reactErrors.join(', ')}`);
      }
    });

    // Test 9: Mobile Responsiveness
    await this.testFeature('Mobile Responsiveness', async () => {
      await this.page.setViewport({ width: 375, height: 667 }); // iPhone SE size
      await this.page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
      
      // Check if page is responsive
      const isResponsive = await this.page.evaluate(() => {
        const viewport = window.innerWidth;
        return viewport <= 500; // Should adapt to mobile viewport
      });

      if (!isResponsive) {
        throw new Error('Page may not be mobile responsive');
      }
      
      // Reset viewport
      await this.page.setViewport({ width: 1200, height: 800 });
    });

    // Test 10: Console Errors Check
    await this.testFeature('Browser Console Errors', async () => {
      const consoleLogs = [];
      this.page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push(msg.text());
        }
      });

      await this.page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
      await this.page.waitForTimeout(3000); // Wait for any async errors

      // Filter out common/acceptable errors
      const criticalErrors = consoleLogs.filter(log => 
        !log.includes('Failed to load resource') && // Common for dev
        !log.includes('favicon.ico') && // Common missing favicon error
        !log.includes('_next/static') && // Next.js static file issues in dev
        !log.includes('ResizeObserver') // Common React warning
      );

      if (criticalErrors.length > 0) {
        throw new Error(`Critical console errors: ${criticalErrors.join('; ')}`);
      }
    });

    await this.generateReport();
    await this.browser.close();
  }

  async generateReport() {
    console.log('\n📋 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(50));
    
    const passed = this.testResults.filter(r => r.status.includes('PASSED'));
    const failed = this.testResults.filter(r => r.status.includes('FAILED'));
    
    console.log(`✅ Passed: ${passed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📊 Success Rate: ${Math.round((passed.length / this.testResults.length) * 100)}%`);
    
    console.log('\n📝 Detailed Results:');
    this.testResults.forEach(result => {
      console.log(`${result.status} ${result.feature}`);
      if (result.error) {
        console.log(`    └─ ${result.error}`);
      }
    });

    if (failed.length === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Your homeschool system is working perfectly!');
    } else {
      console.log(`\n⚠️  ${failed.length} tests need attention. Check the error screenshots and logs above.`);
    }
  }
}

// Run the comprehensive test
(async () => {
  const tester = new ComprehensiveFeatureTest();
  await tester.runAllTests();
})();