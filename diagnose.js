const fetch = require('node-fetch');

async function diagnose() {
  console.log('🔍 DIAGNOSING WEBSITE ON PORT 3001');
  console.log('=' .repeat(50));

  const tests = [
    { name: 'Homepage', url: 'http://localhost:3004/' },
    { name: 'Login Page', url: 'http://localhost:3004/login' },
    { name: 'Dashboard', url: 'http://localhost:3004/dashboard' },
    { name: 'API Auth Providers', url: 'http://localhost:3004/api/auth/providers' },
    { name: 'API CSRF', url: 'http://localhost:3004/api/auth/csrf' },
    { name: 'API Session', url: 'http://localhost:3004/api/auth/session' },
    { name: 'API Students', url: 'http://localhost:3004/api/students' }
  ];

  for (const test of tests) {
    try {
      console.log(`\n📝 Testing ${test.name}...`);
      const response = await fetch(test.url, {
        timeout: 5000,
        headers: { 'User-Agent': 'Diagnostic-Tool' }
      });

      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);

      if (response.status >= 400) {
        const errorText = await response.text();
        console.log(`   ❌ Error Response: ${errorText.substring(0, 200)}...`);

        if (errorText.includes('MODULE_NOT_FOUND') || errorText.includes('Cannot find module')) {
          console.log('   🔧 ISSUE: Missing module or build problem');
        }
        if (errorText.includes('gradeLevel')) {
          console.log('   🔧 ISSUE: Database schema mismatch');
        }
        if (errorText.includes('JWT') || errorText.includes('session')) {
          console.log('   🔧 ISSUE: Authentication problem');
        }
        if (errorText.includes('ECONNREFUSED') || errorText.includes('database')) {
          console.log('   🔧 ISSUE: Database connection problem');
        }
      } else {
        console.log(`   ✅ Success`);
      }

    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
      if (error.message.includes('ECONNREFUSED')) {
        console.log('   🔧 ISSUE: Server not running on this port');
      }
    }
  }

  // Test static assets
  console.log('\n📁 Testing Static Assets...');
  const staticAssets = [
    'http://localhost:3004/_next/static/css/app/layout.css',
    'http://localhost:3004/_next/static/chunks/main-app.js'
  ];

  for (const asset of staticAssets) {
    try {
      const response = await fetch(asset, { timeout: 3000 });
      console.log(`   ${asset.split('/').pop()}: ${response.status}`);
    } catch (error) {
      console.log(`   ${asset.split('/').pop()}: ❌ ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎯 DIAGNOSIS COMPLETE');
}

diagnose().catch(console.error);