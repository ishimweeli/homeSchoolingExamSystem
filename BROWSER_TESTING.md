# Browser Testing Setup with Puppeteer MCP

This project includes a custom browser testing setup that mimics MCP (Model Context Protocol) functionality for automated browser testing.

## Files Created

1. **browser-test.js** - Simple browser test runner
2. **mcp-browser-server.js** - MCP-style browser automation server
3. **browser-config.json** - Configuration file for browser settings
4. **Package.json scripts** - Added npm scripts for browser testing

## Installation

To install Puppeteer, run one of these commands:

```bash
# Option 1: Install as dev dependency (recommended)
npm install --save-dev puppeteer

# Option 2: Use npx (no installation required)
npx -p puppeteer node mcp-browser-server.js

# Option 3: Install globally
npm install -g puppeteer
```

## Usage

### Basic Commands

```bash
# Run a basic browser test
npm run browser:test

# Start the browser server with commands
npm run browser:server test [url]
npm run browser:server screenshot [url] [filename]

# Take a screenshot
npm run browser:screenshot http://localhost:3000 homepage.png
```

### End-to-End Testing Commands

```bash
# Complete workflow test (teacher login -> create exam -> assign -> student takes exam -> view results)
npm run test:e2e

# Individual login tests
npm run test:teacher-login
npm run test:student-login
```

### Test Accounts (from seed data)

The following test accounts are available after running `npm run db:seed`:

- **Teacher**: teacher@test.com / password123
- **Student**: student@test.com / password123  
- **Parent**: parent@test.com / password123
- **Admin**: admin@test.com / password123

### MCP Browser Server API

The `mcp-browser-server.js` provides these methods:

```javascript
const BrowserTestingServer = require('./mcp-browser-server');
const server = new BrowserTestingServer();

// Initialize browser
await server.initialize();

// Create a new page
const pageId = await server.createPage('myPage');

// Navigate to URL
await server.navigate(pageId, 'http://localhost:3000');

// Take screenshot
await server.screenshot(pageId, 'test.png');

// Click elements
await server.click(pageId, '#login-button');

// Type text
await server.type(pageId, '#username', 'testuser');

// Wait for elements
await server.waitForSelector(pageId, '.dashboard');

// Execute JavaScript
await server.evaluate(pageId, () => document.title);

// Get page info
const info = await server.getPageInfo(pageId);

// Clean up
await server.close();
```

## Configuration

Edit `browser-config.json` to customize:

- **browserOptions**: Puppeteer launch options
- **testUrls**: Environment-specific URLs
- **selectors**: Common CSS selectors for your app
- **timeouts**: Timeout values for operations

## Testing Your Homeschooling Exam System

Example test scenarios for your application:

```javascript
// Test login flow
await server.navigate(pageId, 'http://localhost:3000/login');
await server.type(pageId, '#username', 'teacher@example.com');
await server.type(pageId, '#password', 'password123');
await server.click(pageId, 'button[type="submit"]');
await server.waitForSelector(pageId, '[data-testid="dashboard"]');

// Test exam creation
await server.navigate(pageId, 'http://localhost:3000/exams/create');
await server.type(pageId, '#exam-title', 'Math Quiz 1');
await server.click(pageId, '#add-question-btn');
await server.screenshot(pageId, 'exam-creation.png');

// Test student exam taking
await server.navigate(pageId, 'http://localhost:3000/exams/take/123');
await server.click(pageId, 'input[value="option-a"]');
await server.click(pageId, '#next-question');
```

## Troubleshooting

1. **Module not found**: Install Puppeteer first
2. **Permission errors**: Run as administrator or use npx
3. **Browser won't launch**: Check if Chrome/Chromium is installed
4. **Timeout errors**: Increase timeout values in config

## Integration with Your Project

The browser testing server can be integrated with your existing test infrastructure:

1. Use it for end-to-end testing of exam flows
2. Automate screenshot generation for documentation
3. Test responsive design across different viewports
4. Validate form submissions and navigation

## Complete Testing Workflow

### Prerequisites
1. Install Puppeteer: `npm install --save-dev puppeteer`
2. Seed the database: `npm run db:seed`
3. Start your Next.js app: `npm run dev`

### Running Tests

#### Quick Start - Individual Tests
```bash
# Test teacher login only
npm run test:teacher-login

# Test student login only  
npm run test:student-login
```

#### Full End-to-End Test
```bash
# Complete workflow test (requires app to be running)
npm run test:e2e
```

**The complete E2E test performs:**
1. 👨‍🏫 Teacher login (teacher@test.com)
2. 📝 Create new exam with questions
3. 👥 Assign exam to student
4. 🚪 Logout and login as student
5. ✏️ Take the exam and submit answers
6. 👨‍🏫 Login as teacher and view results
7. 📊 Screenshot documentation at each step

#### Custom Testing
```bash
# Take screenshots of specific pages
npm run browser:screenshot http://localhost:3000/login login-page.png

# Run custom browser automation
npm run browser:server test http://localhost:3000
```

### Generated Output
- Screenshots saved to `./screenshots/` directory
- Each test step documented with timestamped screenshots
- Console logging of each action performed

## Next Steps

1. Install Puppeteer: `npm install --save-dev puppeteer`
2. Seed database: `npm run db:seed`  
3. Start your Next.js app: `npm run dev`
4. Run tests: `npm run test:e2e`
5. Customize selectors in `browser-config.json` for your components