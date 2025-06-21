/**
 * Central message service for cross-component communication
 * Replaces Chrome extension runtime messaging with web standards
 */

import { local as storage } from './storage.js';

class MessageService {
  constructor() {
    this.broadcastChannel = null;
    this.messageHandlers = new Map();
    this.responseHandlers = new Map();
    
    // Initialize BroadcastChannel if available
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('camcordity-messages');
      this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
    }
    
    // Fallback to custom events
    window.addEventListener('camcordity-message', this.handleCustomEvent.bind(this));
    
    // Initialize message handlers for common message types
    this.initializeHandlers();
  }

  /**
   * Send a message to all components
   */
  sendMessage(type, data = {}, callback = null) {
    const messageId = Date.now() + Math.random();
    const message = {
      type,
      data,
      _messageId: messageId,
      timestamp: Date.now()
    };

    if (callback) {
      this.responseHandlers.set(messageId, callback);
    }

    // Send via BroadcastChannel if available
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'camcordity-message',
        message
      });
    } else {
      // Fallback to custom events
      const event = new CustomEvent('camcordity-message', {
        detail: {
          type: 'camcordity-message',
          message
        }
      });
      window.dispatchEvent(event);
    }

    return messageId;
  }

  /**
   * Add a message handler for a specific message type
   */
  addMessageHandler(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType).push(handler);
  }

  /**
   * Remove a message handler
   */
  removeMessageHandler(messageType, handler) {
    if (this.messageHandlers.has(messageType)) {
      const handlers = this.messageHandlers.get(messageType);
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle BroadcastChannel messages
   */
  handleBroadcastMessage(event) {
    this.processMessage(event.data);
  }

  /**
   * Handle custom event messages (fallback)
   */
  handleCustomEvent(event) {
    this.processMessage(event.detail);
  }

  /**
   * Process incoming messages
   */
  processMessage(data) {
    if (!data || data.type !== 'camcordity-message') return;

    const { message } = data;
    if (!message) return;

    // Handle responses
    if (message.type === '_response') {
      const responseHandler = this.responseHandlers.get(message._responseId);
      if (responseHandler) {
        responseHandler(message.data);
        this.responseHandlers.delete(message._responseId);
      }
      return;
    }

    // Handle regular messages
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      const sendResponse = (responseData) => {
        this.sendMessage('_response', responseData, null);
      };

      handlers.forEach(handler => {
        try {
          handler(message.data, sendResponse);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }

  /**
   * Initialize handlers for common Chrome extension message types
   */
  initializeHandlers() {
    // Recording lifecycle messages
    this.addMessageHandler('start-recording-tab', this.handleStartRecording.bind(this));
    this.addMessageHandler('stop-recording-tab', this.handleStopRecording.bind(this));
    this.addMessageHandler('pause-recording-tab', this.handlePauseRecording.bind(this));
    this.addMessageHandler('resume-recording-tab', this.handleResumeRecording.bind(this));
    
    // Desktop capture messages
    this.addMessageHandler('desktop-capture', this.handleDesktopCapture.bind(this));
    
    // State management messages
    this.addMessageHandler('recording-check', this.handleRecordingCheck.bind(this));
    this.addMessageHandler('toggle-popup', this.handleTogglePopup.bind(this));
    
    // Timer messages
    this.addMessageHandler('time', this.handleTimeUpdate.bind(this));
    
    // Chunk management messages
    this.addMessageHandler('chunk-count', this.handleChunkCount.bind(this));
    this.addMessageHandler('new-chunk-tab', this.handleNewChunk.bind(this));
    
    // Error handling messages
    this.addMessageHandler('stream-error', this.handleStreamError.bind(this));
    this.addMessageHandler('recording-error', this.handleRecordingError.bind(this));
    
    // Command messages (keyboard shortcuts)
    this.addMessageHandler('commands', this.handleCommands.bind(this));
  }

  /**
   * Recording lifecycle handlers
   */
  async handleStartRecording(data, sendResponse) {
    try {
      await storage.set({ recording: true, paused: false });
      this.broadcastStateChange('recording', true);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error starting recording:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleStopRecording(data, sendResponse) {
    try {
      await storage.set({ recording: false, paused: false });
      this.broadcastStateChange('recording', false);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error stopping recording:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handlePauseRecording(data, sendResponse) {
    try {
      await storage.set({ paused: true });
      this.broadcastStateChange('paused', true);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error pausing recording:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleResumeRecording(data, sendResponse) {
    try {
      await storage.set({ paused: false });
      this.broadcastStateChange('paused', false);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error resuming recording:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Desktop capture handler using getDisplayMedia
   */
  async handleDesktopCapture(data, sendResponse) {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: data.width || 1920 },
          height: { ideal: data.height || 1080 },
          frameRate: { ideal: data.frameRate || 30 }
        },
        audio: data.audio || false
      });

      // Store stream reference for later use
      if (!window._camcordityStreams) {
        window._camcordityStreams = {};
      }
      const streamId = 'stream-' + Date.now();
      window._camcordityStreams[streamId] = stream;

      sendResponse({ 
        success: true, 
        streamId,
        canRequestAudioTrack: stream.getAudioTracks().length > 0
      });
    } catch (error) {
      console.error('Desktop capture failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Recording state check handler
   */
  async handleRecordingCheck(data, sendResponse) {
    try {
      const state = await storage.get(['recording', 'paused']);
      sendResponse(state);
    } catch (error) {
      console.error('Error checking recording state:', error);
      sendResponse({ recording: false, paused: false });
    }
  }

  /**
   * Popup toggle handler
   */
  handleTogglePopup(data, sendResponse) {
    // Dispatch custom event for UI components to handle
    const event = new CustomEvent('camcordity-toggle-popup', {
      detail: data
    });
    window.dispatchEvent(event);
    sendResponse({ success: true });
  }

  /**
   * Time update handler
   */
  handleTimeUpdate(data, sendResponse) {
    // Broadcast time updates to all components
    this.broadcastStateChange('time', data.time);
    sendResponse({ success: true });
  }

  /**
   * Chunk management handlers
   */
  handleChunkCount(data, sendResponse) {
    this.broadcastStateChange('chunkCount', data.count);
    sendResponse({ success: true });
  }

  handleNewChunk(data, sendResponse) {
    // Handle new video chunk
    const event = new CustomEvent('camcordity-new-chunk', {
      detail: data
    });
    window.dispatchEvent(event);
    sendResponse({ success: true });
  }

  /**
   * Error handlers
   */
  handleStreamError(data, sendResponse) {
    console.error('Stream error:', data);
    this.broadcastStateChange('error', data);
    sendResponse({ success: true });
  }

  handleRecordingError(data, sendResponse) {
    console.error('Recording error:', data);
    this.broadcastStateChange('error', data);
    sendResponse({ success: true });
  }

  /**
   * Commands handler (keyboard shortcuts)
   */
  handleCommands(data, sendResponse) {
    const event = new CustomEvent('camcordity-command', {
      detail: data
    });
    window.dispatchEvent(event);
    sendResponse({ success: true });
  }

  /**
   * Broadcast state changes to all components
   */
  broadcastStateChange(key, value) {
    this.sendMessage('state-change', { key, value });
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    window.removeEventListener('camcordity-message', this.handleCustomEvent.bind(this));
    this.messageHandlers.clear();
    this.responseHandlers.clear();
  }
}

// Create and export singleton instance
const messageService = new MessageService();
export default messageService;