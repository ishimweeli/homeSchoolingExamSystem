const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3001';

// Test credentials
const TEST_USERS = {
  STUDENT: { email: 'student@test.com', password: 'password123' },
  PARENT: { email: 'parent@test.com', password: 'password123' },
  TEACHER: { email: 'teacher@test.com', password: 'password123' },
  ADMIN: { email: 'admin@test.com', password: 'password123' }
};

// Routes to test for each role
const ROLE_ROUTES = {
  STUDENT: ['/dashboard', '/exams/take', '/results', '/portfolios', '/community', '/materials'],
  PARENT: ['/dashboard', '/exams/create', '/exams', '/children', '/results', '/analytics', '/reports', '/classes'],
  TEACHER: ['/dashboard', '/exams/create', '/exams', '/results', '/analytics', '/reports', '/classes', '/materials'],
  ADMIN: ['/dashboard', '/exams/create', '/exams', '/results', '/analytics', '/reports', '/classes', '/materials', '/admin']
};

async function testLogin(page, role) {
  try {
    console.log(`\n🔐 Testing ${role} login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Wait for form elements
    await page.waitForSelector('input[name="emailOrUsername"]');
    await page.waitForSelector('input[name="password"]');
    
    // Clear fields first
    await page.evaluate(() => {
      document.querySelector('input[name="emailOrUsername"]').value = '';
      document.querySelector('input[name="password"]').value = '';
    });
    
    // Type credentials
    await page.type('input[name="emailOrUsername"]', TEST_USERS[role].email);
    await page.type('input[name="password"]', TEST_USERS[role].password);
    
    // Click submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const url = page.url();
    if (url.includes('/dashboard')) {
      console.log(`✅ ${role} login successful`);
      return true;
    } else {
      console.log(`❌ ${role} login failed - still on: ${url}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${role} login error: ${error.message}`);
    return false;
  }
}

async function testRoute(page, route) {
  try {
    const response = await page.goto(`${BASE_URL}${route}`, { 
      waitUntil: 'domcontentloaded',
      timeout: 5000 
    });
    
    const url = page.url();
    const status = response?.status() || 0;
    
    if (url.includes('/login')) {
      return { success: false, error: 'Unauthorized' };
    }
    
    if (status >= 400) {
      return { success: false, error: `HTTP ${status}` };
    }
    
    // Check for Next.js error
    const hasError = await page.evaluate(() => {
      return document.querySelector('#__next-build-error') !== null ||
             document.body.textContent.includes('Application error') ||
             document.body.textContent.includes('This page could not be found');
    });
    
    if (hasError) {
      return { success: false, error: 'Page error' };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testRole(role) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Testing ${role} Role`);
  console.log(`${'='.repeat(50)}`);
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = { login: false, routes: {} };
  
  try {
    // Test login
    results.login = await testLogin(page, role);
    
    if (results.login) {
      // Test routes
      console.log(`\n📍 Testing ${role} routes:`);
      for (const route of ROLE_ROUTES[role]) {
        const result = await testRoute(page, route);
        results.routes[route] = result;
        
        const icon = result.success ? '✅' : '❌';
        const error = result.error ? ` (${result.error})` : '';
        console.log(`  ${icon} ${route}${error}`);
      }
    }
  } catch (error) {
    console.error(`Error testing ${role}:`, error.message);
  } finally {
    await browser.close();
  }
  
  return results;
}

async function main() {
  console.log('🚀 Testing All User Roles and Routes');
  console.log(`📍 Server: ${BASE_URL}\n`);
  
  const allResults = {};
  const failures = [];
  
  for (const role of Object.keys(TEST_USERS)) {
    const results = await testRole(role);
    allResults[role] = results;
    
    // Collect failures
    if (!results.login) {
      failures.push({ role, type: 'login' });
    }
    
    for (const [route, result] of Object.entries(results.routes)) {
      if (!result.success) {
        failures.push({ role, type: 'route', route, error: result.error });
      }
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log('📊 SUMMARY');
  console.log(`${'='.repeat(50)}`);
  
  let totalRoutes = 0;
  let workingRoutes = 0;
  
  for (const [role, results] of Object.entries(allResults)) {
    const routes = Object.values(results.routes);
    const working = routes.filter(r => r.success).length;
    totalRoutes += routes.length;
    workingRoutes += working;
    
    console.log(`\n${role}:`);
    console.log(`  Login: ${results.login ? '✅' : '❌'}`);
    if (routes.length > 0) {
      console.log(`  Routes: ${working}/${routes.length} working`);
    }
  }
  
  console.log(`\n📈 Overall: ${workingRoutes}/${totalRoutes} routes working`);
  
  if (failures.length > 0) {
    console.log(`\n⚠️  ${failures.length} issues found that need fixing`);
    
    const loginFailures = failures.filter(f => f.type === 'login');
    const routeFailures = failures.filter(f => f.type === 'route');
    
    if (loginFailures.length > 0) {
      console.log('\n❌ Login failures:');
      loginFailures.forEach(f => console.log(`  - ${f.role}`));
    }
    
    if (routeFailures.length > 0) {
      console.log('\n❌ Route failures:');
      const grouped = {};
      routeFailures.forEach(f => {
        if (!grouped[f.route]) grouped[f.route] = [];
        grouped[f.route].push(f.role);
      });
      
      for (const [route, roles] of Object.entries(grouped)) {
        console.log(`  - ${route}: ${roles.join(', ')}`);
      }
    }
  } else {
    console.log('\n✅ All tests passed!');
  }
  
  return { allResults, failures };
}

main().catch(console.error).then(() => process.exit());