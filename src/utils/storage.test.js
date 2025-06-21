/**
 * Jest tests for storage abstraction layer
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

describe('Storage Abstraction Layer', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await local.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await local.clear();
  });

  describe('Basic Operations', () => {
    test('should clear storage successfully', async () => {
      // First set some data
      await local.set({ testKey: 'testValue' });
      
      // Then clear it
      await local.clear();
      
      // Verify it's cleared
      const result = await local.get();
      expect(result).toEqual({});
    });

    test('should set and get data successfully', async () => {
      await local.set(testData);
      const result = await local.get();
      
      expect(result).toEqual(testData);
    });

    test('should get specific key', async () => {
      await local.set(testData);
      const result = await local.get('recording');
      
      expect(result).toEqual({ recording: false });
    });

    test('should get multiple keys', async () => {
      await local.set(testData);
      const result = await local.get(['micActive', 'cameraActive', 'recordingType']);
      
      expect(result).toEqual({
        micActive: true,
        cameraActive: false,
        recordingType: 'screen'
      });
    });

    test('should handle non-existent keys', async () => {
      const result = await local.get('nonExistentKey');
      expect(result).toEqual({});
    });
  });

  describe('Default Values', () => {
    test('should return defaults for missing keys', async () => {
      await local.set({ recording: false });
      
      const result = await local.get({
        nonExistentKey: 'defaultValue',
        recording: 'shouldBeOverridden',
        anotherMissingKey: { default: 'object' }
      });
      
      expect(result).toEqual({
        nonExistentKey: 'defaultValue',
        recording: false,
        anotherMissingKey: { default: 'object' }
      });
    });

    test('should handle empty defaults object', async () => {
      const result = await local.get({});
      expect(result).toEqual({});
    });
  });

  describe('Update Operations', () => {
    test('should update existing data', async () => {
      await local.set(testData);
      await local.set({ recording: true, newKey: 'newValue' });
      
      const result = await local.get(['recording', 'newKey', 'micActive']);
      
      expect(result).toEqual({
        recording: true,
        newKey: 'newValue',
        micActive: true
      });
    });

    test('should merge objects correctly', async () => {
      await local.set({ 
        config: { setting1: 'value1', setting2: 'value2' } 
      });
      
      await local.set({ 
        config: { setting2: 'updated', setting3: 'value3' } 
      });
      
      const result = await local.get('config');
      
      expect(result.config).toEqual({
        setting2: 'updated',
        setting3: 'value3'
      });
    });
  });

  describe('Remove Operations', () => {
    test('should remove single key', async () => {
      await local.set(testData);
      await local.remove('testObject');
      
      const result = await local.get(['testObject', 'recording']);
      
      expect(result).toEqual({
        recording: false
      });
    });

    test('should remove multiple keys', async () => {
      await local.set(testData);
      await local.remove(['testObject', 'micActive']);
      
      const result = await local.get(['testObject', 'micActive', 'recording']);
      
      expect(result).toEqual({
        recording: false
      });
    });

    test('should handle removing non-existent keys', async () => {
      await local.set({ recording: false });
      await local.remove(['nonExistent', 'alsoMissing']);
      
      const result = await local.get();
      
      expect(result).toEqual({ recording: false });
    });
  });

  describe('Complex Data Types', () => {
    test('should handle nested objects', async () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, { nested: 'value' }],
              boolean: true,
              number: 42
            }
          }
        }
      };
      
      await local.set(complexData);
      const result = await local.get();
      
      expect(result).toEqual(complexData);
    });

    test('should handle arrays', async () => {
      const arrayData = {
        simpleArray: [1, 2, 3],
        objectArray: [{ id: 1 }, { id: 2 }],
        mixedArray: [1, 'string', { key: 'value' }, true]
      };
      
      await local.set(arrayData);
      const result = await local.get();
      
      expect(result).toEqual(arrayData);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid parameters gracefully', async () => {
      // Test with null
      const result1 = await local.get(null);
      expect(result1).toEqual({});
      
      // Test with undefined
      const result2 = await local.get(undefined);
      expect(result2).toEqual({});
    });

    test('should handle setting null values', async () => {
      await local.set({ nullValue: null });
      const result = await local.get('nullValue');
      
      expect(result).toEqual({ nullValue: null });
    });
  });

  describe('Performance', () => {
    test('should handle multiple concurrent operations', async () => {
      const promises = [];
      
      // Set 50 items concurrently
      for (let i = 0; i < 50; i++) {
        promises.push(local.set({ [`perfTest${i}`]: `value${i}` }));
      }
      
      await Promise.all(promises);
      
      // Verify all items were set
      const result = await local.get();
      
      for (let i = 0; i < 50; i++) {
        expect(result[`perfTest${i}`]).toBe(`value${i}`);
      }
    });

    test('should perform get operations efficiently', async () => {
      // Set up test data
      const largeData = {};
      for (let i = 0; i < 100; i++) {
        largeData[`key${i}`] = `value${i}`;
      }
      await local.set(largeData);
      
      // Time the get operation
      const startTime = performance.now();
      const result = await local.get();
      const endTime = performance.now();
      
      // Should complete in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(Object.keys(result)).toHaveLength(100);
    });
  });
});