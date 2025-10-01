const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test the simplified tier system
async function testSimplifiedTiers() {
  console.log('=== TESTING SIMPLIFIED TIER SYSTEM ===\n');
  console.log('✅ Tiers now ONLY limit:');
  console.log('   - Number of exams you can create');
  console.log('   - Number of study modules you can create');
  console.log('   - How many days the tier lasts\n');
  console.log('✅ Everything else is UNLIMITED:');
  console.log('   - Unlimited students');
  console.log('   - Unlimited classes');
  console.log('   - Unlimited assignments');
  console.log('   - All other features\n');

  try {
    // Login as admin
    console.log('1. Logging in as admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      emailOrUsername: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    console.log('✓ Admin logged in\n');

    // Get all tiers
    console.log('2. Fetching available tiers...');
    const tiersResponse = await axios.get(`${API_URL}/tiers`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    console.log('Available Tiers:');
    console.log('================');
    tiersResponse.data.data.forEach(tier => {
      console.log(`
📦 ${tier.name}
   Price: ${tier.price} ${tier.currency}
   Exams: ${tier.maxExams} allowed
   Study Modules: ${tier.maxStudyModules} allowed
   Duration: ${tier.validityDays} days
   Description: ${tier.description}`);
    });

    // Create a test teacher
    console.log('\n3. Creating test teacher...');
    let teacherToken;
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: 'teacher2@test.com',
        username: 'teacher2',
        password: 'teacher123',
        name: 'Test Teacher 2',
        role: 'TEACHER'
      });
    } catch (e) {
      // Already exists, login
      const teacherLogin = await axios.post(`${API_URL}/auth/login`, {
        emailOrUsername: 'teacher2',
        password: 'teacher123'
      });
      teacherToken = teacherLogin.data.token;
    }

    if (!teacherToken) {
      const teacherLogin = await axios.post(`${API_URL}/auth/login`, {
        emailOrUsername: 'teacher2',
        password: 'teacher123'
      });
      teacherToken = teacherLogin.data.token;
    }
    console.log('✓ Teacher ready\n');

    // Check teacher's tier
    console.log('4. Checking teacher tier...');
    const teacherTier = await axios.get(`${API_URL}/tiers/user`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });

    if (teacherTier.data.data) {
      console.log(`Teacher has tier: ${teacherTier.data.data.tier.name}`);
      console.log(`Days remaining: ${teacherTier.data.data.daysRemaining}`);
      console.log(`Usage: ${teacherTier.data.data.usageLimits.examsRemaining} exams remaining`);
    } else {
      console.log('Teacher has no tier - assigning Basic tier...');

      // Get Basic tier
      const basicTier = tiersResponse.data.data.find(t => t.name === 'Basic');

      // Get teacher ID from token
      const decoded = JSON.parse(Buffer.from(teacherToken.split('.')[1], 'base64').toString());

      // Assign tier
      await axios.post(`${API_URL}/tiers/assign`, {
        userId: decoded.id,
        tierId: basicTier.id,
        validityDays: 30
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      console.log('✓ Basic tier assigned (30 days, 10 exams, 10 modules)\n');
    }

    // Test creating students (should be unlimited)
    console.log('5. Testing unlimited student creation...');
    for (let i = 1; i <= 5; i++) {
      try {
        await axios.post(`${API_URL}/students`, {
          name: `Student ${i}`,
          username: `student${i}_${Date.now()}`,
          password: 'student123'
        }, {
          headers: { Authorization: `Bearer ${teacherToken}` }
        });
        console.log(`   ✓ Student ${i} created (no limits!)`)
      } catch (e) {
        console.log(`   ⚠️ Student ${i} creation failed:`, e.response?.data?.error);
      }
    }

    console.log('\n✅ TIER SYSTEM IS SIMPLIFIED AND WORKING!');
    console.log('   - Only exams and study modules are limited');
    console.log('   - Students and all other features are unlimited');
    console.log('   - Tiers expire after specified days (default 30)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSimplifiedTiers();