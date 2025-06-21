/**
 * Chrome API compatibility layer for web application
 * Provides chrome.* API equivalents using web standards
 */

import { local as webStorage } from './storage.js';

// Storage API compatibility
const storage = {
  local: webStorage
};

// Initialize BroadcastChannel for cross-component communication
let broadcastChannel;
if (typeof BroadcastChannel !== 'undefined') {
  broadcastChannel = new BroadcastChannel('camcordity-messages');
}

// Runtime API compatibility  
const runtime = {
  // Message passing using BroadcastChannel and custom events
  sendMessage: (message, callback) => {
    // Add unique ID for response matching
    const messageId = Date.now() + Math.random();
    const messageWithId = { ...message, _messageId: messageId };
    
    if (callback) {
      // Set up a one-time listener for the response
      const responseHandler = (event) => {
        const data = event.data || event.detail;
        if (data && data._responseId === messageId) {
          if (broadcastChannel) {
            broadcastChannel.removeEventListener('message', responseHandler);
          } else {
            window.removeEventListener('camcordity-response', responseHandler);
          }
          callback(data.response);
        }
      };
      
      if (broadcastChannel) {
        broadcastChannel.addEventListener('message', responseHandler);  
      } else {
        window.addEventListener('camcordity-response', responseHandler);
      }
    }
    
    // Send via BroadcastChannel if available, fallback to custom events
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'runtime-message',
        message: messageWithId,
        sender: 'runtime'
      });
    } else {
      const event = new CustomEvent('camcordity-message', {
        detail: { 
          type: 'runtime-message',
          message: messageWithId, 
          sender: 'runtime' 
        }
      });
      window.dispatchEvent(event);
    }
  },

  onMessage: {
    addListener: (callback) => {
      const handler = (event) => {
        const data = event.data || event.detail;
        if (data && data.type === 'runtime-message' && data.sender !== 'runtime') {
          const sendResponse = (response) => {
            const responseMessage = {
              type: 'runtime-response',
              response,
              _responseId: data.message._messageId
            };
            
            if (broadcastChannel) {
              broadcastChannel.postMessage(responseMessage);
            } else {
              const responseEvent = new CustomEvent('camcordity-response', {
                detail: responseMessage
              });
              window.dispatchEvent(responseEvent);
            }
          };
          
          callback(data.message, data.sender, sendResponse);
        }
      };
      
      // Add both BroadcastChannel and custom event listeners
      if (broadcastChannel) {
        broadcastChannel.addEventListener('message', handler);
      }
      window.addEventListener('camcordity-message', handler);
      
      // Store handler for removal
      if (!window._camcordityMessageHandlers) {
        window._camcordityMessageHandlers = [];
      }
      window._camcordityMessageHandlers.push({ callback, handler });
    },

    removeListener: (callback) => {
      if (window._camcordityMessageHandlers) {
        const index = window._camcordityMessageHandlers.findIndex(h => h.callback === callback);
        if (index >= 0) {
          const handler = window._camcordityMessageHandlers[index].handler;
          if (broadcastChannel) {
            broadcastChannel.removeEventListener('message', handler);
          }
          window.removeEventListener('camcordity-message', handler);
          window._camcordityMessageHandlers.splice(index, 1);
        }
      }
    },

    hasListener: (callback) => {
      return window._camcordityMessageHandlers ? 
        window._camcordityMessageHandlers.some(h => h.callback === callback) : false;
    }
  },

  getURL: (path) => {
    // In web app, assets are served from the same origin
    return new URL(path, window.location.origin).href;
  },

  getManifest: () => {
    // Return a mock manifest for compatibility
    return {
      version: '3.0.0',
      name: 'Camcordity',
      description: 'Free and privacy-friendly screen recorder'
    };
  },

  reload: () => {
    window.location.reload();
  },

  lastError: null
};

// Tabs API compatibility (limited functionality for web app)
const tabs = {
  query: async (queryInfo) => {
    // In a web app, we only have access to current tab
    return [{
      id: 1,
      url: window.location.href,
      active: true,
      windowId: 1
    }];
  },

  get: async (tabId, callback) => {
    const tab = {
      id: tabId,
      url: window.location.href,
      active: true,
      windowId: 1
    };
    if (callback) callback(tab);
    return tab;
  },

  create: ({ url, active = true }) => {
    if (active) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  },

  update: (tabId, updateProperties) => {
    if (updateProperties.url) {
      window.location.href = updateProperties.url;
    }
    if (updateProperties.active) {
      window.focus();
    }
  },

  remove: (tabId) => {
    window.close();
  },

  sendMessage: (tabId, message, callback) => {
    // Same as runtime.sendMessage for web app
    runtime.sendMessage(message, callback);
  },

  onActivated: {
    addListener: () => {}, // No-op in web app
    removeListener: () => {}
  },

  onUpdated: {
    addListener: () => {}, // No-op in web app  
    removeListener: () => {}
  },

  onRemoved: {
    addListener: () => {}, // No-op in web app
    removeListener: () => {}
  }
};

// Permissions API compatibility
const permissions = {
  query: async (permissions) => {
    // Check web API permissions
    const results = await Promise.all(
      permissions.permissions.map(async (permission) => {
        try {
          if (permission === 'camera') {
            const result = await navigator.permissions.query({ name: 'camera' });
            return result.state === 'granted';
          }
          if (permission === 'microphone') {
            const result = await navigator.permissions.query({ name: 'microphone' });
            return result.state === 'granted';
          }
          if (permission === 'desktopCapture') {
            // getDisplayMedia doesn't have a permission API, assume granted
            return true;
          }
          return false;
        } catch {
          return false;
        }
      })
    );
    
    return results.every(Boolean);
  },

  contains: async (permissions, callback) => {
    const result = await this.query(permissions);
    if (callback) callback(result);
    return result;
  },

  request: async (permissions, callback) => {
    // Request permissions through getUserMedia for camera/microphone
    try {
      if (permissions.permissions.includes('camera') || permissions.permissions.includes('microphone')) {
        const constraints = {};
        if (permissions.permissions.includes('camera')) constraints.video = true;
        if (permissions.permissions.includes('microphone')) constraints.audio = true;
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking permission
        
        if (callback) callback(true);
        return true;
      }
      
      if (callback) callback(true);
      return true;
    } catch {
      if (callback) callback(false);
      return false;
    }
  }
};

// Internationalization API compatibility
const i18n = {
  getMessage: (messageName, substitutions) => {
    // For now, return the message name as fallback
    // In a full implementation, you'd load translation files
    const messages = {
      extName: 'Camcordity',
      extDesc: 'Free and privacy-friendly screen recorder',
      recorderSelectTitle: 'Select what to record',
      recorderSelectDescription: 'Choose your screen, window, or tab to start recording',
      // Add more translations as needed
    };
    
    let message = messages[messageName] || messageName;
    
    if (substitutions && Array.isArray(substitutions)) {
      substitutions.forEach((sub, index) => {
        message = message.replace(`$${index + 1}`, sub);
      });
    }
    
    return message;
  },

  getUILanguage: () => {
    return navigator.language || 'en';
  }
};

// Action API compatibility (for extension button)
const action = {
  setIcon: ({ path }) => {
    // Update favicon or page title to indicate recording state
    const link = document.querySelector('link[rel="icon"]') || document.createElement('link');
    link.rel = 'icon';
    link.href = runtime.getURL(path);
    document.head.appendChild(link);
  },

  onClicked: {
    addListener: (callback) => {
      // Could bind to a UI button click in the web app
      document.addEventListener('camcordity-action-click', callback);
    },

    removeListener: (callback) => {
      document.removeEventListener('camcordity-action-click', callback);
    }
  }
};

// Commands API compatibility (keyboard shortcuts)
const commands = {
  onCommand: {
    addListener: (callback) => {
      const handler = (event) => {
        // Map keyboard shortcuts to command names
        const keyCombo = `${event.ctrlKey ? 'Ctrl+' : ''}${event.altKey ? 'Alt+' : ''}${event.shiftKey ? 'Shift+' : ''}${event.key}`;
        
        const commandMap = {
          'Alt+Shift+G': 'start-recording',
          'Alt+Shift+X': 'cancel-recording',
          'Alt+Shift+M': 'pause-recording'
        };
        
        const command = commandMap[keyCombo];
        if (command) {
          event.preventDefault();
          callback(command);
        }
      };
      
      document.addEventListener('keydown', handler);
      
      if (!window._camcordityCommandHandlers) {
        window._camcordityCommandHandlers = [];
      }
      window._camcordityCommandHandlers.push({ callback, handler });
    },

    removeListener: (callback) => {
      if (window._camcordityCommandHandlers) {
        const index = window._camcordityCommandHandlers.findIndex(h => h.callback === callback);
        if (index >= 0) {
          document.removeEventListener('keydown', window._camcordityCommandHandlers[index].handler);
          window._camcordityCommandHandlers.splice(index, 1);
        }
      }
    }
  },

  getAll: async () => {
    return [
      { name: 'start-recording', shortcut: 'Alt+Shift+G', description: 'Start recording' },
      { name: 'cancel-recording', shortcut: 'Alt+Shift+X', description: 'Cancel recording' },
      { name: 'pause-recording', shortcut: 'Alt+Shift+M', description: 'Pause/Resume recording' }
    ];
  }
};

// Desktop capture using getDisplayMedia
const desktopCapture = {
  chooseDesktopMedia: async (sources, targetTab, callback) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Generate a fake stream ID for compatibility
      const streamId = 'web-display-media-' + Date.now();
      
      // Store the stream for later retrieval
      if (!window._camcordityStreams) {
        window._camcordityStreams = {};
      }
      window._camcordityStreams[streamId] = stream;
      
      if (callback) {
        callback(streamId, { canRequestAudioTrack: true });
      }
      
      return streamId;
    } catch (error) {
      console.error('Desktop capture failed:', error);
      if (callback) {
        callback(null);
      }
      return null;
    }
  }
};

// Windows API compatibility
const windows = {
  update: (windowId, updateInfo, callback) => {
    if (updateInfo.focused) {
      window.focus();
    }
    if (callback) callback();
  },

  onFocusChanged: {
    addListener: (callback) => {
      window.addEventListener('focus', () => callback(1));
      window.addEventListener('blur', () => callback(-1));
    },
    removeListener: () => {}
  }
};

// Create the chrome compatibility object
const chrome = {
  storage,
  runtime,
  tabs,
  permissions,
  i18n,
  action,
  commands,
  desktopCapture,
  windows
};

// For environments that expect a global chrome object
if (typeof window !== 'undefined' && !window.chrome) {
  window.chrome = chrome;
}

export default chrome;
export { storage, runtime, tabs, permissions, i18n, action, commands, desktopCapture, windows };