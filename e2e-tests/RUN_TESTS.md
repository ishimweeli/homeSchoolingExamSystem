# 🧪 E2E Testing System Documentation

## Overview
This comprehensive testing system uses **Puppeteer** to test ALL endpoints and user flows for every role (Student, Teacher, Parent, Admin).

## 📁 Folder Structure
```
e2e-tests/
├── configs/           # Test configurations
├── screenshots/       # Auto-captured screenshots
├── reports/          # Test reports (JSON)
├── tests/            # Individual test suites
│   ├── auth/         # Authentication tests
│   ├── exams/        # Exam management tests
│   ├── modules/      # Study module tests
│   ├── students/     # Student management tests
│   └── assignments/  # Assignment flow tests
├── utils/            # Helper utilities
└── test-all-endpoints.js  # Main test runner
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd e2e-tests
npm install puppeteer chalk ora
```

### 2. Make Sure Services Are Running
- **Backend**: Port 5000 (`cd backend && npm run dev`)
- **Frontend**: Port 5001 (`cd frontend && npm run dev`)

### 3. Run All Tests
```bash
npm test
# OR
node test-all-endpoints.js
```

## 📋 What Gets Tested

### Authentication Tests (All Roles)
- ✅ Login for Admin, Teacher, Parent, Student
- ✅ Token validation
- ✅ Protected route access
- ✅ Logout functionality

### Exam Management (Teacher/Admin)
- ✅ Create exam
- ✅ List all exams
- ✅ Get exam details
- ✅ Update exam
- ✅ Publish exam
- ✅ Assign to students
- ✅ AI exam generation

### Study Modules (Teacher/Admin)
- ✅ Create module
- ✅ List all modules
- ✅ Get module details
- ✅ Update module
- ✅ Assign to students
- ✅ Track progress
- ✅ AI module generation

### Student Management (Teacher/Parent)
- ✅ Create student accounts
- ✅ List students
- ✅ Get student details
- ✅ Update student info
- ✅ View assigned work

### Student Workflows
- ✅ View assigned exams
- ✅ Take exams
- ✅ Submit answers
- ✅ View results
- ✅ Access study modules
- ✅ Track progress

### UI Navigation Tests
- ✅ Dashboard access
- ✅ Sidebar navigation
- ✅ Role-based features
- ✅ Screenshots capture

## 📊 Test Report

After running tests, you'll get:

1. **Console Output**: Real-time test progress
2. **Screenshots**: In `screenshots/` folder
3. **JSON Report**: In `reports/` folder with:
   - Total tests run
   - Pass/fail count
   - Breakdown by endpoint
   - Breakdown by user role
   - Breakdown by HTTP method

## 🔧 Configuration

Edit `configs/test-config.js` to:
- Change test users
- Modify endpoints
- Adjust Puppeteer settings (headless mode, etc.)
- Update test data templates

## 🎯 Test Scenarios

### Complete Flow Example:
1. Teacher logs in
2. Creates an exam
3. Assigns it to students
4. Student logs in
5. Takes the exam
6. Submits answers
7. Views results
8. Teacher grades exam

## 📸 Screenshots

Screenshots are automatically captured for:
- Each role's dashboard
- Failed test steps
- Important workflow stages
- Error states

## 🔴 Troubleshooting

### If tests fail:
1. Check if backend is running on port 5000
2. Check if frontend is running on port 5001
3. Verify database is seeded with test users
4. Look at screenshots for visual debugging
5. Check JSON report for specific failures

### Common Issues:
- **Login fails**: Run `npm run seed` in backend
- **Timeout errors**: Increase timeout in config
- **Element not found**: UI may have changed

## 📈 Success Metrics

The system tracks:
- **API Response Times**
- **Success/Failure Rates**
- **User Flow Completion**
- **Role-based Access Control**

## 🚦 Expected Results

With a properly running system, you should see:
- ✅ 100% Authentication tests passing
- ✅ 95%+ API endpoint tests passing
- ✅ All user flows completing
- ✅ Screenshots showing correct UI

## 💡 Tips

1. **Run in headless mode** for CI/CD:
   ```js
   // In test-config.js
   puppeteer: { headless: true }
   ```

2. **Test specific roles**:
   Modify test-all-endpoints.js to test only certain roles

3. **Parallel testing**:
   Tests run sequentially to avoid conflicts, but you can modify for parallel execution

4. **Custom test data**:
   Update test-config.js with your specific test scenarios

## 🎬 Running the Tests

```bash
# Full test suite
node test-all-endpoints.js

# The test will:
# 1. Test login for all 4 roles
# 2. Test all API endpoints
# 3. Test complete workflows
# 4. Generate screenshots
# 5. Create detailed report

# Results appear in:
# - Console (real-time)
# - screenshots/ folder
# - reports/ folder
```

## ✅ What Success Looks Like

```
╔════════════════════════════════════════════════════╗
║                 TEST SUMMARY                       ║
╚════════════════════════════════════════════════════╝

Total Tests Run: 87
✅ Passed: 82
❌ Failed: 5
📊 Success Rate: 94%

📈 Results by User Role:
  ADMIN: ✅ 20 | ❌ 1
  TEACHER: ✅ 25 | ❌ 2
  PARENT: ✅ 18 | ❌ 1
  STUDENT: ✅ 19 | ❌ 1

📈 Results by HTTP Method:
  GET: ✅ 35 | ❌ 2
  POST: ✅ 30 | ❌ 2
  PUT: ✅ 12 | ❌ 1
  DELETE: ✅ 5 | ❌ 0
```