/**
 * React hook for message communication
 * Provides easy integration with the message service
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import messageService from '../utils/messageService.js';

/**
 * Hook for sending and receiving messages
 */
export const useMessage = () => {
  const handlersRef = useRef(new Map());

  // Send a message
  const sendMessage = useCallback((type, data, callback) => {
    return messageService.sendMessage(type, data, callback);
  }, []);

  // Add message handler
  const addMessageHandler = useCallback((messageType, handler) => {
    messageService.addMessageHandler(messageType, handler);
    
    // Store reference for cleanup
    if (!handlersRef.current.has(messageType)) {
      handlersRef.current.set(messageType, []);
    }
    handlersRef.current.get(messageType).push(handler);
  }, []);

  // Remove message handler  
  const removeMessageHandler = useCallback((messageType, handler) => {
    messageService.removeMessageHandler(messageType, handler);
    
    // Remove from our reference
    if (handlersRef.current.has(messageType)) {
      const handlers = handlersRef.current.get(messageType);
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove all handlers added by this hook instance
      handlersRef.current.forEach((handlers, messageType) => {
        handlers.forEach(handler => {
          messageService.removeMessageHandler(messageType, handler);
        });
      });
      handlersRef.current.clear();
    };
  }, []);

  return {
    sendMessage,
    addMessageHandler,
    removeMessageHandler
  };
};

/**
 * Hook for listening to specific message types
 */
export const useMessageListener = (messageType, handler, dependencies = []) => {
  const { addMessageHandler, removeMessageHandler } = useMessage();

  useEffect(() => {
    if (messageType && handler) {
      addMessageHandler(messageType, handler);
      
      return () => {
        removeMessageHandler(messageType, handler);
      };
    }
  }, [messageType, addMessageHandler, removeMessageHandler, ...dependencies]);
};

/**
 * Hook for recording state management via messages
 */
export const useRecordingState = () => {
  const { sendMessage } = useMessage();

  const startRecording = useCallback(() => {
    return new Promise((resolve) => {
      sendMessage('start-recording-tab', {}, (response) => {
        resolve(response);
      });
    });
  }, [sendMessage]);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      sendMessage('stop-recording-tab', {}, (response) => {
        resolve(response);
      });
    });
  }, [sendMessage]);

  const pauseRecording = useCallback(() => {
    return new Promise((resolve) => {
      sendMessage('pause-recording-tab', {}, (response) => {
        resolve(response);
      });
    });
  }, [sendMessage]);

  const resumeRecording = useCallback(() => {
    return new Promise((resolve) => {
      sendMessage('resume-recording-tab', {}, (response) => {
        resolve(response);
      });
    });
  }, [sendMessage]);

  const checkRecordingState = useCallback(() => {
    return new Promise((resolve) => {
      sendMessage('recording-check', {}, (response) => {
        resolve(response);
      });
    });
  }, [sendMessage]);

  return {
    startRecording,
    stopRecording,  
    pauseRecording,
    resumeRecording,
    checkRecordingState
  };
};

/**
 * Hook for desktop capture via messages
 */
export const useDesktopCapture = () => {
  const { sendMessage } = useMessage();

  const captureScreen = useCallback((options = {}) => {
    return new Promise((resolve) => {
      sendMessage('desktop-capture', {
        width: options.width || 1920,
        height: options.height || 1080,
        frameRate: options.frameRate || 30,
        audio: options.audio || false
      }, (response) => {
        resolve(response);
      });
    });
  }, [sendMessage]);

  return { captureScreen };
};

/**
 * Hook for state synchronization across components
 */
export const useStateSync = (key, initialValue) => {
  const [value, setValue] = useState(initialValue);
  const { sendMessage } = useMessage();

  // Listen for state changes
  useMessageListener('state-change', (data) => {
    if (data.key === key) {
      setValue(data.value);
    }
  }, [key]);

  // Broadcast state changes
  const updateValue = useCallback((newValue) => {
    setValue(newValue);
    sendMessage('state-change', { key, value: newValue });
  }, [key, sendMessage]);

  return [value, updateValue];
};