const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3003';
const SCREENSHOT_DIR = 'screenshots/study-modules-interactive';

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

async function waitForResponse(page, url) {
    return new Promise((resolve) => {
        page.on('response', (response) => {
            if (response.url().includes(url)) {
                resolve(response);
            }
        });
    });
}

async function testStudyModuleInteractive() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 1000 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const results = {
        testName: "Interactive Study Module Complete Test",
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        results: {
            teacherLogin: false,
            moduleCreation: false,
            aiGeneration: false,
            moduleDatabase: false,
            studentLogin: false,
            moduleInteractivity: false,
            stepProgression: false,
            xpGamification: false,
            livesSystem: false
        },
        errors: [],
        screenshots: [],
        moduleId: null,
        generationTime: 0
    };

    try {
        console.log('🚀 Starting Interactive Study Module Test...');
        
        // 1. Login as Teacher
        console.log('📝 Step 1: Teacher Login');
        await page.goto(`${BASE_URL}/login`);
        results.screenshots.push(await takeScreenshot(page, '01-login', 'Login page loaded'));

        await page.type('input[name="emailOrUsername"]', 'teacher@test.com');
        await page.type('input[name="password"]', 'password123');
        results.screenshots.push(await takeScreenshot(page, '02-login-filled', 'Login credentials entered'));

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        results.results.teacherLogin = page.url().includes('/dashboard');
        results.screenshots.push(await takeScreenshot(page, '03-dashboard', 'Teacher dashboard'));

        if (results.results.teacherLogin) {
            console.log('✅ Teacher login successful');
        } else {
            throw new Error('Teacher login failed');
        }

        // 2. Navigate to Study Module Creation
        console.log('📚 Step 2: Navigate to Study Module Creation');
        await page.goto(`${BASE_URL}/study/create`);
        await page.waitForSelector('h1', { timeout: 10000 });
        results.screenshots.push(await takeScreenshot(page, '04-create-form', 'Study module creation form'));

        // 3. Fill Form with Simple Topic
        console.log('📝 Step 3: Fill Study Module Form');
        await page.type('#topic', 'Simple Addition');
        await page.select('#subject', 'Mathematics');
        await page.select('#gradeLevel', '2');
        await page.select('#numberOfLessons', '5'); // Smaller number for faster generation
        await page.type('#notes', 'Focus on numbers 1-10, make it fun and interactive');
        
        results.screenshots.push(await takeScreenshot(page, '05-form-filled', 'Form filled with test data'));

        // 4. Submit and Monitor AI Generation
        console.log('🤖 Step 4: Submit Form and Monitor AI Generation');
        const startTime = Date.now();
        
        // Set up response listener
        const generationPromise = waitForResponse(page, '/api/study-modules/generate');
        
        await page.click('button[type="submit"]');
        results.screenshots.push(await takeScreenshot(page, '06-generating', 'AI generation started'));

        try {
            // Wait for AI generation to complete (up to 2 minutes)
            console.log('⏳ Waiting for AI generation... (up to 2 minutes)');
            
            const response = await Promise.race([
                generationPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Generation timeout')), 120000)
                )
            ]);

            results.generationTime = Date.now() - startTime;
            const responseData = await response.json().catch(() => null);
            
            if (response.ok() && responseData?.success) {
                results.results.aiGeneration = true;
                results.results.moduleDatabase = true;
                results.moduleId = responseData.moduleId;
                console.log(`✅ AI generation successful in ${results.generationTime}ms`);
                console.log(`📦 Module ID: ${results.moduleId}`);
            } else {
                throw new Error('AI generation API failed');
            }

        } catch (error) {
            console.log('❌ AI generation failed or timed out');
            results.errors.push(`AI Generation: ${error.message}`);
            results.screenshots.push(await takeScreenshot(page, '07-generation-error', 'AI generation error'));
        }

        // 5. Check if Module was Created in UI
        console.log('🔍 Step 5: Verify Module Creation');
        await page.waitForTimeout(3000); // Wait for navigation/updates
        
        if (results.moduleId) {
            try {
                await page.goto(`${BASE_URL}/study`);
                await page.waitForSelector('.grid', { timeout: 10000 });
                
                const moduleExists = await page.evaluate((moduleTitle) => {
                    return document.body.textContent.includes('Simple Addition');
                }, 'Simple Addition');

                results.results.moduleCreation = moduleExists;
                results.screenshots.push(await takeScreenshot(page, '08-module-list', 'Module list after creation'));
            } catch (error) {
                results.errors.push(`Module verification: ${error.message}`);
            }
        }

        // 6. Test Interactive Module as Student
        if (results.moduleId) {
            console.log('🎓 Step 6: Test Interactive Module as Student');
            
            // Logout and login as student
            await page.goto(`${BASE_URL}/api/auth/signout`);
            await page.waitForTimeout(2000);
            await page.goto(`${BASE_URL}/login`);
            
            await page.type('input[name="emailOrUsername"]', 'student@test.com');
            await page.type('input[name="password"]', 'password123');
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            
            results.results.studentLogin = page.url().includes('/dashboard');
            results.screenshots.push(await takeScreenshot(page, '09-student-dashboard', 'Student dashboard'));

            if (results.results.studentLogin) {
                // Try to access the study module
                try {
                    await page.goto(`${BASE_URL}/study/modules/${results.moduleId}`);
                    await page.waitForSelector('.max-w-4xl', { timeout: 10000 });
                    
                    // Check for interactive elements
                    const hasInteractiveElements = await page.evaluate(() => {
                        const hearts = document.querySelectorAll('[class*="Heart"]').length > 0;
                        const xpDisplay = document.body.textContent.includes('XP');
                        const stepProgression = document.querySelectorAll('.w-12.h-12.rounded-full').length > 0;
                        const continueButton = document.querySelector('button:contains("Continue")') ||
                                             document.querySelector('button:contains("Check Answer")');
                        
                        return { hearts, xpDisplay, stepProgression, hasButton: !!continueButton };
                    });

                    results.results.moduleInteractivity = hasInteractiveElements.xpDisplay;
                    results.results.livesSystem = hasInteractiveElements.hearts;
                    results.results.stepProgression = hasInteractiveElements.stepProgression;
                    results.results.xpGamification = hasInteractiveElements.xpDisplay;
                    
                    results.screenshots.push(await takeScreenshot(page, '10-interactive-module', 'Interactive module interface'));

                    // Try to interact with the module
                    if (hasInteractiveElements.hasButton) {
                        try {
                            const button = await page.$('button');
                            if (button) {
                                await button.click();
                                await page.waitForTimeout(2000);
                                results.screenshots.push(await takeScreenshot(page, '11-after-interaction', 'After interaction'));
                            }
                        } catch (error) {
                            console.log('Could not interact with button:', error.message);
                        }
                    }

                } catch (error) {
                    results.errors.push(`Module access: ${error.message}`);
                    results.screenshots.push(await takeScreenshot(page, '12-access-error', 'Module access error'));
                }
            }
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        results.errors.push(`Test error: ${error.message}`);
        results.screenshots.push(await takeScreenshot(page, '13-test-error', 'Test failure'));
    }

    await browser.close();

    // Generate Report
    const reportFile = `study-modules-interactive-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));

    // Console Summary
    console.log('\n📊 INTERACTIVE STUDY MODULE TEST RESULTS:');
    console.log('==========================================');
    console.log(`✅ Teacher Login: ${results.results.teacherLogin ? 'PASS' : 'FAIL'}`);
    console.log(`✅ AI Generation: ${results.results.aiGeneration ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Module Creation: ${results.results.moduleCreation ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Student Login: ${results.results.studentLogin ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Interactive UI: ${results.results.moduleInteractivity ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Lives System: ${results.results.livesSystem ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Step Progression: ${results.results.stepProgression ? 'PASS' : 'FAIL'}`);
    console.log(`✅ XP Gamification: ${results.results.xpGamification ? 'PASS' : 'FAIL'}`);
    
    if (results.moduleId) {
        console.log(`📦 Created Module ID: ${results.moduleId}`);
    }
    if (results.generationTime > 0) {
        console.log(`⏱️  AI Generation Time: ${(results.generationTime / 1000).toFixed(1)}s`);
    }
    
    console.log(`📸 Screenshots: ${results.screenshots.length} taken`);
    console.log(`❌ Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
        console.log('\n🚨 ERRORS:');
        results.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log(`\n📋 Full report saved: ${reportFile}`);

    const overallSuccess = results.results.teacherLogin && 
                          results.results.aiGeneration && 
                          results.results.moduleCreation &&
                          results.results.moduleInteractivity;

    console.log(`\n🎯 OVERALL STATUS: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS WORK'}`);
    
    return results;
}

// Run the test
testStudyModuleInteractive()
    .then(() => {
        console.log('\n🏁 Test completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    });