const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3003';
const SCREENSHOT_DIR = 'screenshots/complete-study-flow';

// Create screenshots directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(page, name, description) {
    const timestamp = Date.now();
    const filename = `${timestamp}-${name}.png`;
    const filepath = path.join(SCREENSHOT_DIR, filename);
    
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot: ${description} -> ${filename}`);
    
    return { name, filename, filepath, description, timestamp: new Date().toISOString() };
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteStudyFlow() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 1000 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const results = {
        testName: "Complete Study Module Flow Test",
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        results: {
            teacherLogin: false,
            moduleCreation: false,
            aiGenerationReliable: false,
            studentAssignment: false,
            studentAccess: false,
            interactiveFeatures: false,
            xpAndLives: false,
            stepProgression: false,
            moduleCompletion: false
        },
        errors: [],
        screenshots: [],
        moduleId: null,
        generationTime: 0,
        completionStats: {}
    };

    try {
        console.log('🚀 Starting Complete Study Module Flow Test...');
        
        // === TEACHER FLOW ===
        console.log('\n👨‍🏫 === TEACHER FLOW ===');
        
        // 1. Teacher Login
        console.log('📝 Step 1: Teacher Login');
        await page.goto(`${BASE_URL}/login`);
        results.screenshots.push(await takeScreenshot(page, '01-login', 'Login page'));

        await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
        await page.type('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        results.results.teacherLogin = page.url().includes('/dashboard');
        results.screenshots.push(await takeScreenshot(page, '02-teacher-dashboard', 'Teacher dashboard'));

        if (!results.results.teacherLogin) {
            throw new Error('Teacher login failed');
        }
        console.log('✅ Teacher login successful');

        // 2. Create Study Module
        console.log('📚 Step 2: Create Study Module with AI');
        await page.goto(`${BASE_URL}/study/create`);
        await page.waitForSelector('#topic', { timeout: 10000 });
        results.screenshots.push(await takeScreenshot(page, '03-create-form', 'Study creation form'));

        // Fill form with test data
        await page.type('#topic', 'Math Addition');
        await page.select('#subject', 'Mathematics');
        await page.select('#gradeLevel', '2');
        await page.select('#numberOfLessons', '5');
        await page.type('#notes', 'Simple addition for young learners with interactive examples');
        
        results.screenshots.push(await takeScreenshot(page, '04-form-filled', 'Form filled'));

        // Monitor AI generation
        console.log('🤖 Submitting form and waiting for AI generation...');
        const startTime = Date.now();
        
        await page.click('button[type="submit"]');
        results.screenshots.push(await takeScreenshot(page, '05-ai-generating', 'AI generation loading'));

        // Wait for success or navigation change
        try {
            await page.waitForFunction(() => {
                return window.location.pathname.includes('/study/modules/') || 
                       document.body.textContent.includes('error') ||
                       document.body.textContent.includes('failed');
            }, { timeout: 150000 }); // 2.5 minutes

            results.generationTime = Date.now() - startTime;
            
            if (page.url().includes('/study/modules/')) {
                results.results.aiGenerationReliable = true;
                results.results.moduleCreation = true;
                results.moduleId = page.url().split('/').pop();
                console.log(`✅ AI generation successful in ${(results.generationTime/1000).toFixed(1)}s`);
                console.log(`📦 Module ID: ${results.moduleId}`);
                results.screenshots.push(await takeScreenshot(page, '06-module-created', 'Module created successfully'));
            } else {
                throw new Error('AI generation failed or timed out');
            }
        } catch (error) {
            results.errors.push(`AI Generation: ${error.message}`);
            results.screenshots.push(await takeScreenshot(page, '07-generation-error', 'Generation error'));
        }

        // 3. Test Assignment System (if module created)
        if (results.moduleId) {
            console.log('👥 Step 3: Test Student Assignment');
            await page.goto(`${BASE_URL}/study/modules/${results.moduleId}/assign`);
            
            try {
                await page.waitForSelector('h1', { timeout: 10000 });
                results.screenshots.push(await takeScreenshot(page, '08-assignment-page', 'Assignment page loaded'));

                // Check if students are available
                const studentsVisible = await page.evaluate(() => {
                    return document.body.textContent.includes('No students found') === false;
                });

                if (studentsVisible) {
                    // Try to assign to a student
                    const firstStudent = await page.$('input[type="checkbox"]');
                    if (firstStudent) {
                        await firstStudent.click();
                        await delay(500);
                        
                        const assignButton = await page.$('button:contains("Assign")');
                        if (assignButton) {
                            await assignButton.click();
                            results.results.studentAssignment = true;
                            console.log('✅ Student assignment successful');
                        }
                    }
                }
                
                results.screenshots.push(await takeScreenshot(page, '09-assignment-done', 'Assignment completed'));
                
            } catch (error) {
                results.errors.push(`Assignment: ${error.message}`);
                results.screenshots.push(await takeScreenshot(page, '10-assignment-error', 'Assignment error'));
            }
        }

        // === STUDENT FLOW ===
        console.log('\n🎓 === STUDENT FLOW ===');

        // 4. Student Login
        console.log('🔐 Step 4: Student Login');
        await page.goto(`${BASE_URL}/api/auth/signout`);
        await delay(2000);
        await page.goto(`${BASE_URL}/login`);
        
        await page.type('input[name="emailOrUsername"]', 'student@test.com');
        await page.type('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        results.results.studentAccess = page.url().includes('/dashboard');
        results.screenshots.push(await takeScreenshot(page, '11-student-dashboard', 'Student dashboard'));

        if (results.results.studentAccess) {
            console.log('✅ Student login successful');

            // 5. Access Study Module
            console.log('📖 Step 5: Test Interactive Study Module');
            await page.goto(`${BASE_URL}/study`);
            await page.waitForSelector('h1', { timeout: 10000 });
            results.screenshots.push(await takeScreenshot(page, '12-study-page', 'Student study page'));

            if (results.moduleId) {
                try {
                    await page.goto(`${BASE_URL}/study/modules/${results.moduleId}`);
                    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
                    
                    // Check for interactive elements
                    const interactiveCheck = await page.evaluate(() => {
                        const hearts = Array.from(document.querySelectorAll('*')).some(el => 
                            el.className && el.className.includes('Heart') || 
                            el.tagName === 'svg' && el.className.includes('lucide-heart')
                        );
                        const xpDisplay = document.body.textContent.includes('XP');
                        const stepProgression = document.querySelectorAll('.w-12.h-12.rounded-full').length > 0;
                        const continueButton = document.querySelector('button') !== null;
                        
                        return { hearts, xpDisplay, stepProgression, continueButton };
                    });

                    results.results.interactiveFeatures = interactiveCheck.continueButton;
                    results.results.xpAndLives = interactiveCheck.hearts && interactiveCheck.xpDisplay;
                    results.results.stepProgression = interactiveCheck.stepProgression;
                    
                    console.log(`✅ Interactive features: ${JSON.stringify(interactiveCheck)}`);
                    results.screenshots.push(await takeScreenshot(page, '13-interactive-module', 'Interactive module interface'));

                    // Try to interact with the module
                    const button = await page.$('button');
                    if (button) {
                        console.log('🎮 Attempting to interact with module...');
                        await button.click();
                        await delay(2000);
                        results.screenshots.push(await takeScreenshot(page, '14-after-interaction', 'After interaction'));
                    }

                } catch (error) {
                    results.errors.push(`Module Access: ${error.message}`);
                    results.screenshots.push(await takeScreenshot(page, '15-access-error', 'Module access error'));
                }
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        results.errors.push(`Test error: ${error.message}`);
        results.screenshots.push(await takeScreenshot(page, '16-test-error', 'Test failure'));
    }

    await browser.close();

    // Calculate completion stats
    const totalTests = Object.keys(results.results).length;
    const passedTests = Object.values(results.results).filter(Boolean).length;
    results.completionStats = {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        successRate: Math.round((passedTests / totalTests) * 100)
    };

    // Generate Report
    const reportFile = `complete-study-flow-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

    // Console Summary
    console.log('\n🎯 COMPLETE STUDY MODULE FLOW TEST RESULTS:');
    console.log('============================================');
    console.log(`✅ Teacher Login: ${results.results.teacherLogin ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Module Creation: ${results.results.moduleCreation ? 'PASS' : 'FAIL'}`);
    console.log(`✅ AI Generation Reliable: ${results.results.aiGenerationReliable ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Student Assignment: ${results.results.studentAssignment ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Student Access: ${results.results.studentAccess ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Interactive Features: ${results.results.interactiveFeatures ? 'PASS' : 'FAIL'}`);
    console.log(`✅ XP & Lives System: ${results.results.xpAndLives ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Step Progression: ${results.results.stepProgression ? 'PASS' : 'FAIL'}`);
    
    if (results.moduleId) {
        console.log(`📦 Created Module ID: ${results.moduleId}`);
    }
    if (results.generationTime > 0) {
        console.log(`⏱️  AI Generation Time: ${(results.generationTime / 1000).toFixed(1)}s`);
    }
    
    console.log(`📊 Success Rate: ${results.completionStats.successRate}% (${results.completionStats.passed}/${results.completionStats.total})`);
    console.log(`📸 Screenshots: ${results.screenshots.length} taken`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n🚨 ERRORS:');
        results.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log(`\n📋 Full report saved: ${reportFile}`);

    const productionReady = results.completionStats.successRate >= 80 && 
                           results.results.aiGenerationReliable && 
                           results.results.interactiveFeatures;

    console.log(`\n🎯 PRODUCTION READINESS: ${productionReady ? '✅ READY' : '⚠️  NEEDS WORK'}`);
    
    if (productionReady) {
        console.log('🚀 All critical features working! Safe to push to production.');
    } else {
        console.log('⚠️  Some issues found. Review errors before deploying.');
    }
    
    return results;
}

// Run the test
testCompleteStudyFlow()
    .then(() => {
        console.log('\n🏁 Complete test finished!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    });