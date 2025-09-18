const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

// Test credentials for different roles
const TEST_USERS = {
  STUDENT: { email: 'student@test.com', password: 'password123' },
  PARENT: { email: 'parent@test.com', password: 'password123' },
  TEACHER: { email: 'teacher@test.com', password: 'password123' },
  ADMIN: { email: 'admin@test.com', password: 'password123' }
};

// Routes to test for each role
const ROLE_ROUTES = {
  STUDENT: [
    '/dashboard',
    '/exams/take',
    '/results',
    '/portfolios',
    '/community',
    '/materials'
  ],
  PARENT: [
    '/dashboard',
    '/exams/create',
    '/exams',
    '/children',
    '/results',
    '/analytics',
    '/reports',
    '/classes'
  ],
  TEACHER: [
    '/dashboard',
    '/exams/create',
    '/exams',
    '/results',
    '/analytics',
    '/reports',
    '/classes',
    '/materials'
  ],
  ADMIN: [
    '/dashboard',
    '/exams/create',
    '/exams',
    '/results',
    '/analytics',
    '/reports',
    '/classes',
    '/materials',
    '/admin'
  ]
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLogin(page, role, credentials) {
  try {
    console.log(`\n🔐 Testing ${role} login...`);
    
    // Go to login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    
    // Fill in credentials
    await page.type('input[name="emailOrUsername"]', credentials.email);
    await page.type('input[name="password"]', credentials.password);
    
    // Submit form
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click('button[type="submit"]')
    ]);
    
    // Check if we're on dashboard
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log(`✅ ${role} login successful`);
      return true;
    } else {
      console.log(`❌ ${role} login failed - redirected to: ${currentUrl}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${role} login failed - ${error.message}`);
    return false;
  }
}

async function testRoute(page, route) {
  try {
    const response = await page.goto(`${BASE_URL}${route}`, { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    const status = response.status();
    const url = page.url();
    
    // Check if redirected to login (unauthorized)
    if (url.includes('/login')) {
      return { success: false, message: 'Redirected to login (unauthorized)' };
    }
    
    // Check status code
    if (status >= 400) {
      return { success: false, message: `HTTP ${status} error` };
    }
    
    // Check for React errors
    const hasError = await page.evaluate(() => {
      const errorElement = document.querySelector('#__next-build-error');
      return !!errorElement;
    });
    
    if (hasError) {
      return { success: false, message: 'React build error' };
    }
    
    return { success: true, message: 'Page loaded successfully' };
    
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function testRoleAccess(role) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📋 Testing ${role} Role`);
  console.log(`${'='.repeat(50)}`);
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = {
    role,
    login: false,
    routes: {}
  };
  
  try {
    // Test login
    const loginSuccess = await testLogin(page, role, TEST_USERS[role]);
    results.login = loginSuccess;
    
    if (loginSuccess) {
      console.log(`\n📍 Testing ${role} routes:`);
      
      for (const route of ROLE_ROUTES[role]) {
        const testResult = await testRoute(page, route);
        results.routes[route] = testResult;
        
        const icon = testResult.success ? '✅' : '❌';
        console.log(`  ${icon} ${route}: ${testResult.message}`);
        
        await delay(500); // Small delay between routes
      }
    }
  } catch (error) {
    console.error(`Error testing ${role}:`, error);
  } finally {
    await browser.close();
  }
  
  return results;
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive role testing...');
  console.log(`📍 Target: ${BASE_URL}\n`);
  
  const allResults = {};
  const failures = [];
  
  // Test each role
  for (const role of ['STUDENT', 'PARENT', 'TEACHER', 'ADMIN']) {
    const results = await testRoleAccess(role);
    allResults[role] = results;
    
    // Collect failures
    for (const [route, result] of Object.entries(results.routes)) {
      if (!result.success) {
        failures.push({
          role,
          route,
          error: result.message
        });
      }
    }
    
    await delay(1000); // Delay between roles
  }
  
  // Print summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(50)}`);
  
  for (const [role, results] of Object.entries(allResults)) {
    console.log(`\n${role}:`);
    console.log(`  Login: ${results.login ? '✅' : '❌'}`);
    
    if (Object.keys(results.routes).length > 0) {
      const working = Object.values(results.routes).filter(r => r.success).length;
      const total = Object.keys(results.routes).length;
      console.log(`  Routes: ${working}/${total} working`);
    }
  }
  
  // Report failures
  if (failures.length > 0) {
    console.log(`\n${'='.repeat(50)}`);
    console.log('⚠️  FAILED TESTS REQUIRING FIXES:');
    console.log(`${'='.repeat(50)}`);
    
    for (const failure of failures) {
      console.log(`\n❌ ${failure.role} - ${failure.route}`);
      console.log(`   Error: ${failure.error}`);
    }
  } else {
    console.log('\n✅ All tests passed successfully!');
  }
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('test-results.json', JSON.stringify({
    results: allResults,
    failures,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log('\n📁 Results saved to test-results.json');
  
  return { allResults, failures };
}

// Run tests
runAllTests().catch(console.error);