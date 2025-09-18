const fetch = require('node-fetch');

async function testCreateStudent() {
  const baseUrl = 'http://localhost:3001';

  console.log('Testing Student Creation for Teacher');
  console.log('=' .repeat(50));

  try {
    // Step 1: Login as teacher
    console.log('\n1. Logging in as teacher...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'teacher@example.com',
        password: 'password123'
      }),
      credentials: 'include'
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', loginResponse.status);
      return;
    }

    // Get cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✓ Logged in successfully');

    // Step 2: Check existing students
    console.log('\n2. Checking existing students...');
    const studentsResponse = await fetch(`${baseUrl}/api/users/students`, {
      headers: {
        'Cookie': cookies || ''
      }
    });

    if (studentsResponse.ok) {
      const students = await studentsResponse.json();
      console.log(`Found ${students.length} existing students`);

      if (students.length > 0) {
        console.log('Existing students:');
        students.forEach(s => {
          console.log(`  - ${s.name || s.firstName + ' ' + s.lastName} (${s.username})`);
        });
      }
    }

    // Step 3: Create a new student
    console.log('\n3. Creating a new student...');
    const timestamp = Date.now();
    const newStudent = {
      firstName: 'John',
      lastName: 'Smith',
      username: `john_smith_${timestamp}`,
      password: 'password123',
      email: `john.smith.${timestamp}@example.com`
    };

    const createResponse = await fetch(`${baseUrl}/api/users/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(newStudent)
    });

    if (createResponse.ok) {
      const created = await createResponse.json();
      console.log('✓ Student created successfully!');
      console.log(`  Name: ${created.name}`);
      console.log(`  Username: ${created.username}`);
      console.log(`  ID: ${created.id}`);

      // Step 4: Verify student appears in list
      console.log('\n4. Verifying student in list...');
      const verifyResponse = await fetch(`${baseUrl}/api/users/students`, {
        headers: {
          'Cookie': cookies || ''
        }
      });

      if (verifyResponse.ok) {
        const updatedStudents = await verifyResponse.json();
        const found = updatedStudents.find(s => s.id === created.id);
        if (found) {
          console.log('✓ Student verified in list');
          console.log(`\nTotal students now: ${updatedStudents.length}`);
        } else {
          console.log('⚠ Student not found in list');
        }
      }
    } else {
      const error = await createResponse.text();
      console.error('Failed to create student:', error);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test completed!');
}

// Run the test
testCreateStudent().catch(console.error);