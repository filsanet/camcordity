/**
 * End-to-end integration tests for recording workflow
 * Tests the complete user flow from navigation to recording completion
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App.jsx';
import messageService from '../../utils/messageService.js';

// Mock storage
jest.mock('../../utils/storage.js', () => ({
  local: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

describe('Recording Workflow Integration Tests', () => {
  let mockGetDisplayMedia;
  let mockGetUserMedia;
  let mockMediaRecorder;

  beforeEach(() => {
    // Reset message service state
    messageService.messageHandlers.clear();
    messageService.responseHandlers.clear();

    // Mock media APIs
    mockGetDisplayMedia = jest.fn();
    mockGetUserMedia = jest.fn();
    
    global.navigator.mediaDevices = {
      getDisplayMedia: mockGetDisplayMedia,
      getUserMedia: mockGetUserMedia
    };

    // Mock MediaRecorder
    mockMediaRecorder = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      addEventListener: jest.fn(),
      ondataavailable: null,
      onstop: null,
      onerror: null,
      state: 'inactive'
    };
    global.MediaRecorder = jest.fn(() => mockMediaRecorder);
    global.MediaRecorder.isTypeSupported = jest.fn(() => true);

    // Mock AudioContext
    global.AudioContext = jest.fn(() => ({
      createMediaStreamSource: jest.fn(() => ({
        connect: jest.fn()
      })),
      createMediaStreamDestination: jest.fn(() => ({
        stream: {
          getAudioTracks: jest.fn(() => [])
        }
      }))
    }));

    // Mock URL
    global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock storage
    const { local: storage } = require('../../utils/storage.js');
    storage.get.mockResolvedValue({
      recordingType: 'screen',
      qualityValue: '1080p',
      fpsValue: '30',
      micActive: true,
      recording: false
    });
    storage.set.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Complete screen recording workflow', async () => {
    // Mock successful media stream
    const mockStream = {
      getTracks: jest.fn(() => [
        { stop: jest.fn() },
        { stop: jest.fn() }
      ]),
      getAudioTracks: jest.fn(() => [{ id: 'audio1' }]),
      getVideoTracks: jest.fn(() => [{ id: 'video1' }]),
      addTrack: jest.fn(),
      removeTrack: jest.fn()
    };
    
    mockGetDisplayMedia.mockResolvedValue(mockStream);
    mockGetUserMedia.mockResolvedValue(mockStream);

    // Render the full app
    render(<App />);

    // 1. Start from home page
    expect(screen.getByText('Free Screen Recording')).toBeInTheDocument();
    expect(screen.getByText('Screen')).toBeInTheDocument();

    // 2. Select screen recording option
    const screenOption = screen.getByText('Screen');
    fireEvent.click(screenOption);

    // 3. Click start recording button
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);

    // 4. Should navigate to recording page
    await waitFor(() => {
      expect(window.location.pathname).toBe('/record');
    });

    // 5. Should be on record page with correct settings
    await waitFor(() => {
      expect(screen.getByText('Screen Recording')).toBeInTheDocument();
      expect(screen.getByText(/Quality: 1080p @ 30fps/)).toBeInTheDocument();
    });

    // 6. Start recording process
    const recordButton = screen.getByText('Start Recording');
    
    await act(async () => {
      fireEvent.click(recordButton);
    });

    // 7. Verify media permissions were requested
    await waitFor(() => {
      expect(mockGetDisplayMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
          cursor: 'always'
        },
        audio: true
      });
    });

    // 8. Verify MediaRecorder was created and started
    await waitFor(() => {
      expect(global.MediaRecorder).toHaveBeenCalledWith(
        mockStream,
        expect.objectContaining({
          mimeType: expect.stringContaining('video/webm')
        })
      );
      expect(mockMediaRecorder.start).toHaveBeenCalledWith(1000);
    });

    // 9. Should show recording controls
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
      expect(screen.getByText('Stop Recording')).toBeInTheDocument();
    });

    // 10. Test pause functionality
    const pauseButton = screen.getByText('Pause');
    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(mockMediaRecorder.pause).toHaveBeenCalled();
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    // 11. Test resume functionality
    const resumeButton = screen.getByText('Resume');
    fireEvent.click(resumeButton);

    await waitFor(() => {
      expect(mockMediaRecorder.resume).toHaveBeenCalled();
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    // 12. Stop recording
    const stopButton = screen.getByText('Stop Recording');
    fireEvent.click(stopButton);

    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    // 13. Simulate recording completion
    await act(async () => {
      // Trigger onstop callback
      if (mockMediaRecorder.onstop) {
        mockMediaRecorder.onstop();
      }
    });

    // 14. Should navigate back to home
    await waitFor(() => {
      expect(window.location.pathname).toBe('/');
    });
  });

  test('Camera recording workflow', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [{ id: 'video1' }])
    };
    
    mockGetUserMedia.mockResolvedValue(mockStream);

    render(<App />);

    // 1. Select camera recording
    const cameraOption = screen.getByText('Camera');
    fireEvent.click(cameraOption);

    // 2. Start recording
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);

    // 3. Navigate to record page
    await waitFor(() => {
      expect(window.location.pathname).toBe('/record');
    });

    // 4. Should show camera recording interface
    await waitFor(() => {
      expect(screen.getByText('Camera Recording')).toBeInTheDocument();
    });

    // 5. Start camera recording
    const recordButton = screen.getByText('Start Recording');
    
    await act(async () => {
      fireEvent.click(recordButton);
    });

    // 6. Verify camera access was requested
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });
    });
  });

  test('Error handling workflow', async () => {
    // Mock permission denied error
    mockGetDisplayMedia.mockRejectedValue(new Error('Permission denied'));

    render(<App />);

    // Navigate to recording
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/record');
    });

    // Try to start recording
    const recordButton = screen.getByText('Start Recording');
    
    await act(async () => {
      fireEvent.click(recordButton);
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Permission denied')).toBeInTheDocument();
    });

    // Should still show start recording button
    expect(screen.getByText('Start Recording')).toBeInTheDocument();
  });

  test('Message service integration during recording', async () => {
    const mockStream = {
      getTracks: jest.fn(() => [{ stop: jest.fn() }]),
      getAudioTracks: jest.fn(() => []),
      getVideoTracks: jest.fn(() => [])
    };
    
    mockGetDisplayMedia.mockResolvedValue(mockStream);

    render(<App />);

    // Navigate to recording page
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/record');
    });

    // Start recording and verify message service calls
    const recordButton = screen.getByText('Start Recording');
    
    const { local: storage } = require('../../utils/storage.js');
    
    await act(async () => {
      fireEvent.click(recordButton);
    });

    // Verify storage was updated through message service
    await waitFor(() => {
      expect(storage.set).toHaveBeenCalledWith({ recording: true, paused: false });
    });
  });

  test('Cross-component state synchronization', async () => {
    render(<App />);

    // Simulate external state change via message service
    await act(async () => {
      messageService.sendMessage('state-change', { 
        key: 'recording', 
        value: true 
      });
    });

    // Home component should reflect the state change
    await waitFor(() => {
      expect(screen.getByText(/Recording/)).toBeInTheDocument();
    });
  });

  test('Settings persistence across navigation', async () => {
    const { local: storage } = require('../../utils/storage.js');
    
    render(<App />);

    // Change recording type
    const cameraOption = screen.getByText('Camera');
    fireEvent.click(cameraOption);

    // Navigate to recording
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);

    // Verify settings were saved
    await waitFor(() => {
      expect(storage.set).toHaveBeenCalledWith({ recordingType: 'camera' });
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/record');
    });

    // Should show camera recording interface
    await waitFor(() => {
      expect(screen.getByText('Camera Recording')).toBeInTheDocument();
    });
  });
});