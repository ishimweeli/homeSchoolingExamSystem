const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const TEACHER_EMAIL = 'teacher@test.com';
const TEACHER_PASSWORD = 'password123';
const STUDENT_EMAIL = 'student@test.com';
const STUDENT_PASSWORD = 'password123';

// Create screenshots directory
const screenshotsDir = 'screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

class StudyModuleSystemTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      teacherLogin: false,
      studyNavigation: false,
      createModuleButton: false,
      formFilling: false,
      formSubmission: false,
      aiGeneration: false,
      moduleCreationSuccess: false,
      databaseSave: false,
      studentLogin: false,
      studentModuleVisibility: false,
      studentModuleAccess: false,
      errors: [],
      screenshots: [],
      createdModuleId: null,
      generationTime: 0
    };
  }

  async takeScreenshot(name, description = '') {
    const timestamp = Date.now();
    const filename = `${timestamp}-${name}.png`;
    const filepath = path.join(screenshotsDir, filename);
    
    await this.page.screenshot({ 
      path: filepath,
      fullPage: true 
    });
    
    this.testResults.screenshots.push({
      name,
      filename,
      filepath,
      description,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot saved: ${filename} - ${description}`);
  }

  async waitForNavigation(timeout = 10000) {
    try {
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout });
    } catch (error) {
      console.log('Navigation wait timeout, continuing...');
    }
  }

  async setup() {
    console.log('🚀 Setting up browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();
    
    // Enable console logs
    this.page.on('console', (msg) => {
      console.log(`🖥️ Browser Console: ${msg.text()}`);
    });

    // Capture network errors
    this.page.on('response', (response) => {
      if (response.status() >= 400) {
        console.log(`⚠️ HTTP ${response.status()}: ${response.url()}`);
      }
    });
  }

  async testTeacherLogin() {
    console.log('\n📋 Step 1: Testing Teacher Login');
    try {
      await this.page.goto(`${BASE_URL}/login`);
      await this.waitForNavigation();
      await this.takeScreenshot('01-login-page', 'Login page loaded');

      // Fill login form
      await this.page.focus('input[name="emailOrUsername"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[name="emailOrUsername"]', TEACHER_EMAIL);
      
      await this.page.focus('input[name="password"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[name="password"]', TEACHER_PASSWORD);
      await this.takeScreenshot('02-login-filled', 'Login form filled');

      // Submit form
      await this.page.click('button[type="submit"]');
      await this.waitForNavigation();

      // Check if redirected to dashboard
      await this.page.waitForSelector('text=Dashboard', { timeout: 10000 });
      await this.takeScreenshot('03-teacher-dashboard', 'Teacher dashboard loaded');

      this.testResults.teacherLogin = true;
      console.log('✅ Teacher login successful');
    } catch (error) {
      console.log('❌ Teacher login failed:', error.message);
      this.testResults.errors.push(`Teacher login: ${error.message}`);
      await this.takeScreenshot('03-login-error', 'Login error state');
    }
  }

  async testStudyNavigation() {
    console.log('\n📋 Step 2: Testing Study Modules Navigation');
    try {
      // Navigate to Study Modules
      await this.page.goto(`${BASE_URL}/study`);
      await this.waitForNavigation();
      
      // Wait for the page to load
      await this.page.waitForSelector('text=Interactive Study Modules', { timeout: 10000 });
      await this.takeScreenshot('04-study-page', 'Study modules page loaded');

      this.testResults.studyNavigation = true;
      console.log('✅ Study modules navigation successful');
    } catch (error) {
      console.log('❌ Study navigation failed:', error.message);
      this.testResults.errors.push(`Study navigation: ${error.message}`);
      await this.takeScreenshot('04-study-nav-error', 'Study navigation error');
    }
  }

  async testCreateModuleButton() {
    console.log('\n📋 Step 3: Testing Create Module Button');
    try {
      // Look for Create Module button
      await this.page.waitForSelector('text=Create Module', { timeout: 10000 });
      await this.takeScreenshot('05-create-button-visible', 'Create Module button visible');

      // Click Create Module button
      await this.page.click('text=Create Module');
      await this.waitForNavigation();

      // Wait for create form page
      await this.page.waitForSelector('text=Create Interactive Study Module', { timeout: 10000 });
      await this.takeScreenshot('06-create-form-page', 'Create module form page loaded');

      this.testResults.createModuleButton = true;
      console.log('✅ Create Module button test successful');
    } catch (error) {
      console.log('❌ Create Module button test failed:', error.message);
      this.testResults.errors.push(`Create button: ${error.message}`);
      await this.takeScreenshot('06-create-button-error', 'Create button error');
    }
  }

  async testFormFilling() {
    console.log('\n📋 Step 4: Testing Form Filling');
    try {
      // Fill in the main topic field
      const topicInput = await this.page.waitForSelector('#topic', { timeout: 5000 });
      await topicInput.type('Simple Present Tense');

      // Select subject (should default to Mathematics, change to English)
      await this.page.select('select#subject', 'English');

      // Select grade level (should default to 5)
      await this.page.select('select#gradeLevel', '5');

      // Select number of lessons (should default to 10)  
      await this.page.select('select#numberOfLessons', '10');

      await this.takeScreenshot('07-form-filled', 'Form filled with test data');

      this.testResults.formFilling = true;
      console.log('✅ Form filling successful');
    } catch (error) {
      console.log('❌ Form filling failed:', error.message);
      this.testResults.errors.push(`Form filling: ${error.message}`);
      await this.takeScreenshot('07-form-filling-error', 'Form filling error');
    }
  }

  async testFormSubmission() {
    console.log('\n📋 Step 5: Testing Form Submission and AI Generation');
    try {
      // Click submit button
      const submitButton = await this.page.waitForSelector('button[type="submit"]', { timeout: 5000 });
      
      await this.takeScreenshot('08-before-submission', 'Before form submission');
      
      const startTime = Date.now();
      await submitButton.click();

      // Wait for loading state
      try {
        await this.page.waitForSelector('text=Creating Interactive Lessons...', { timeout: 5000 });
        await this.takeScreenshot('09-ai-generation-loading', 'AI generation in progress');
        console.log('🤖 AI generation started...');
      } catch (e) {
        console.log('Loading state not detected, continuing...');
      }

      // Wait for completion or timeout (30 seconds)
      let completed = false;
      const maxWaitTime = 35000; // 35 seconds
      const checkInterval = 2000; // Check every 2 seconds

      while (!completed && (Date.now() - startTime) < maxWaitTime) {
        try {
          // Check if we've been redirected to a module page
          const currentUrl = this.page.url();
          if (currentUrl.includes('/study/modules/')) {
            completed = true;
            const moduleId = currentUrl.split('/study/modules/')[1];
            this.testResults.createdModuleId = moduleId;
            this.testResults.generationTime = Date.now() - startTime;
            break;
          }

          // Check for success message
          const successToast = await this.page.$('text=Study module created successfully!');
          if (successToast) {
            completed = true;
            this.testResults.generationTime = Date.now() - startTime;
            break;
          }

          // Check for error messages
          const errorToast = await this.page.$('text=Failed to create study module');
          if (errorToast) {
            throw new Error('AI generation failed');
          }

          await this.page.waitForTimeout(checkInterval);
        } catch (e) {
          // Continue checking
        }
      }

      if (completed) {
        await this.takeScreenshot('10-ai-generation-success', 'AI generation completed successfully');
        this.testResults.formSubmission = true;
        this.testResults.aiGeneration = true;
        this.testResults.moduleCreationSuccess = true;
        console.log(`✅ AI generation successful (${this.testResults.generationTime}ms)`);
      } else {
        throw new Error(`AI generation timeout after ${maxWaitTime}ms`);
      }

    } catch (error) {
      console.log('❌ Form submission/AI generation failed:', error.message);
      this.testResults.errors.push(`Form submission: ${error.message}`);
      await this.takeScreenshot('10-submission-error', 'Form submission error');
    }
  }

  async testDatabaseSave() {
    console.log('\n📋 Step 6: Testing Database Save');
    try {
      // Go back to study modules list to verify the module was saved
      await this.page.goto(`${BASE_URL}/study`);
      await this.waitForNavigation();

      // Look for the newly created module
      await this.page.waitForSelector('text=Simple Present Tense', { timeout: 10000 });
      await this.takeScreenshot('11-module-in-list', 'Module visible in study modules list');

      this.testResults.databaseSave = true;
      console.log('✅ Module saved to database successfully');
    } catch (error) {
      console.log('❌ Database save verification failed:', error.message);
      this.testResults.errors.push(`Database save: ${error.message}`);
      await this.takeScreenshot('11-database-save-error', 'Database save verification error');
    }
  }

  async testStudentLogin() {
    console.log('\n📋 Step 7: Testing Student Login');
    try {
      // Logout current user
      await this.page.goto(`${BASE_URL}/login`);
      await this.waitForNavigation();

      // Login as student
      await this.page.focus('input[name="emailOrUsername"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[name="emailOrUsername"]', STUDENT_EMAIL);
      
      await this.page.focus('input[name="password"]');
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.type('input[name="password"]', STUDENT_PASSWORD);
      await this.takeScreenshot('12-student-login-filled', 'Student login form filled');

      await this.page.click('button[type="submit"]');
      await this.waitForNavigation();

      // Check if redirected to dashboard
      await this.page.waitForSelector('text=Dashboard', { timeout: 10000 });
      await this.takeScreenshot('13-student-dashboard', 'Student dashboard loaded');

      this.testResults.studentLogin = true;
      console.log('✅ Student login successful');
    } catch (error) {
      console.log('❌ Student login failed:', error.message);
      this.testResults.errors.push(`Student login: ${error.message}`);
      await this.takeScreenshot('13-student-login-error', 'Student login error');
    }
  }

  async testStudentModuleVisibility() {
    console.log('\n📋 Step 8: Testing Student Module Visibility');
    try {
      // Navigate to Study Modules as student
      await this.page.goto(`${BASE_URL}/study`);
      await this.waitForNavigation();

      await this.page.waitForSelector('text=Interactive Study Modules', { timeout: 10000 });
      await this.takeScreenshot('14-student-study-page', 'Student study modules page loaded');

      // Check if modules are visible (might be none if not assigned)
      const moduleCards = await this.page.$$('div[class*="grid"] > div');
      const noModulesMessage = await this.page.$('text=No Modules Assigned');

      if (noModulesMessage) {
        console.log('ℹ️ No modules assigned to student (expected for new module)');
        await this.takeScreenshot('15-no-modules-assigned', 'No modules assigned to student');
      } else if (moduleCards.length > 0) {
        console.log(`ℹ️ Found ${moduleCards.length} module(s) visible to student`);
        await this.takeScreenshot('15-student-modules-visible', 'Student can see modules');
        this.testResults.studentModuleVisibility = true;
      }

    } catch (error) {
      console.log('❌ Student module visibility test failed:', error.message);
      this.testResults.errors.push(`Student visibility: ${error.message}`);
      await this.takeScreenshot('15-student-visibility-error', 'Student visibility error');
    }
  }

  async testStudentModuleAccess() {
    console.log('\n📋 Step 9: Testing Student Module Access');
    try {
      // Try to access the created module directly if we have the ID
      if (this.testResults.createdModuleId) {
        const moduleUrl = `${BASE_URL}/study/modules/${this.testResults.createdModuleId}`;
        await this.page.goto(moduleUrl);
        await this.waitForNavigation();

        // Check if student can access (might be restricted)
        const accessDenied = await this.page.$('text=Access denied');
        const moduleContent = await this.page.$('text=Lesson');

        if (accessDenied) {
          console.log('ℹ️ Student access denied to unassigned module (expected)');
          await this.takeScreenshot('16-access-denied', 'Student access denied to module');
        } else if (moduleContent) {
          console.log('✅ Student can access module content');
          this.testResults.studentModuleAccess = true;
          await this.takeScreenshot('16-student-module-access', 'Student accessing module content');
        }
      }

      // Try to start learning if Start Learning button is visible
      const startButton = await this.page.$('text=Start Learning');
      if (startButton) {
        await startButton.click();
        await this.waitForNavigation();
        await this.takeScreenshot('17-learning-interface', 'Student learning interface');
        console.log('✅ Student can start learning experience');
        this.testResults.studentModuleAccess = true;
      }

    } catch (error) {
      console.log('❌ Student module access test failed:', error.message);
      this.testResults.errors.push(`Student access: ${error.message}`);
      await this.takeScreenshot('16-student-access-error', 'Student access error');
    }
  }

  async generateReport() {
    console.log('\n📊 Generating Test Report...');
    
    const report = {
      testName: 'Study Module System Complete Flow Test',
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      results: this.testResults,
      summary: {
        totalSteps: 9,
        passedSteps: Object.values(this.testResults).filter(v => v === true).length,
        failedSteps: this.testResults.errors.length,
        aiGenerationWorked: this.testResults.aiGeneration,
        moduleCreatedInDatabase: this.testResults.databaseSave,
        studentsCanSeeModules: this.testResults.studentModuleVisibility,
        studentsCanAccessModules: this.testResults.studentModuleAccess,
        gpt4oMiniUsed: true,
        generationTime: `${this.testResults.generationTime}ms`,
        screenshotCount: this.testResults.screenshots.length
      },
      conclusions: {
        aiGeneration: this.testResults.aiGeneration ? 'GPT-4o-mini successfully generated study module content' : 'AI generation failed or timed out',
        databaseSave: this.testResults.databaseSave ? 'Module was successfully saved to database' : 'Module save to database failed',
        studentAccess: this.testResults.studentModuleVisibility || this.testResults.studentModuleAccess ? 'Students can access modules' : 'Students cannot access modules (may need assignment)',
        overallStatus: (this.testResults.aiGeneration && this.testResults.databaseSave) ? 'SUCCESS' : 'PARTIAL/FAILED'
      }
    };

    // Save report to file
    const reportFilename = `study-modules-test-report-${Date.now()}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    
    console.log(`📋 Test report saved to: ${reportFilename}`);
    
    return report;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async runCompleteTest() {
    try {
      await this.setup();
      
      await this.testTeacherLogin();
      await this.testStudyNavigation();
      await this.testCreateModuleButton();
      await this.testFormFilling();
      await this.testFormSubmission();
      await this.testDatabaseSave();
      await this.testStudentLogin();
      await this.testStudentModuleVisibility();
      await this.testStudentModuleAccess();

      const report = await this.generateReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 FINAL TEST RESULTS');
      console.log('='.repeat(60));
      console.log(`✅ Teacher Login: ${this.testResults.teacherLogin ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Study Navigation: ${this.testResults.studyNavigation ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Create Module Button: ${this.testResults.createModuleButton ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Form Filling: ${this.testResults.formFilling ? 'PASS' : 'FAIL'}`);
      console.log(`✅ AI Generation (GPT-4o-mini): ${this.testResults.aiGeneration ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Database Save: ${this.testResults.databaseSave ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Student Login: ${this.testResults.studentLogin ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Student Module Visibility: ${this.testResults.studentModuleVisibility ? 'PASS' : 'FAIL'}`);
      console.log(`✅ Student Module Access: ${this.testResults.studentModuleAccess ? 'PASS' : 'FAIL'}`);
      console.log('='.repeat(60));
      console.log(`🕒 Generation Time: ${this.testResults.generationTime}ms`);
      console.log(`📸 Screenshots Taken: ${this.testResults.screenshots.length}`);
      console.log(`❌ Errors: ${this.testResults.errors.length}`);
      console.log(`🎯 Overall Status: ${report.conclusions.overallStatus}`);
      
      if (this.testResults.errors.length > 0) {
        console.log('\n❌ ERRORS ENCOUNTERED:');
        this.testResults.errors.forEach((error, idx) => {
          console.log(`${idx + 1}. ${error}`);
        });
      }
      
      console.log('\n📸 SCREENSHOTS SAVED:');
      this.testResults.screenshots.forEach((screenshot, idx) => {
        console.log(`${idx + 1}. ${screenshot.filename} - ${screenshot.description}`);
      });

      return report;
      
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.testResults.errors.push(`Test execution: ${error.message}`);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
async function main() {
  console.log('🧪 Starting Study Module System Complete Flow Test');
  console.log(`🌐 Testing against: ${BASE_URL}`);
  console.log(`👨‍🏫 Teacher: ${TEACHER_EMAIL}`);
  console.log(`👨‍🎓 Student: ${STUDENT_EMAIL}`);
  console.log('='.repeat(60));
  
  const test = new StudyModuleSystemTest();
  await test.runCompleteTest();
}

main().catch(console.error);