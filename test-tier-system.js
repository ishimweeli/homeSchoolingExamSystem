const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test credentials
const adminUser = { emailOrUsername: 'admin', password: 'admin123' };
const testParent = { email: 'parent@test.com', username: 'testparent', password: 'parent123', name: 'Test Parent' };

let adminToken = '';
let parentToken = '';
let parentUserId = '';

async function loginUser(credentials) {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function registerUser(userData) {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, {
      ...userData,
      role: 'PARENT'
    });
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetTiers(token) {
  try {
    const response = await axios.get(`${API_URL}/tiers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Available tiers:', response.data.data.map(t => ({
      name: t.name,
      price: `${t.price} ${t.currency}`,
      limits: `Exams: ${t.maxExams}, Modules: ${t.maxStudyModules}, Students: ${t.maxStudents}`
    })));
    return response.data.data;
  } catch (error) {
    console.error('Failed to get tiers:', error.response?.data || error.message);
  }
}

async function testAssignTier(adminToken, userId, tierId) {
  try {
    const response = await axios.post(`${API_URL}/tiers/assign`, {
      userId,
      tierId,
      validityDays: 30
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('Tier assigned successfully:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('Failed to assign tier:', error.response?.data || error.message);
  }
}

async function testGetUserTier(token, userId = null) {
  try {
    const url = userId ? `${API_URL}/tiers/user/${userId}` : `${API_URL}/tiers/user`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.data) {
      console.log('User tier info:', {
        tierName: response.data.data.tier?.name,
        expiresAt: response.data.data.expiresAt,
        daysRemaining: response.data.data.daysRemaining,
        usageLimits: response.data.data.usageLimits
      });
    } else {
      console.log('User has no tier assigned');
    }

    return response.data.data;
  } catch (error) {
    console.error('Failed to get user tier:', error.response?.data || error.message);
  }
}

async function testCreateExamWithLimit(token) {
  try {
    const examData = {
      title: 'Test Exam with Tier Limit',
      subject: 'Math',
      gradeLevel: 5,
      difficulty: 'MEDIUM',
      duration: 60,
      questions: [
        {
          type: 'MULTIPLE_CHOICE',
          question: 'What is 2 + 2?',
          options: ['3', '4', '5', '6'],
          correctAnswer: '4',
          marks: 5
        }
      ]
    };

    const response = await axios.post(`${API_URL}/exams`, examData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('✓ Exam created successfully:', response.data.data.title);
    return true;
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✗ Exam creation blocked by tier limit:', error.response.data.error);
      return false;
    }
    console.error('Failed to create exam:', error.response?.data || error.message);
    return false;
  }
}

async function testCheckLimit(token, action) {
  try {
    const response = await axios.post(`${API_URL}/tiers/check-limit`, {
      userId: parentUserId,
      action
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`Check ${action} limit:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Failed to check ${action} limit:`, error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('=== TIER SYSTEM TEST ===\n');

  try {
    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    adminToken = await loginUser(adminUser);
    console.log('✓ Admin logged in successfully\n');

    // Step 2: Get available tiers
    console.log('2. Getting available tiers...');
    const tiers = await testGetTiers(adminToken);
    console.log('');

    // Step 3: Register a new parent user
    console.log('3. Registering test parent user...');
    try {
      const parentData = await registerUser(testParent);
      parentUserId = parentData.user.id;
      console.log('✓ Parent user registered:', testParent.email);
    } catch (error) {
      // User might already exist, try to login
      console.log('User might exist, trying to login...');
      parentToken = await loginUser({ emailOrUsername: testParent.username, password: testParent.password });

      // Get user ID from token
      const decoded = JSON.parse(Buffer.from(parentToken.split('.')[1], 'base64').toString());
      parentUserId = decoded.id;
      console.log('✓ Parent logged in successfully');
    }
    console.log('');

    // Step 4: Login as parent if not already
    if (!parentToken) {
      console.log('4. Logging in as parent...');
      parentToken = await loginUser({ emailOrUsername: testParent.username, password: testParent.password });
      console.log('✓ Parent logged in successfully\n');
    }

    // Step 5: Check parent's tier (should be none)
    console.log('5. Checking parent\'s initial tier status...');
    await testGetUserTier(parentToken);
    console.log('');

    // Step 6: Try to create exam without tier (should fail)
    console.log('6. Testing exam creation without tier...');
    const canCreateWithoutTier = await testCreateExamWithLimit(parentToken);
    console.log('');

    // Step 7: Assign Basic tier to parent
    console.log('7. Assigning Basic tier to parent...');
    const basicTier = tiers.find(t => t.name === 'Basic');
    if (basicTier) {
      await testAssignTier(adminToken, parentUserId, basicTier.id);
      console.log('');

      // Step 8: Check parent's tier after assignment
      console.log('8. Checking parent\'s tier after assignment...');
      await testGetUserTier(parentToken);
      console.log('');

      // Step 9: Check limits before creation
      console.log('9. Checking creation limits...');
      await testCheckLimit(parentToken, 'CREATE_EXAM');
      await testCheckLimit(parentToken, 'CREATE_STUDY_MODULE');
      await testCheckLimit(parentToken, 'CREATE_STUDENT');
      console.log('');

      // Step 10: Create exams up to the limit
      console.log('10. Testing exam creation with tier...');
      const maxExams = basicTier.maxExams;
      for (let i = 1; i <= maxExams + 1; i++) {
        console.log(`Creating exam ${i}/${maxExams}...`);
        const success = await testCreateExamWithLimit(parentToken);
        if (!success && i === maxExams + 1) {
          console.log('✓ Tier limit enforcement working correctly!');
        }
      }
      console.log('');

      // Step 11: Check updated usage
      console.log('11. Checking updated tier usage...');
      await testGetUserTier(parentToken);
      console.log('');
    }

    // Step 12: Get all user tiers (admin only)
    console.log('12. Getting all user tier assignments (admin only)...');
    try {
      const response = await axios.get(`${API_URL}/tiers/users/all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('Total user tier assignments:', response.data.data.length);
      response.data.data.forEach(ut => {
        console.log(`- User: ${ut.user.email || ut.user.username}, Tier: ${ut.tier.name}, Expires: ${ut.expiresAt}`);
      });
    } catch (error) {
      console.error('Failed to get all user tiers:', error.response?.data || error.message);
    }

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error(error);
  }
}

// Run the tests
runTests();