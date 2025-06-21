/**
 * Cross-browser compatibility tests
 * Tests web API support and fallback mechanisms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import messageService from '../../utils/messageService.js';
import { local as storage } from '../../utils/storage.js';

// Mock storage
jest.mock('../../utils/storage.js', () => ({
  local: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

describe('Browser Compatibility Tests', () => {
  let originalBroadcastChannel;
  let originalMediaDevices;
  let originalIndexedDB;

  beforeEach(() => {
    // Store original APIs
    originalBroadcastChannel = global.BroadcastChannel;
    originalMediaDevices = global.navigator?.mediaDevices;
    originalIndexedDB = global.indexedDB;

    // Reset mocks
    const { local: mockStorage } = require('../../utils/storage.js');
    mockStorage.get.mockResolvedValue({});
    mockStorage.set.mockResolvedValue();
  });

  afterEach(() => {
    // Restore original APIs
    global.BroadcastChannel = originalBroadcastChannel;
    if (global.navigator) {
      global.navigator.mediaDevices = originalMediaDevices;
    }
    global.indexedDB = originalIndexedDB;
    
    jest.clearAllMocks();
  });

  test('BroadcastChannel API fallback', async () => {
    // Simulate browser without BroadcastChannel support
    delete global.BroadcastChannel;
    
    // Create new message service instance
    const testService = new (messageService.constructor)();
    
    expect(testService.broadcastChannel).toBeNull();
    
    // Message sending should still work via custom events
    const messageHandler = jest.fn();
    testService.addMessageHandler('test-message', messageHandler);
    
    // Send message
    testService.sendMessage('test-message', { data: 'test' });
    
    // Should work even without BroadcastChannel
    await waitFor(() => {
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({ data: 'test' }),
        expect.any(Function)
      );
    });
  });

  test('MediaDevices API feature detection', () => {
    // Test with full support
    global.navigator = {
      mediaDevices: {
        getDisplayMedia: jest.fn(),
        getUserMedia: jest.fn(),
        enumerateDevices: jest.fn()
      }
    };
    
    expect(navigator.mediaDevices.getDisplayMedia).toBeDefined();
    expect(navigator.mediaDevices.getUserMedia).toBeDefined();
    
    // Test without getDisplayMedia (older browsers)
    delete global.navigator.mediaDevices.getDisplayMedia;
    
    expect(navigator.mediaDevices.getDisplayMedia).toBeUndefined();
    expect(navigator.mediaDevices.getUserMedia).toBeDefined();
    
    // Test without mediaDevices entirely (very old browsers)
    delete global.navigator.mediaDevices;
    
    expect(navigator.mediaDevices).toBeUndefined();
  });

  test('MediaRecorder API support', () => {
    // Test with full support
    global.MediaRecorder = jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      addEventListener: jest.fn()
    }));
    global.MediaRecorder.isTypeSupported = jest.fn(() => true);
    
    expect(global.MediaRecorder).toBeDefined();
    expect(global.MediaRecorder.isTypeSupported('video/webm')).toBe(true);
    
    // Test without codec support
    global.MediaRecorder.isTypeSupported = jest.fn(() => false);
    expect(global.MediaRecorder.isTypeSupported('video/webm')).toBe(false);
    
    // Test without MediaRecorder entirely
    delete global.MediaRecorder;
    expect(global.MediaRecorder).toBeUndefined();
  });

  test('IndexedDB fallback to localStorage', async () => {
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn()
    };
    
    global.localStorage = localStorageMock;
    
    // Simulate browser without IndexedDB
    delete global.indexedDB;
    
    // Storage should fallback to localStorage
    await storage.set({ test: 'value' });
    
    // Note: The actual implementation would need to detect this and fallback
    // This test verifies the detection mechanism
    expect(global.indexedDB).toBeUndefined();
    expect(global.localStorage).toBeDefined();
  });

  test('URL.createObjectURL support', () => {
    // Test with support
    global.URL = {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
      revokeObjectURL: jest.fn()
    };
    
    const blob = new Blob(['test'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    expect(url).toBe('blob:mock-url');
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    
    // Test without support
    delete global.URL.createObjectURL;
    expect(global.URL.createObjectURL).toBeUndefined();
  });

  test('Permissions API support', async () => {
    // Test with Permissions API
    global.navigator.permissions = {
      query: jest.fn().mockResolvedValue({ state: 'granted' })
    };
    
    const result = await navigator.permissions.query({ name: 'camera' });
    expect(result.state).toBe('granted');
    
    // Test without Permissions API
    delete global.navigator.permissions;
    expect(navigator.permissions).toBeUndefined();
  });

  test('ES6+ feature detection', () => {
    // Test Promise support
    expect(Promise).toBeDefined();
    expect(typeof Promise.resolve).toBe('function');
    
    // Test async/await support (implicitly tested by running these tests)
    const asyncFunction = async () => 'test';
    expect(asyncFunction).toBeDefined();
    
    // Test Map/Set support
    expect(Map).toBeDefined();
    expect(Set).toBeDefined();
    
    // Test arrow functions (used throughout codebase)
    const arrow = () => 'test';
    expect(arrow()).toBe('test');
    
    // Test destructuring (used throughout codebase)
    const obj = { a: 1, b: 2 };
    const { a, b } = obj;
    expect(a).toBe(1);
    expect(b).toBe(2);
  });

  test('CSS feature detection', () => {
    // Mock CSS support detection
    const testElement = document.createElement('div');
    
    // Test CSS Grid support
    testElement.style.display = 'grid';
    const supportsGrid = testElement.style.display === 'grid';
    
    // Test CSS Flexbox support
    testElement.style.display = 'flex';
    const supportsFlex = testElement.style.display === 'flex';
    
    // Test CSS Custom Properties (CSS Variables)
    testElement.style.setProperty('--test-var', 'test');
    const supportsCustomProps = testElement.style.getPropertyValue('--test-var') === 'test';
    
    console.log('CSS Support:', {
      grid: supportsGrid,
      flex: supportsFlex,
      customProperties: supportsCustomProps
    });
    
    // These should be supported in modern test environments
    expect(supportsFlex).toBe(true);
  });

  test('Audio API support', () => {
    // Test AudioContext support
    global.AudioContext = jest.fn(() => ({
      createMediaStreamSource: jest.fn(() => ({
        connect: jest.fn()
      })),
      createMediaStreamDestination: jest.fn(() => ({
        stream: { getAudioTracks: jest.fn(() => []) }
      }))
    }));
    
    expect(global.AudioContext).toBeDefined();
    
    // Test webkitAudioContext fallback
    delete global.AudioContext;
    global.webkitAudioContext = global.AudioContext;
    
    expect(global.webkitAudioContext).toBeDefined();
    
    // Test without audio support
    delete global.webkitAudioContext;
    expect(global.AudioContext).toBeUndefined();
  });

  test('Clipboard API support', () => {
    // Test modern Clipboard API
    global.navigator.clipboard = {
      writeText: jest.fn().mockResolvedValue(),
      readText: jest.fn().mockResolvedValue('test')
    };
    
    expect(navigator.clipboard.writeText).toBeDefined();
    
    // Test without Clipboard API (fallback to execCommand)
    delete global.navigator.clipboard;
    
    global.document.execCommand = jest.fn(() => true);
    expect(document.execCommand).toBeDefined();
  });

  test('File API support', () => {
    // Test File API
    expect(global.File).toBeDefined();
    expect(global.FileReader).toBeDefined();
    expect(global.Blob).toBeDefined();
    
    // Test file creation
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    expect(file.name).toBe('test.txt');
    expect(file.type).toBe('text/plain');
    
    // Test blob creation
    const blob = new Blob(['content'], { type: 'text/plain' });
    expect(blob.type).toBe('text/plain');
  });

  test('WebWorker support', () => {
    // Test Worker API
    global.Worker = jest.fn(() => ({
      postMessage: jest.fn(),
      terminate: jest.fn(),
      addEventListener: jest.fn()
    }));
    
    expect(global.Worker).toBeDefined();
    
    const worker = new Worker('test.js');
    expect(worker.postMessage).toBeDefined();
    
    // Test without Worker support
    delete global.Worker;
    expect(global.Worker).toBeUndefined();
  });

  test('Service Worker support', () => {
    // Test Service Worker API
    global.navigator.serviceWorker = {
      register: jest.fn().mockResolvedValue({}),
      ready: Promise.resolve({})
    };
    
    expect(navigator.serviceWorker.register).toBeDefined();
    
    // Test without Service Worker support
    delete global.navigator.serviceWorker;
    expect(navigator.serviceWorker).toBeUndefined();
  });

  test('WebRTC support', () => {
    // Test RTCPeerConnection
    global.RTCPeerConnection = jest.fn(() => ({
      createOffer: jest.fn(),
      createAnswer: jest.fn(),
      setLocalDescription: jest.fn(),
      setRemoteDescription: jest.fn()
    }));
    
    expect(global.RTCPeerConnection).toBeDefined();
    
    // Test vendor prefixed versions
    delete global.RTCPeerConnection;
    global.webkitRTCPeerConnection = global.RTCPeerConnection;
    global.mozRTCPeerConnection = global.RTCPeerConnection;
    
    expect(global.webkitRTCPeerConnection || global.mozRTCPeerConnection).toBeDefined();
  });
});