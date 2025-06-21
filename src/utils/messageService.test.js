/**
 * Tests for messageService communication layer
 */

import messageService from './messageService.js';

// Mock storage
jest.mock('./storage.js', () => ({
  local: {
    get: jest.fn(),
    set: jest.fn()
  }
}));

describe('MessageService', () => {
  beforeEach(() => {
    // Reset any global state
    if (global.BroadcastChannel) {
      global.BroadcastChannel.mockClear?.();
    }
    
    // Clear all handlers
    messageService.messageHandlers.clear();
    messageService.responseHandlers.clear();
  });

  test('should send messages via BroadcastChannel', (done) => {
    const mockChannel = {
      postMessage: jest.fn(),
      addEventListener: jest.fn(),
      close: jest.fn()
    };
    
    global.BroadcastChannel = jest.fn(() => mockChannel);
    
    // Create new service instance
    const testService = new (messageService.constructor)();
    
    testService.sendMessage('test-message', { data: 'test' });
    
    expect(mockChannel.postMessage).toHaveBeenCalledWith({
      type: 'camcordity-message',
      message: expect.objectContaining({
        type: 'test-message',
        data: { data: 'test' },
        _messageId: expect.any(Number),
        timestamp: expect.any(Number)
      })
    });
    
    done();
  });

  test('should handle recording lifecycle messages', async () => {
    const { local: storage } = require('./storage.js');
    storage.set.mockResolvedValue();
    
    let responseReceived = null;
    const sendResponse = (response) => {
      responseReceived = response;
    };

    // Test start recording
    await messageService.handleStartRecording({}, sendResponse);
    expect(storage.set).toHaveBeenCalledWith({ recording: true, paused: false });
    expect(responseReceived).toEqual({ success: true });

    // Reset response
    responseReceived = null;

    // Test stop recording
    await messageService.handleStopRecording({}, sendResponse);
    expect(storage.set).toHaveBeenCalledWith({ recording: false, paused: false });
    expect(responseReceived).toEqual({ success: true });
  });

  test('should handle desktop capture requests', async () => {
    // Mock getDisplayMedia
    const mockStream = {
      getAudioTracks: jest.fn().mockReturnValue([])
    };
    
    global.navigator.mediaDevices = {
      getDisplayMedia: jest.fn().mockResolvedValue(mockStream)
    };

    let responseReceived = null;
    const sendResponse = (response) => {
      responseReceived = response;
    };

    await messageService.handleDesktopCapture({
      width: 1920,
      height: 1080,
      frameRate: 30,
      audio: true
    }, sendResponse);

    expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: true
    });

    expect(responseReceived).toEqual({
      success: true,
      streamId: expect.stringMatching(/^stream-\d+$/),
      canRequestAudioTrack: false
    });
  });

  test('should add and remove message handlers', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();

    // Add handlers
    messageService.addMessageHandler('test-type', handler1);
    messageService.addMessageHandler('test-type', handler2);

    expect(messageService.messageHandlers.get('test-type')).toEqual([handler1, handler2]);

    // Remove one handler
    messageService.removeMessageHandler('test-type', handler1);
    expect(messageService.messageHandlers.get('test-type')).toEqual([handler2]);

    // Remove remaining handler
    messageService.removeMessageHandler('test-type', handler2);
    expect(messageService.messageHandlers.get('test-type')).toEqual([]);
  });

  test('should broadcast state changes', () => {
    const sendMessageSpy = jest.spyOn(messageService, 'sendMessage');
    
    messageService.broadcastStateChange('recording', true);
    
    expect(sendMessageSpy).toHaveBeenCalledWith('state-change', { 
      key: 'recording', 
      value: true 
    });
  });

  test('should handle errors gracefully', async () => {
    const { local: storage } = require('./storage.js');
    storage.set.mockRejectedValue(new Error('Storage error'));
    
    let responseReceived = null;
    const sendResponse = (response) => {
      responseReceived = response;
    };

    await messageService.handleStartRecording({}, sendResponse);
    
    expect(responseReceived).toEqual({ 
      success: false, 
      error: 'Storage error' 
    });
  });
});