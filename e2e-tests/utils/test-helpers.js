const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const config = require('../configs/test-config');

class TestHelpers {
  constructor() {
    this.browser = null;
    this.page = null;
    this.token = null;
    this.currentUser = null;
    this.testResults = [];
  }

  // Initialize browser and page
  async initialize() {
    this.browser = await puppeteer.launch(config.puppeteer);
    this.page = await this.browser.newPage();

    // Set up console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser Error:', msg.text());
      }
    });

    // Set up request interception for API monitoring
    await this.page.setRequestInterception(true);
    this.page.on('request', request => {
      request.continue();
    });

    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        const status = response.status();
        if (status >= 400) {
          console.log(`API Error: ${response.url()} - Status: ${status}`);
        }
      }
    });

    return this.page;
  }

  // Login as specific user role
  async login(userRole) {
    const user = config.users[userRole];
    if (!user) {
      throw new Error(`Unknown user role: ${userRole}`);
    }

    console.log(`🔐 Logging in as ${userRole}...`);

    // Navigate to login page
    await this.page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle2' });

    // Fill login form - using the actual input names from our login page
    await this.page.waitForSelector('input[name="emailOrUsername"]', { timeout: 5000 });
    await this.page.type('input[name="emailOrUsername"]', user.email);
    await this.page.type('input[name="password"]', user.password);

    // Submit form
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click('button[type="submit"]')
    ]);

    // Check if login successful
    const url = this.page.url();
    if (url.includes('/dashboard')) {
      console.log(`✅ Successfully logged in as ${userRole}`);
      this.currentUser = user;

      // Get token from localStorage
      this.token = await this.page.evaluate(() => localStorage.getItem('token'));

      return true;
    } else {
      console.log(`❌ Failed to login as ${userRole}`);
      await this.takeScreenshot(`login-failed-${userRole}`);
      return false;
    }
  }

  // Logout
  async logout() {
    console.log('🔓 Logging out...');
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle2' });
  }

  // Test API endpoint
  async testAPIEndpoint(method, endpoint, data = null, expectedStatus = 200) {
    const url = `${config.apiUrl}${endpoint}`;
    console.log(`📡 Testing ${method} ${endpoint}`);

    try {
      const response = await this.page.evaluate(async (url, method, token, data) => {
        const options = {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        };

        if (data && method !== 'GET') {
          options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseData = await response.json().catch(() => null);

        return {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
          ok: response.ok
        };
      }, url, method, this.token, data);

      const passed = response.status === expectedStatus;

      this.testResults.push({
        endpoint,
        method,
        status: response.status,
        expected: expectedStatus,
        passed,
        user: this.currentUser?.role,
        timestamp: new Date().toISOString()
      });

      if (passed) {
        console.log(`  ✅ ${method} ${endpoint} - Status: ${response.status}`);
      } else {
        console.log(`  ❌ ${method} ${endpoint} - Expected: ${expectedStatus}, Got: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.log(`  ❌ ${method} ${endpoint} - Error: ${error.message}`);
      this.testResults.push({
        endpoint,
        method,
        error: error.message,
        passed: false,
        user: this.currentUser?.role,
        timestamp: new Date().toISOString()
      });
      return null;
    }
  }

  // Navigate to page and check if it loads
  async navigateToPage(path, expectedElement = null) {
    console.log(`🔍 Navigating to ${path}...`);
    await this.page.goto(`${config.baseUrl}${path}`, { waitUntil: 'networkidle2' });

    if (expectedElement) {
      try {
        await this.page.waitForSelector(expectedElement, { timeout: 5000 });
        console.log(`  ✅ Page loaded successfully`);
        return true;
      } catch {
        console.log(`  ❌ Expected element not found: ${expectedElement}`);
        await this.takeScreenshot(`page-error-${path.replace(/\//g, '-')}`);
        return false;
      }
    }
    return true;
  }

  // Fill form fields
  async fillForm(formData) {
    for (const [selector, value] of Object.entries(formData)) {
      const element = await this.page.$(selector);
      if (element) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const type = await element.evaluate(el => el.type);

        if (tagName === 'select') {
          await this.page.select(selector, value);
        } else if (type === 'checkbox' || type === 'radio') {
          await this.page.click(selector);
        } else {
          await this.page.click(selector, { clickCount: 3 }); // Select all
          await this.page.type(selector, value);
        }
      } else {
        console.log(`  ⚠️ Element not found: ${selector}`);
      }
    }
  }

  // Click element
  async clickElement(selector, waitForNav = false) {
    console.log(`🖱️ Clicking ${selector}...`);
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 });

      if (waitForNav) {
        await Promise.all([
          this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
          this.page.click(selector)
        ]);
      } else {
        await this.page.click(selector);
      }

      return true;
    } catch (error) {
      console.log(`  ❌ Failed to click: ${error.message}`);
      return false;
    }
  }

  // Check if element exists
  async elementExists(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  // Get element text
  async getElementText(selector) {
    try {
      await this.page.waitForSelector(selector, { timeout: 3000 });
      return await this.page.$eval(selector, el => el.textContent);
    } catch {
      return null;
    }
  }

  // Take screenshot
  async takeScreenshot(name) {
    const timestamp = Date.now();
    const filename = `${name}-${timestamp}.png`;
    const filepath = path.join(config.screenshotPath, filename);

    await fs.mkdir(config.screenshotPath, { recursive: true });
    await this.page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);

    return filepath;
  }

  // Wait for a specific time
  async wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // Test complete user flow
  async testUserFlow(flowName, steps) {
    console.log(`\n🔄 Testing Flow: ${flowName}`);
    console.log('═'.repeat(50));

    const flowResults = {
      name: flowName,
      user: this.currentUser?.role,
      steps: [],
      passed: true,
      timestamp: new Date().toISOString()
    };

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\nStep ${i + 1}: ${step.name}`);

      try {
        const result = await step.action();
        flowResults.steps.push({
          name: step.name,
          passed: result !== false,
          timestamp: new Date().toISOString()
        });

        if (result === false) {
          flowResults.passed = false;
          console.log(`  ❌ Step failed`);
          await this.takeScreenshot(`flow-${flowName}-step-${i + 1}-failed`);
        } else {
          console.log(`  ✅ Step completed`);
        }

        await this.wait(500); // Small delay between steps
      } catch (error) {
        console.log(`  ❌ Step error: ${error.message}`);
        flowResults.steps.push({
          name: step.name,
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        flowResults.passed = false;
        await this.takeScreenshot(`flow-${flowName}-step-${i + 1}-error`);
      }
    }

    this.testResults.push(flowResults);

    if (flowResults.passed) {
      console.log(`\n✅ Flow "${flowName}" completed successfully!`);
    } else {
      console.log(`\n❌ Flow "${flowName}" failed!`);
    }

    return flowResults;
  }

  // Generate test report
  async generateReport(filename = 'test-report.json') {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.passed).length,
      failed: this.testResults.filter(r => !r.passed).length,
      results: this.testResults,
      summary: {
        byEndpoint: {},
        byUser: {},
        byMethod: {}
      }
    };

    // Analyze results
    this.testResults.forEach(result => {
      // By endpoint
      if (result.endpoint) {
        if (!report.summary.byEndpoint[result.endpoint]) {
          report.summary.byEndpoint[result.endpoint] = { passed: 0, failed: 0 };
        }
        report.summary.byEndpoint[result.endpoint][result.passed ? 'passed' : 'failed']++;
      }

      // By user
      if (result.user) {
        if (!report.summary.byUser[result.user]) {
          report.summary.byUser[result.user] = { passed: 0, failed: 0 };
        }
        report.summary.byUser[result.user][result.passed ? 'passed' : 'failed']++;
      }

      // By method
      if (result.method) {
        if (!report.summary.byMethod[result.method]) {
          report.summary.byMethod[result.method] = { passed: 0, failed: 0 };
        }
        report.summary.byMethod[result.method][result.passed ? 'passed' : 'failed']++;
      }
    });

    const filepath = path.join(config.reportPath, filename);
    await fs.mkdir(config.reportPath, { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));

    console.log(`\n📊 Test Report Generated: ${filename}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passed} (${Math.round(report.passed / report.totalTests * 100)}%)`);
    console.log(`Failed: ${report.failed} (${Math.round(report.failed / report.totalTests * 100)}%)`);

    return report;
  }

  // Close browser
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = TestHelpers;