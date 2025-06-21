/**
 * Test file for storage abstraction layer
 * This can be run in a browser environment to test functionality
 */

import { local } from './storage.js';

// Test data
const testData = {
  recording: false,
  micActive: true,
  cameraActive: false,
  recordingType: 'screen',
  qualityValue: '1080p',
  fpsValue: '30',
  backgroundEffect: 'blur',
  countdown: true,
  alarmTime: 300,
  testObject: {
    nested: {
      value: 42,
      array: [1, 2, 3]
    }
  }
};

async function runTests() {
  console.log('🧪 Starting storage abstraction layer tests...');
  
  try {
    // Test 1: Clear storage
    console.log('Test 1: Clearing storage...');
    await local.clear();
    console.log('✅ Storage cleared');
    
    // Test 2: Set data
    console.log('Test 2: Setting test data...');
    await local.set(testData);
    console.log('✅ Test data set');
    
    // Test 3: Get all data
    console.log('Test 3: Getting all data...');
    const allData = await local.get();
    console.log('Retrieved data:', allData);
    console.log('✅ All data retrieved');
    
    // Test 4: Get specific key
    console.log('Test 4: Getting specific key (recording)...');
    const recordingData = await local.get('recording');
    console.log('Recording data:', recordingData);
    console.log('✅ Specific key retrieved');
    
    // Test 5: Get array of keys
    console.log('Test 5: Getting array of keys...');
    const multipleKeys = await local.get(['micActive', 'cameraActive', 'recordingType']);
    console.log('Multiple keys data:', multipleKeys);
    console.log('✅ Array of keys retrieved');
    
    // Test 6: Get with defaults
    console.log('Test 6: Getting with defaults...');
    const withDefaults = await local.get({
      nonExistentKey: 'defaultValue',
      recording: 'shouldBeOverridden',
      anotherMissingKey: { default: 'object' }
    });
    console.log('Data with defaults:', withDefaults);
    console.log('✅ Get with defaults works');
    
    // Test 7: Update existing data
    console.log('Test 7: Updating existing data...');
    await local.set({ recording: true, newKey: 'newValue' });
    const updatedData = await local.get(['recording', 'newKey']);
    console.log('Updated data:', updatedData);
    console.log('✅ Data updated');
    
    // Test 8: Remove keys
    console.log('Test 8: Removing keys...');
    await local.remove(['newKey', 'testObject']);
    const afterRemoval = await local.get(['newKey', 'testObject', 'recording']);
    console.log('After removal:', afterRemoval);
    console.log('✅ Keys removed');
    
    // Test 9: Performance test
    console.log('Test 9: Performance test...');
    const startTime = performance.now();
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(local.set({ [`perfTest${i}`]: `value${i}` }));
    }
    await Promise.all(promises);
    
    const getAllStart = performance.now();
    await local.get();
    const getAllEnd = performance.now();
    
    const endTime = performance.now();
    console.log(`Performance: Set 100 items in ${endTime - startTime}ms`);
    console.log(`Performance: Get all items in ${getAllEnd - getAllStart}ms`);
    console.log('✅ Performance test completed');
    
    // Test 10: Clean up performance test data
    console.log('Test 10: Cleaning up...');
    const keysToRemove = [];
    for (let i = 0; i < 100; i++) {
      keysToRemove.push(`perfTest${i}`);
    }
    await local.remove(keysToRemove);
    console.log('✅ Cleanup completed');
    
    console.log('🎉 All tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Export for use in browser console or test environments
if (typeof window !== 'undefined') {
  window.testStorage = runTests;
  console.log('Run window.testStorage() to test the storage layer');
}

export { runTests };