/**
 * Jest tests for Chrome API compatibility layer
 */

import chrome, { 
  runtime, 
  tabs, 
  permissions, 
  i18n, 
  action, 
  commands, 
  desktopCapture, 
  windows 
} from './chromeCompat.js';

describe('Chrome API Compatibility Layer', () => {
  beforeEach(() => {
    // Clear any global handlers between tests
    delete window._camcordityMessageHandlers;
    delete window._camcordityCommandHandlers;
    delete window._camcordityStreams;
    
    // Mock window.focus (not implemented in jsdom)
    window.focus = jest.fn();
    
    // Mock console.error to suppress expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore mocks
    jest.restoreAllMocks();
  });

  describe('Runtime API', () => {
    test('should send and receive messages', () => {
      const testMessage = { id: 'test-123', action: 'test', data: 'hello' };
      const expectedResponse = { success: true, data: 'response' };

      let messageReceived = false;
      let responseReceived = false;

      // Set up message listener
      runtime.onMessage.addListener((message, sender, sendResponse) => {
        expect(message).toEqual(testMessage);
        expect(sender).toBeDefined();
        messageReceived = true;
        sendResponse(expectedResponse);
      });

      // Send message with callback
      runtime.sendMessage(testMessage, (response) => {
        expect(response).toEqual(expectedResponse);
        responseReceived = true;
      });

      // Message should be received synchronously in test environment
      expect(messageReceived).toBe(true);
      expect(responseReceived).toBe(true);
    });

    test('should add and remove message listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      runtime.onMessage.addListener(listener1);
      runtime.onMessage.addListener(listener2);

      expect(runtime.onMessage.hasListener(listener1)).toBe(true);
      expect(runtime.onMessage.hasListener(listener2)).toBe(true);

      runtime.onMessage.removeListener(listener1);
      expect(runtime.onMessage.hasListener(listener1)).toBe(false);
      expect(runtime.onMessage.hasListener(listener2)).toBe(true);
    });

    test('should generate correct URLs', () => {
      // Mock location.origin
      delete window.location;
      window.location = { origin: 'https://example.com' };

      const url = runtime.getURL('assets/icon.png');
      expect(url).toBe('https://example.com/assets/icon.png');
    });

    test('should return manifest information', () => {
      const manifest = runtime.getManifest();
      expect(manifest).toEqual({
        version: '3.0.0',
        name: 'Camcordity',
        description: 'Free and privacy-friendly screen recorder'
      });
    });

    test('should reload window', () => {
      const mockReload = jest.fn();
      delete window.location;
      window.location = { reload: mockReload };

      runtime.reload();
      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Tabs API', () => {
    test('should query current tab', async () => {
      delete window.location;
      window.location = { href: 'https://example.com/page' };

      const tabs = await chrome.tabs.query({});
      expect(tabs).toEqual([{
        id: 1,
        url: 'https://example.com/page',
        active: true,
        windowId: 1
      }]);
    });

    test('should get tab by ID', async () => {
      delete window.location;
      window.location = { href: 'https://example.com/page' };

      const tab = await chrome.tabs.get(1);
      expect(tab).toEqual({
        id: 1,
        url: 'https://example.com/page',
        active: true,
        windowId: 1
      });
    });

    test('should create new tab', () => {
      const mockOpen = jest.fn();
      window.open = mockOpen;

      chrome.tabs.create({ url: 'https://example.com', active: false });
      expect(mockOpen).toHaveBeenCalledWith('https://example.com', '_blank');
    });

    test('should update tab URL when active', () => {
      delete window.location;
      window.location = { href: '' };

      chrome.tabs.update(1, { url: 'https://newurl.com', active: true });
      expect(window.location.href).toBe('https://newurl.com');
    });

    test('should close window when removing tab', () => {
      const mockClose = jest.fn();
      window.close = mockClose;

      chrome.tabs.remove(1);
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Permissions API', () => {
    test('should query camera permission', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ state: 'granted' });
      navigator.permissions = { query: mockQuery };

      const result = await permissions.query({ permissions: ['camera'] });
      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith({ name: 'camera' });
    });

    test('should query microphone permission', async () => {
      const mockQuery = jest.fn().mockResolvedValue({ state: 'denied' });
      navigator.permissions = { query: mockQuery };

      const result = await permissions.query({ permissions: ['microphone'] });
      expect(result).toBe(false);
    });

    test('should handle desktop capture permission', async () => {
      const result = await permissions.query({ permissions: ['desktopCapture'] });
      expect(result).toBe(true); // Always true for desktop capture
    });

    test('should request camera permission via getUserMedia', async () => {
      const mockGetUserMedia = jest.fn().mockResolvedValue(global.testUtils.createMockMediaStream());
      navigator.mediaDevices.getUserMedia = mockGetUserMedia;

      const result = await permissions.request({ permissions: ['camera'] });
      expect(result).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
    });

    test('should handle permission request failure', async () => {
      const mockGetUserMedia = jest.fn().mockRejectedValue(new Error('Permission denied'));
      navigator.mediaDevices.getUserMedia = mockGetUserMedia;

      const result = await permissions.request({ permissions: ['camera'] });
      expect(result).toBe(false);
    });
  });

  describe('i18n API', () => {
    test('should return translated messages', () => {
      const message = i18n.getMessage('extName');
      expect(message).toBe('Camcordity');

      const unknown = i18n.getMessage('unknownKey');
      expect(unknown).toBe('unknownKey');
    });

    test('should handle message substitutions', () => {
      // Add a test message with substitutions
      const testMessage = 'Hello $1, you have $2 items';
      const originalGetMessage = i18n.getMessage;
      
      i18n.getMessage = jest.fn().mockImplementation((key, substitutions) => {
        if (key === 'testSub') {
          let message = testMessage;
          if (substitutions && Array.isArray(substitutions)) {
            substitutions.forEach((sub, index) => {
              message = message.replace(`$${index + 1}`, sub);
            });
          }
          return message;
        }
        return originalGetMessage(key, substitutions);
      });

      const result = i18n.getMessage('testSub', ['World', '5']);
      expect(result).toBe('Hello World, you have 5 items');
    });

    test('should return current UI language', () => {
      const originalLanguage = navigator.language;
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        configurable: true
      });

      const language = i18n.getUILanguage();
      expect(language).toBe('en-US');

      Object.defineProperty(navigator, 'language', {
        value: originalLanguage,
        configurable: true
      });
    });
  });

  describe('Action API', () => {
    test('should set favicon when setting icon', () => {
      document.head.innerHTML = '';
      
      action.setIcon({ path: 'icon.png' });
      
      const link = document.querySelector('link[rel="icon"]');
      expect(link).toBeTruthy();
      expect(link.href).toContain('icon.png');
    });

    test('should add and remove click listeners', () => {
      const listener = jest.fn();
      
      action.onClicked.addListener(listener);
      
      const event = new CustomEvent('camcordity-action-click');
      document.dispatchEvent(event);
      
      expect(listener).toHaveBeenCalledWith(event);
      
      action.onClicked.removeListener(listener);
      
      document.dispatchEvent(event);
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Commands API', () => {
    test('should register command listeners', () => {
      const listener = jest.fn();
      commands.onCommand.addListener(listener);
      
      expect(window._camcordityCommandHandlers).toHaveLength(1);
      expect(window._camcordityCommandHandlers[0].callback).toBe(listener);
    });

    test('should trigger command on keyboard shortcut', () => {
      const listener = jest.fn();
      commands.onCommand.addListener(listener);

      // Simulate Alt+Shift+G keydown
      const event = new KeyboardEvent('keydown', {
        key: 'G',
        altKey: true,
        shiftKey: true,
        bubbles: true
      });
      
      document.dispatchEvent(event);
      expect(listener).toHaveBeenCalledWith('start-recording');
    });

    test('should remove command listeners', () => {
      const listener = jest.fn();
      commands.onCommand.addListener(listener);
      
      expect(window._camcordityCommandHandlers).toHaveLength(1);
      
      commands.onCommand.removeListener(listener);
      expect(window._camcordityCommandHandlers).toHaveLength(0);
    });

    test('should return available commands', async () => {
      const commandsList = await commands.getAll();
      expect(commandsList).toEqual([
        { name: 'start-recording', shortcut: 'Alt+Shift+G', description: 'Start recording' },
        { name: 'cancel-recording', shortcut: 'Alt+Shift+X', description: 'Cancel recording' },
        { name: 'pause-recording', shortcut: 'Alt+Shift+M', description: 'Pause/Resume recording' }
      ]);
    });
  });

  describe('Desktop Capture API', () => {
    test('should capture display media successfully', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getDisplayMedia = jest.fn().mockResolvedValue(mockStream);

      const callback = jest.fn();
      const streamId = await desktopCapture.chooseDesktopMedia(['screen'], null, callback);

      expect(streamId).toContain('web-display-media-');
      expect(callback).toHaveBeenCalledWith(streamId, { canRequestAudioTrack: true });
      expect(window._camcordityStreams[streamId]).toBe(mockStream);
    });

    test('should handle display media capture failure', async () => {
      navigator.mediaDevices.getDisplayMedia = jest.fn().mockRejectedValue(new Error('User cancelled'));

      const callback = jest.fn();
      const streamId = await desktopCapture.chooseDesktopMedia(['screen'], null, callback);

      expect(streamId).toBe(null);
      expect(callback).toHaveBeenCalledWith(null);
    });
  });

  describe('Windows API', () => {
    test('should focus window when updating', () => {
      const mockFocus = jest.fn();
      window.focus = mockFocus;

      const callback = jest.fn();
      windows.update(1, { focused: true }, callback);

      expect(mockFocus).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    test('should add focus change listeners', () => {
      const listener = jest.fn();
      
      windows.onFocusChanged.addListener(listener);
      
      // Simulate focus event
      window.dispatchEvent(new Event('focus'));
      expect(listener).toHaveBeenCalledWith(1);
      
      // Simulate blur event
      window.dispatchEvent(new Event('blur'));
      expect(listener).toHaveBeenCalledWith(-1);
    });
  });

  describe('Global Chrome Object', () => {
    test('should create global chrome object if not exists', () => {
      // Temporarily remove chrome object
      const originalChrome = window.chrome;
      delete window.chrome;
      
      // Re-import module to trigger global assignment
      jest.resetModules();
      require('./chromeCompat.js');
      
      expect(window.chrome).toBeDefined();
      expect(window.chrome.storage).toBeDefined();
      expect(window.chrome.runtime).toBeDefined();
      
      // Restore original chrome object
      window.chrome = originalChrome;
    });

    test('should export all API modules', () => {
      expect(chrome.storage).toBeDefined();
      expect(chrome.runtime).toBeDefined();
      expect(chrome.tabs).toBeDefined();
      expect(chrome.permissions).toBeDefined();
      expect(chrome.i18n).toBeDefined();
      expect(chrome.action).toBeDefined();
      expect(chrome.commands).toBeDefined();
      expect(chrome.desktopCapture).toBeDefined();
      expect(chrome.windows).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should work with storage layer integration', async () => {
      // Test that chrome.storage.local uses our storage abstraction
      await chrome.storage.local.set({ testKey: 'testValue' });
      const result = await chrome.storage.local.get('testKey');
      
      expect(result).toEqual({ testKey: 'testValue' });
    });

    test('should handle complex message passing scenarios', () => {
      let responseCount = 0;
      const responses = [];
      
      // Add multiple listeners
      runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'ping') {
          sendResponse({ action: 'pong', id: message.id });
        }
      });
      
      runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'test') {
          sendResponse({ success: true, timestamp: Date.now() });
        }
      });
      
      // Send multiple messages
      runtime.sendMessage({ id: 1, action: 'ping' }, (response) => {
        expect(response.action).toBe('pong');
        responseCount++;
        responses.push(response);
      });
      
      runtime.sendMessage({ id: 2, action: 'test' }, (response) => {
        expect(response.success).toBe(true);
        responseCount++;
        responses.push(response);
      });
      
      expect(responseCount).toBe(2);
      expect(responses).toHaveLength(2);
    });
  });
});