/**
 * Test setup file for Jest and React Testing Library
 * This file is run before each test suite
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia (used by many UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock navigator.mediaDevices (for camera/screen recording)
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
          getSettings: () => ({ width: 1920, height: 1080 }),
        }
      ],
    }),
    getDisplayMedia: jest.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
          getSettings: () => ({ width: 1920, height: 1080 }),
        }
      ],
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Mock Camera' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Mock Microphone' },
    ]),
  },
});

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive',
  mimeType: 'video/webm',
}));

// Mock BroadcastChannel (used for inter-component communication)
global.BroadcastChannel = jest.fn().mockImplementation(() => ({
  postMessage: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock IndexedDB (for storage layer testing)
class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
  }
  
  simulateSuccess(result) {
    this.result = result;
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess({ target: this });
      }
    }, 0);
  }
  
  simulateError(error) {
    this.error = error;
    setTimeout(() => {
      if (this.onerror) {
        this.onerror({ target: this });
      }
    }, 0);
  }
}

// Shared storage across all object store instances for persistence
const mockStorage = new Map();

class MockObjectStore {
  constructor(storeName = 'default') {
    this.storeName = storeName;
    if (!mockStorage.has(storeName)) {
      mockStorage.set(storeName, new Map());
    }
  }
  
  get data() {
    return mockStorage.get(this.storeName);
  }
  
  get(key) {
    const request = new MockIDBRequest();
    const value = this.data.get(key);
    request.simulateSuccess(value);
    return request;
  }
  
  getAll() {
    const request = new MockIDBRequest();
    const values = Array.from(this.data.values());
    request.simulateSuccess(values);
    return request;
  }
  
  getAllKeys() {
    const request = new MockIDBRequest();
    const keys = Array.from(this.data.keys());
    request.simulateSuccess(keys);
    return request;
  }
  
  put(value, key) {
    const request = new MockIDBRequest();
    this.data.set(key, value);
    request.simulateSuccess(key);
    return request;
  }
  
  delete(key) {
    const request = new MockIDBRequest();
    const deleted = this.data.delete(key);
    request.simulateSuccess(undefined);
    return request;
  }
  
  clear() {
    const request = new MockIDBRequest();
    this.data.clear();
    request.simulateSuccess(undefined);
    return request;
  }
}

class MockTransaction {
  constructor(storeName) {
    this.storeName = storeName;
    this.objectStore = jest.fn().mockImplementation((name) => {
      return new MockObjectStore(name);
    });
  }
}

class MockDatabase {
  constructor() {
    this.objectStoreNames = { 
      contains: jest.fn().mockReturnValue(false) 
    };
    this.transaction = jest.fn().mockImplementation((storeNames, mode) => {
      const storeName = Array.isArray(storeNames) ? storeNames[0] : storeNames;
      return new MockTransaction(storeName);
    });
    this.close = jest.fn();
  }
  
  createObjectStore(name) {
    return new MockObjectStore(name);
  }
}

global.indexedDB = {
  open: jest.fn().mockImplementation(() => {
    const request = new MockIDBRequest();
    const db = new MockDatabase();
    
    // Simulate upgrade needed first, then success
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: db } });
      }
      request.simulateSuccess(db);
    }, 0);
    
    return request;
  }),
  deleteDatabase: jest.fn().mockImplementation(() => {
    const request = new MockIDBRequest();
    request.simulateSuccess(undefined);
    return request;
  }),
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock ResizeObserver (used by some UI components)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.performance
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
  },
});

// Mock chrome extension APIs (for compatibility layer testing)
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
  permissions: {
    request: jest.fn().mockResolvedValue(true),
    contains: jest.fn().mockResolvedValue(true),
  },
  desktopCapture: {
    chooseDesktopMedia: jest.fn(),
  },
};

// Suppress console warnings in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Clear mock IndexedDB storage
  mockStorage.clear();
  
  // Reset localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

afterEach(() => {
  // Clean up after each test
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Helper to create mock media stream
  createMockMediaStream: () => ({
    getTracks: () => [
      {
        stop: jest.fn(),
        getSettings: () => ({ width: 1920, height: 1080 }),
        kind: 'video',
      }
    ],
    getVideoTracks: () => [
      {
        stop: jest.fn(),
        getSettings: () => ({ width: 1920, height: 1080 }),
        kind: 'video',
      }
    ],
    getAudioTracks: () => [],
  }),
  
  // Helper to create mock recording data
  createMockRecordingData: () => ({
    recording: false,
    recordingType: 'screen',
    micActive: true,
    cameraActive: false,
    qualityValue: '1080p',
    fpsValue: '30',
  }),
  
  // Helper to wait for async operations
  waitFor: (fn, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkCondition = () => {
        try {
          const result = fn();
          if (result) {
            resolve(result);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'));
          } else {
            setTimeout(checkCondition, 10);
          }
        } catch (error) {
          if (Date.now() - startTime > timeout) {
            reject(error);
          } else {
            setTimeout(checkCondition, 10);
          }
        }
      };
      checkCondition();
    });
  },
};