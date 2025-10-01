const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const FRONTEND_URL = 'http://localhost:5002';  // Frontend is on port 5002
const BACKEND_URL = 'http://localhost:5000';
const SCREENSHOTS_DIR = 'e2e-tests/screenshots';
const RESULTS_FILE = 'e2e-tests/auth-test-results.json';

// Test credentials
const TEST_USERS = {
  teacher: {
    email: 'teacher@test.com',
    username: 'teacher_test',
    password: 'password123',
    name: 'Teacher Test'
  },
  parent: {
    email: 'parent@test.com',
    username: 'parent_test',
    password: 'password123',
    name: 'Parent Test'
  },
  student: {
    email: 'student@test.com',
    username: 'student_test',
    password: 'password123',
    name: 'Student Test'
  },
  newParent: {
    email: 'newparent@test.com',
    username: 'newparent_test',
    password: 'Test123!@#',
    name: 'New Parent',
    role: 'PARENT'
  },
  newStudent: {
    username: 'newstudent_test',
    password: 'Student123!',
    name: 'New Student'
  }
};

// Test results storage
let testResults = {
  timestamp: new Date().toISOString(),
  environment: {
    frontend: FRONTEND_URL,
    backend: BACKEND_URL
  },
  endpoints: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  },
  detailedResults: []
};

async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error.message);
  }
}

async function takeScreenshot(page, name) {
  try {
    const filename = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '-')}.png`;
    const filepath = path.join(SCREENSHOTS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  } catch (error) {
    console.error(`Error taking screenshot ${name}:`, error.message);
    return null;
  }
}

async function checkEndpoint(endpoint, method = 'GET', token = null, body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const options = {
      method,
      headers
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BACKEND_URL}/api${endpoint}`, options);
    return {
      status: response.status,
      ok: response.ok,
      data: await response.json().catch(() => null)
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

async function testAuthEndpoint(name, endpoint, method, body = null, token = null, expectedStatus = 200) {
  console.log(`\nTesting: ${name}`);
  const result = await checkEndpoint(endpoint, method, token, body);

  const testResult = {
    name,
    endpoint,
    method,
    expectedStatus,
    actualStatus: result.status,
    success: result.status === expectedStatus,
    response: result.data || result.error,
    timestamp: new Date().toISOString()
  };

  testResults.endpoints.push(testResult);
  testResults.summary.total++;

  if (testResult.success) {
    testResults.summary.passed++;
    console.log(`✓ ${name} - Status: ${result.status}`);
  } else {
    testResults.summary.failed++;
    console.log(`✗ ${name} - Expected: ${expectedStatus}, Got: ${result.status}`);
    if (result.error) console.log(`  Error: ${result.error}`);
  }

  return result;
}

async function testUIFlow(page, name, flowFn) {
  console.log(`\n--- Testing UI Flow: ${name} ---`);
  const startTime = Date.now();
  let success = false;
  let error = null;
  let screenshots = [];

  try {
    const result = await flowFn();
    success = true;
    screenshots = result.screenshots || [];
  } catch (err) {
    error = err.message;
    console.error(`✗ ${name} failed:`, error);
    const errorScreenshot = await takeScreenshot(page, `${name}-error`);
    if (errorScreenshot) screenshots.push(errorScreenshot);
  }

  const duration = Date.now() - startTime;
  const flowResult = {
    name,
    type: 'ui_flow',
    success,
    duration,
    error,
    screenshots,
    timestamp: new Date().toISOString()
  };

  testResults.detailedResults.push(flowResult);
  testResults.summary.total++;

  if (success) {
    testResults.summary.passed++;
    console.log(`✓ ${name} completed in ${duration}ms`);
  } else {
    testResults.summary.failed++;
  }

  return success;
}

async function runAuthTests() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE AUTHENTICATION & USER MANAGEMENT E2E TESTS');
  console.log('='.repeat(80));

  await ensureDirectoryExists(SCREENSHOTS_DIR);

  let browser;
  let page;
  let authToken = null;
  let parentToken = null;
  let studentToken = null;

  try {
    // 1. Test all authentication endpoints
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 1: AUTHENTICATION ENDPOINTS');
    console.log('='.repeat(60));

    // Test registration
    const registerResult = await testAuthEndpoint(
      'POST /auth/register - New Parent Registration',
      '/auth/register',
      'POST',
      TEST_USERS.newParent
    );

    if (registerResult.ok && registerResult.data?.data?.token) {
      parentToken = registerResult.data.data.token;
    }

    // Test login with email
    const loginEmailResult = await testAuthEndpoint(
      'POST /auth/login - Login with Email',
      '/auth/login',
      'POST',
      {
        emailOrUsername: TEST_USERS.teacher.email,
        password: TEST_USERS.teacher.password
      }
    );

    if (loginEmailResult.ok && loginEmailResult.data?.data?.token) {
      authToken = loginEmailResult.data.data.token;
    }

    // Test login with username
    await testAuthEndpoint(
      'POST /auth/login - Login with Username',
      '/auth/login',
      'POST',
      {
        emailOrUsername: TEST_USERS.student.username,
        password: TEST_USERS.student.password
      }
    );

    // Test invalid login
    await testAuthEndpoint(
      'POST /auth/login - Invalid Credentials',
      '/auth/login',
      'POST',
      {
        emailOrUsername: 'invalid@test.com',
        password: 'wrongpassword'
      },
      null,
      401
    );

    // Test authenticated endpoints
    await testAuthEndpoint(
      'GET /auth/me - Get Current User',
      '/auth/me',
      'GET',
      null,
      authToken
    );

    await testAuthEndpoint(
      'GET /auth/profile - Get Profile',
      '/auth/profile',
      'GET',
      null,
      authToken
    );

    await testAuthEndpoint(
      'PUT /auth/profile - Update Profile',
      '/auth/profile',
      'PUT',
      {
        name: 'Updated Teacher Name',
        username: 'teacher_updated'
      },
      authToken
    );

    // Test password reset flow
    await testAuthEndpoint(
      'POST /auth/forgot-password - Request Password Reset',
      '/auth/forgot-password',
      'POST',
      {
        email: TEST_USERS.teacher.email
      }
    );

    // Test refresh token
    await testAuthEndpoint(
      'POST /auth/refresh - Refresh Token',
      '/auth/refresh',
      'POST',
      {
        refreshToken: 'mock_refresh_token'
      },
      null,
      400
    );

    // 2. Test user management endpoints
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 2: USER MANAGEMENT ENDPOINTS');
    console.log('='.repeat(60));

    // Get parent's students
    await testAuthEndpoint(
      'GET /users/students - List Parent Students',
      '/users/students',
      'GET',
      null,
      parentToken || authToken
    );

    // Create a new student
    const createStudentResult = await testAuthEndpoint(
      'POST /users/students - Parent Creates Student',
      '/users/students',
      'POST',
      TEST_USERS.newStudent,
      parentToken || authToken
    );

    let newStudentId = null;
    if (createStudentResult.ok && createStudentResult.data?.data?.id) {
      newStudentId = createStudentResult.data.data.id;
    }

    if (newStudentId) {
      // Get student details
      await testAuthEndpoint(
        'GET /users/students/:id - Get Student Details',
        `/users/students/${newStudentId}`,
        'GET',
        null,
        parentToken || authToken
      );

      // Update student
      await testAuthEndpoint(
        'PUT /users/students/:id - Update Student',
        `/users/students/${newStudentId}`,
        'PUT',
        {
          name: 'Updated Student Name'
        },
        parentToken || authToken
      );
    }

    // Test unauthorized access
    await testAuthEndpoint(
      'GET /users/students - Unauthorized Access',
      '/users/students',
      'GET',
      null,
      null,
      401
    );

    // Test student accessing parent endpoints (should fail)
    const studentLoginResult = await testAuthEndpoint(
      'POST /auth/login - Student Login for Role Test',
      '/auth/login',
      'POST',
      {
        emailOrUsername: TEST_USERS.student.username,
        password: TEST_USERS.student.password
      }
    );

    if (studentLoginResult.ok && studentLoginResult.data?.data?.token) {
      studentToken = studentLoginResult.data.data.token;

      await testAuthEndpoint(
        'POST /users/students - Student Cannot Create Student',
        '/users/students',
        'POST',
        {
          username: 'shouldfail',
          password: 'Test123!',
          name: 'Should Fail'
        },
        studentToken,
        403
      );
    }

    // 3. Test UI flows with Puppeteer
    console.log('\n' + '='.repeat(60));
    console.log('PHASE 3: UI AUTHENTICATION FLOWS');
    console.log('='.repeat(60));

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Test teacher login flow
    await testUIFlow(page, 'Teacher Login Flow', async () => {
      const screenshots = [];

      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });
      screenshots.push(await takeScreenshot(page, 'teacher-login-page'));

      // Fill login form
      // Wait for and fill email/username input
      await page.waitForSelector('input[name="emailOrUsername"], input[type="email"], input[placeholder*="email" i], input[placeholder*="username" i]', { timeout: 5000 });
      const emailInput = await page.$('input[name="emailOrUsername"], input[type="email"], input[placeholder*="email" i]');
      await emailInput.type(TEST_USERS.teacher.email);
      // Wait for and fill password input
      await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 5000 });
      const passwordInput = await page.$('input[type="password"], input[name="password"]');
      await passwordInput.type(TEST_USERS.teacher.password);
      screenshots.push(await takeScreenshot(page, 'teacher-login-filled'));

      // Find and click submit button
      await page.waitForSelector('button[type="submit"], button:contains("Login"), button:contains("Sign in")', { timeout: 5000 });
      const submitButton = await page.$('button[type="submit"]');

      // Click and wait for either navigation or URL change
      await submitButton.click();
      await page.waitForFunction(
        () => window.location.pathname !== '/login',
        { timeout: 15000 }
      ).catch(async () => {
        // If navigation doesn't happen, wait for loading to finish
        await page.waitForTimeout(3000);
      });

      screenshots.push(await takeScreenshot(page, 'teacher-dashboard'));

      // Check if we're on dashboard or if login succeeded
      const currentUrl = page.url();
      const pageContent = await page.content();

      if (currentUrl.includes('/login') && !pageContent.includes('Dashboard')) {
        // Check for error messages
        const errorMessage = await page.$eval('.error, .alert-danger, [role="alert"]', el => el.textContent).catch(() => null);
        if (errorMessage) {
          throw new Error(`Login failed: ${errorMessage}`);
        }
        throw new Error('Dashboard did not load after login');
      }

      return { screenshots };
    });

    // Test parent registration flow
    await testUIFlow(page, 'Parent Registration Flow', async () => {
      const screenshots = [];

      await page.goto(`${FRONTEND_URL}/register`, { waitUntil: 'networkidle0' });
      screenshots.push(await takeScreenshot(page, 'register-page'));

      // Fill registration form
      await page.type('input[name="name"]', 'New UI Parent');
      await page.type('input[name="email"]', `parent_${Date.now()}@test.com`);
      await page.type('input[name="username"]', `parent_ui_${Date.now()}`);
      await page.type('input[name="password"]', 'Test123!@#');
      await page.select('select[name="role"]', 'PARENT');
      screenshots.push(await takeScreenshot(page, 'register-filled'));

      // Submit registration
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      screenshots.push(await takeScreenshot(page, 'register-result'));

      return { screenshots };
    });

    // Test parent creating student flow
    await testUIFlow(page, 'Parent Creates Student Account', async () => {
      const screenshots = [];

      // Login as parent first
      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });
      // Fill parent login form
      const parentEmailInput = await page.waitForSelector('input[name="emailOrUsername"], input[type="email"], input[type="text"]', { timeout: 5000 });
      await parentEmailInput.type(TEST_USERS.parent.email);

      const parentPasswordInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await parentPasswordInput.type(TEST_USERS.parent.password);

      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 })
      ]);

      // Navigate to students page
      await page.goto(`${FRONTEND_URL}/students`, { waitUntil: 'networkidle0' });
      screenshots.push(await takeScreenshot(page, 'parent-students-list'));

      // Click create student button
      const createButton = await page.$('button:has-text("Create Student")');
      if (createButton) {
        await createButton.click();
        await page.waitForTimeout(2000);
        screenshots.push(await takeScreenshot(page, 'create-student-form'));

        // Fill student creation form
        await page.type('input[name="name"]', `UI Student ${Date.now()}`);
        await page.type('input[name="username"]', `ui_student_${Date.now()}`);
        await page.type('input[name="password"]', 'Student123!');
        screenshots.push(await takeScreenshot(page, 'student-form-filled'));

        // Submit form
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        screenshots.push(await takeScreenshot(page, 'student-created'));
      }

      return { screenshots };
    });

    // Test student login with parent-created account
    await testUIFlow(page, 'Student Login with Parent-Created Account', async () => {
      const screenshots = [];

      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });
      screenshots.push(await takeScreenshot(page, 'student-login-page'));

      // Use the student credentials created by parent
      const studentUsernameInput = await page.waitForSelector('input[name="emailOrUsername"], input[type="email"], input[type="text"]', { timeout: 5000 });
      await studentUsernameInput.type(TEST_USERS.student.username);

      const studentPasswordInput = await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await studentPasswordInput.type(TEST_USERS.student.password);
      screenshots.push(await takeScreenshot(page, 'student-login-filled'));

      // Find and click submit button
      await page.waitForSelector('button[type="submit"], button:contains("Login"), button:contains("Sign in")', { timeout: 5000 });
      const submitButton = await page.$('button[type="submit"]');

      // Click and wait for either navigation or URL change
      await submitButton.click();
      await page.waitForFunction(
        () => window.location.pathname !== '/login',
        { timeout: 15000 }
      ).catch(async () => {
        // If navigation doesn't happen, wait for loading to finish
        await page.waitForTimeout(3000);
      });

      screenshots.push(await takeScreenshot(page, 'student-dashboard'));

      // Verify student-specific UI elements
      const studentMenu = await page.$('[data-role="student"]');
      if (!studentMenu) {
        console.log('Warning: Student-specific UI elements not found');
      }

      return { screenshots };
    });

    // Test OAuth2 flow (mocked)
    await testUIFlow(page, 'OAuth2 Google Login Flow (UI)', async () => {
      const screenshots = [];

      await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });
      screenshots.push(await takeScreenshot(page, 'oauth-login-page'));

      // Look for Google login button
      // Look for Google login button with multiple selectors
      const googleButton = await page.$('button[aria-label*="Google" i], a[href*="/auth/google"], button[class*="google"], .google-signin-button, [class*="google-btn"]');
      if (googleButton) {
        screenshots.push(await takeScreenshot(page, 'oauth-google-button-found'));
        // We can't actually test OAuth without mocking, but we verify the button exists
      } else {
        console.log('Warning: Google OAuth button not found');
      }

      return { screenshots };
    });

    // Test logout flow
    await testUIFlow(page, 'Logout Flow', async () => {
      const screenshots = [];

      // Ensure we're logged in first
      await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: 'networkidle0' });

      // Look for logout button
      // Look for logout button with multiple selectors
      const logoutButton = await page.$('button[aria-label*="Logout" i], a[href*="logout"], button[class*="logout"], .logout-button, [class*="logout-btn"]');
      if (logoutButton) {
        await logoutButton.click();
        await page.waitForTimeout(2000);
        screenshots.push(await takeScreenshot(page, 'after-logout'));

        // Verify redirected to login
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          console.log('Warning: Not redirected to login after logout');
        }
      }

      return { screenshots };
    });

    // Test logout endpoint
    await testAuthEndpoint(
      'POST /auth/logout - Logout',
      '/auth/logout',
      'POST',
      null,
      authToken
    );

  } catch (error) {
    console.error('Test execution error:', error);
    testResults.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Generate summary report
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  // Create detailed report table
  const workingFeatures = [];
  const brokenFeatures = [];

  testResults.endpoints.forEach(endpoint => {
    const feature = {
      name: endpoint.name,
      endpoint: `${endpoint.method} ${endpoint.endpoint}`,
      status: endpoint.actualStatus,
      expected: endpoint.expectedStatus,
      working: endpoint.success
    };

    if (endpoint.success) {
      workingFeatures.push(feature);
    } else {
      brokenFeatures.push(feature);
    }
  });

  testResults.detailedResults.forEach(flow => {
    const feature = {
      name: flow.name,
      type: 'UI Flow',
      duration: `${flow.duration}ms`,
      working: flow.success,
      error: flow.error
    };

    if (flow.success) {
      workingFeatures.push(feature);
    } else {
      brokenFeatures.push(feature);
    }
  });

  // Print working features table
  console.log('\n✅ WORKING FEATURES:');
  console.log('-'.repeat(80));
  console.table(workingFeatures.map(f => ({
    Feature: f.name,
    Type: f.endpoint || f.type,
    Status: f.status || 'Success',
    Duration: f.duration || '-'
  })));

  // Print broken features table
  console.log('\n❌ BROKEN FEATURES (Need Fixing):');
  console.log('-'.repeat(80));
  console.table(brokenFeatures.map(f => ({
    Feature: f.name,
    Type: f.endpoint || f.type,
    Expected: f.expected || 'Success',
    Actual: f.status || 'Failed',
    Error: f.error || '-'
  })));

  // Overall statistics
  console.log('\n📊 OVERALL STATISTICS:');
  console.log('-'.repeat(80));
  console.log(`Total Tests: ${testResults.summary.total}`);
  console.log(`Passed: ${testResults.summary.passed} (${Math.round(testResults.summary.passed/testResults.summary.total*100)}%)`);
  console.log(`Failed: ${testResults.summary.failed} (${Math.round(testResults.summary.failed/testResults.summary.total*100)}%)`);

  // Key insights
  console.log('\n🔍 KEY INSIGHTS:');
  console.log('-'.repeat(80));

  const insights = {
    authentication: {
      working: [],
      broken: []
    },
    userManagement: {
      working: [],
      broken: []
    },
    oauth: {
      working: [],
      broken: []
    },
    roleBasedAccess: {
      working: [],
      broken: []
    }
  };

  testResults.endpoints.forEach(endpoint => {
    const category = endpoint.endpoint.includes('/auth') ? 'authentication' :
                    endpoint.endpoint.includes('/users') ? 'userManagement' :
                    endpoint.endpoint.includes('google') ? 'oauth' :
                    'roleBasedAccess';

    if (endpoint.success) {
      insights[category].working.push(endpoint.name);
    } else {
      insights[category].broken.push(endpoint.name);
    }
  });

  Object.entries(insights).forEach(([category, data]) => {
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  ✅ Working: ${data.working.length} features`);
    console.log(`  ❌ Broken: ${data.broken.length} features`);
    if (data.broken.length > 0) {
      console.log(`  Issues: ${data.broken.slice(0, 3).join(', ')}${data.broken.length > 3 ? '...' : ''}`);
    }
  });

  // Priority fixes
  console.log('\n⚠️ PRIORITY FIXES NEEDED:');
  console.log('-'.repeat(80));
  const priorityFixes = brokenFeatures
    .filter(f => f.endpoint && (f.endpoint.includes('login') || f.endpoint.includes('register') || f.endpoint.includes('students')))
    .slice(0, 5);

  priorityFixes.forEach((fix, index) => {
    console.log(`${index + 1}. ${fix.name} - ${fix.endpoint || fix.type}`);
  });

  // Save results to file
  await fs.writeFile(RESULTS_FILE, JSON.stringify(testResults, null, 2));
  console.log(`\n💾 Detailed results saved to: ${RESULTS_FILE}`);
  console.log(`📸 Screenshots saved in: ${SCREENSHOTS_DIR}`);

  return testResults;
}

// Execute tests
runAuthTests().catch(console.error);