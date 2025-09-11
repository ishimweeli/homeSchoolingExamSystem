const puppeteer = require('puppeteer');
const path = require('path');

/**
 * Complete End-to-End Test Flow for Homeschooling Exam System
 * 
 * Test Flow:
 * 1. Teacher login (teacher@test.com / password123)
 * 2. Create a new exam
 * 3. Add questions to the exam
 * 4. Create/add student if needed
 * 5. Assign exam to student
 * 6. Logout and login as student
 * 7. Take the exam
 * 8. Submit exam
 * 9. Login as teacher and view results
 */

class CompleteE2ETest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:3001';
    this.screenshotDir = './screenshots';
    this.testData = {
      teacher: {
        email: 'teacher@test.com',
        password: 'password123'
      },
      student: {
        email: 'student@test.com', 
        password: 'password123'
      },
      exam: {
        title: 'Mathematics Quiz - Automated Test',
        description: 'Automated test exam for E2E testing',
        timeLimit: 30,
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correctAnswer: 1 // Index of correct answer (4)
          },
          {
            question: 'What is 5 × 3?',
            options: ['12', '15', '18', '20'],
            correctAnswer: 1 // Index of correct answer (15)
          }
        ]
      }
    };
  }

  async initialize() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
      slowMo: 100 // Slow down actions for better visibility
    });
    this.page = await this.browser.newPage();
    
    // Create screenshots directory
    await this.ensureDirectoryExists(this.screenshotDir);
  }

  async ensureDirectoryExists(dir) {
    const fs = require('fs').promises;
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async takeScreenshot(name) {
    const filename = `${this.screenshotDir}/${Date.now()}-${name}.png`;
    await this.page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 Screenshot saved: ${filename}`);
    return filename;
  }

  async waitAndClick(selector, description = '') {
    console.log(`🖱️ Clicking: ${description || selector}`);
    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.click(selector);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async waitAndType(selector, text, description = '') {
    console.log(`⌨️ Typing in ${description || selector}: ${text}`);
    await this.page.waitForSelector(selector, { timeout: 10000 });
    await this.page.click(selector);
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('a');
    await this.page.keyboard.up('Control');
    await this.page.type(selector, text);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Step 1: Teacher Login
  async teacherLogin() {
    console.log('\n👨‍🏫 STEP 1: Teacher Login');
    await this.page.goto(`${this.baseUrl}/login`);
    await this.takeScreenshot('01-login-page');

    await this.waitAndType('input[name="emailOrUsername"]', this.testData.teacher.email, 'email field');
    await this.waitAndType('input[name="password"]', this.testData.teacher.password, 'password field');
    
    await this.waitAndClick('button[type="submit"]', 'login button');
    
    // Wait for redirect to dashboard
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    await this.takeScreenshot('02-teacher-dashboard');
    console.log('✅ Teacher logged in successfully');
  }

  // Step 2: Create Exam
  async createExam() {
    console.log('\n📝 STEP 2: Create Exam');
    
    // Navigate to create exam page
    await this.waitAndClick('a[href="/exams"]', 'exams navigation');
    await this.takeScreenshot('03-exams-page');
    
    await this.waitAndClick('a[href="/exams/create"]', 'create exam button');
    await this.takeScreenshot('04-create-exam-page');

    // Fill AI exam generator form
    await this.waitAndType('input[name="title"]', this.testData.exam.title, 'exam title');
    
    // Select subject using JavaScript
    await this.page.evaluate(() => {
      const select = document.querySelector('select[name="subject"]');
      if (select) {
        select.value = 'Mathematics';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // Add a topic using the topic input
    const topicInput = 'input[placeholder="Enter a topic and press Enter"]';
    await this.waitAndType(topicInput, 'Basic Arithmetic', 'topic input');
    await this.page.keyboard.press('Enter'); // Press enter to add the topic
    
    await this.takeScreenshot('05-exam-details-filled');
    console.log('✅ AI Exam form filled');
  }

  // Step 3: Generate Exam with AI
  async generateExam() {
    console.log('\n🤖 STEP 3: Generate Exam with AI');
    
    // Submit the AI form to generate the exam
    await this.waitAndClick('button[type="submit"]', 'Generate Exam button');
    
    // Wait for the AI generation to complete (this might take a while)
    console.log('⏳ Waiting for AI to generate exam questions...');
    
    // Wait for navigation to the exam page
    await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
    await this.takeScreenshot('06-exam-generated');
    
    console.log('✅ AI Exam generated successfully');
  }

  // Step 4: Assign Exam to Student
  async assignExamToStudent() {
    console.log('\n👥 STEP 4: Assign Exam to Student');
    
    // Find and click "Assign to Students" button
    await this.waitAndClick('a[href*="/assign"]', 'assign to students button');
    await this.takeScreenshot('07-assign-exam-page');
    
    // Select student (this might need adjustment based on actual UI)
    try {
      await this.waitAndClick('input[type="checkbox"]', 'select student checkbox');
    } catch {
      // Try alternative approach - select by student name or email
      await this.waitAndClick('[data-testid="student-checkbox"]', 'student checkbox by testid');
    }
    
    // Set due date (optional)
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateString = futureDate.toISOString().split('T')[0];
      await this.waitAndType('input[type="date"]', dateString, 'due date');
    } catch {
      console.log('⚠️ No due date field found, skipping');
    }
    
    // Assign exam
    await this.waitAndClick('button[type="submit"]', 'assign button');
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    await this.takeScreenshot('08-exam-assigned');
    console.log('✅ Exam assigned to student');
  }

  // Step 5: Logout
  async logout() {
    console.log('\n🚪 Logging out...');
    
    // Look for logout button or dropdown
    try {
      await this.waitAndClick('button:contains("Logout")', 'logout button');
    } catch {
      // Try dropdown approach
      await this.waitAndClick('[data-testid="user-menu"]', 'user menu');
      await this.waitAndClick('button:contains("Sign Out")', 'sign out button');
    }
    
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    await this.takeScreenshot('10-logged-out');
    console.log('✅ Logged out successfully');
  }

  // Step 6: Student Login
  async studentLogin() {
    console.log('\n👨‍🎓 STEP 6: Student Login');
    
    await this.page.goto(`${this.baseUrl}/login`);
    await this.takeScreenshot('11-student-login-page');

    await this.waitAndType('input[name="emailOrUsername"]', this.testData.student.email, 'email field');
    await this.waitAndType('input[name="password"]', this.testData.student.password, 'password field');
    
    await this.waitAndClick('button[type="submit"]', 'login button');
    
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    await this.takeScreenshot('12-student-dashboard');
    console.log('✅ Student logged in successfully');
  }

  // Step 7: Take Exam
  async takeExam() {
    console.log('\n✏️ STEP 7: Take Exam');
    
    // Navigate to available exams
    await this.waitAndClick('a[href="/exams/take"]', 'take exams navigation');
    await this.takeScreenshot('13-available-exams');
    
    // Find and start the exam
    await this.waitAndClick('button:contains("Start Exam")', 'start exam button');
    await this.takeScreenshot('14-exam-started');
    
    // Answer questions
    for (let i = 0; i < this.testData.exam.questions.length; i++) {
      const question = this.testData.exam.questions[i];
      console.log(`Answering question ${i + 1}`);
      
      // Select the correct answer
      const optionSelector = `input[name="question-${i}"][value="${question.correctAnswer}"]`;
      await this.waitAndClick(optionSelector, `answer for question ${i + 1}`);
      
      await this.takeScreenshot(`15-question-${i + 1}-answered`);
      
      // Click next if not the last question
      if (i < this.testData.exam.questions.length - 1) {
        await this.waitAndClick('button:contains("Next")', 'next question button');
      }
    }
    
    // Submit exam
    await this.waitAndClick('button:contains("Submit")', 'submit exam button');
    
    // Confirm submission
    await this.waitAndClick('button:contains("Confirm")', 'confirm submission button');
    
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    await this.takeScreenshot('16-exam-submitted');
    console.log('✅ Exam completed and submitted');
  }

  // Step 8: View Results as Teacher
  async viewResults() {
    console.log('\n📊 STEP 8: View Results as Teacher');
    
    // Logout as student
    await this.logout();
    
    // Login as teacher
    await this.teacherLogin();
    
    // Navigate to results
    await this.waitAndClick('a[href="/results"]', 'results navigation');
    await this.takeScreenshot('17-results-page');
    
    // View specific exam results
    await this.waitAndClick('a:contains("View Details")', 'view details button');
    await this.takeScreenshot('18-detailed-results');
    
    console.log('✅ Results viewed successfully');
  }

  // Run complete test flow
  async runCompleteTest() {
    try {
      await this.initialize();
      
      console.log('🎯 Starting Complete E2E Test Flow...');
      console.log('='.repeat(50));
      
      await this.teacherLogin();
      await this.createExam();
      await this.generateExam();
      await this.assignExamToStudent();
      await this.logout();
      await this.studentLogin();
      await this.takeExam();
      await this.viewResults();
      
      console.log('='.repeat(50));
      console.log('🎉 COMPLETE E2E TEST FINISHED SUCCESSFULLY!');
      console.log('='.repeat(50));
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      await this.takeScreenshot('error-state');
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the test if called directly
if (require.main === module) {
  const test = new CompleteE2ETest();
  test.runCompleteTest().catch(console.error);
}

module.exports = CompleteE2ETest;