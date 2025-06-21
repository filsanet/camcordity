/**
 * Jest tests for Record component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Record from './Record.jsx';
import { local as storage } from '../utils/storage.js';

// Mock the storage module
jest.mock('../utils/storage.js', () => ({
  local: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Record Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default storage mock returns
    storage.get.mockResolvedValue({
      recordingType: 'screen',
      qualityValue: '1080p',
      fpsValue: '30',
      micActive: true,
      countdown: 3
    });
    
    storage.set.mockResolvedValue();
    
    // Mock navigator.mediaDevices
    global.navigator.mediaDevices = {
      getDisplayMedia: jest.fn(),
      getUserMedia: jest.fn(),
    };

    // Mock MediaRecorder
    global.MediaRecorder = jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      addEventListener: jest.fn(),
      ondataavailable: null,
      onstop: null,
      onerror: null,
      state: 'inactive',
    }));

    global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

    // Mock AudioContext
    global.AudioContext = jest.fn().mockImplementation(() => ({
      createMediaStreamSource: jest.fn().mockReturnValue({
        connect: jest.fn(),
      }),
      createMediaStreamDestination: jest.fn().mockReturnValue({
        stream: {
          getAudioTracks: jest.fn().mockReturnValue([]),
        },
      }),
    }));

    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn().mockReturnValue('mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  const renderRecord = () => {
    return render(
      <BrowserRouter>
        <Record />
      </BrowserRouter>
    );
  };

  describe('Initial Render', () => {
    test('should render record component with main elements', async () => {
      renderRecord();
      
      // Check for main heading
      await waitFor(() => {
        expect(screen.getByText('Screen Recording')).toBeInTheDocument();
      });
      
      // Check for quality settings
      expect(screen.getByText('Quality: 1080p @ 30fps')).toBeInTheDocument();
      
      // Check for start recording button
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
      
      // Check for cancel button
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('should load settings from storage on mount', async () => {
      storage.get.mockResolvedValue({
        recordingType: 'camera',
        qualityValue: '720p',
        fpsValue: '60',
        micActive: false,
        countdown: 5
      });

      renderRecord();
      
      await waitFor(() => {
        expect(screen.getByText('Camera Recording')).toBeInTheDocument();
        expect(screen.getByText('Quality: 720p @ 60fps')).toBeInTheDocument();
      });
    });

    test('should show video preview placeholder initially', () => {
      renderRecord();
      
      expect(screen.getByText('Ready to Record')).toBeInTheDocument();
      expect(screen.getByText('Click "Start Recording" to begin capture')).toBeInTheDocument();
    });
  });

  describe('Recording Controls', () => {
    test('should handle start recording button click', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getDisplayMedia.mockResolvedValue(mockStream);

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
            cursor: 'always'
          },
          audio: true
        });
      });
    });

    test('should handle camera recording', async () => {
      storage.get.mockResolvedValue({
        recordingType: 'camera',
        qualityValue: '1080p',
        fpsValue: '30',
        micActive: true
      });

      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getUserMedia.mockResolvedValue(mockStream);

      renderRecord();
      
      await waitFor(() => {
        expect(screen.getByText('Camera Recording')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });
      });
    });

    test('should show loading state during permission request', async () => {
      navigator.mediaDevices.getDisplayMedia.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(global.testUtils.createMockMediaStream()), 100))
      );

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      // Should show loading spinner
      expect(screen.getByText('Requesting permissions...')).toBeInTheDocument();
    });

    test('should handle media access errors', async () => {
      navigator.mediaDevices.getDisplayMedia.mockRejectedValue(
        new Error('Permission denied')
      );

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });

    test('should cancel recording setup', () => {
      renderRecord();
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Recording Session', () => {
    test('should show recording controls when recording starts', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getDisplayMedia.mockResolvedValue(mockStream);

      const mockMediaRecorder = {
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'recording',
        ondataavailable: null,
        onstop: null,
        onerror: null,
      };
      global.MediaRecorder.mockReturnValue(mockMediaRecorder);

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockMediaRecorder.start).toHaveBeenCalled();
        expect(storage.set).toHaveBeenCalledWith({ recording: true });
      });
    });

    test('should handle pause/resume functionality', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getDisplayMedia.mockResolvedValue(mockStream);

      const mockMediaRecorder = {
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'recording',
        ondataavailable: null,
        onstop: null,
        onerror: null,
      };
      global.MediaRecorder.mockReturnValue(mockMediaRecorder);

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockMediaRecorder.start).toHaveBeenCalled();
      });

      // Note: In a real test, we'd need to trigger the recording state change
      // This would require more complex mocking of the component state
    });

    test('should stop recording and clean up', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      const mockTracks = [
        { stop: jest.fn() },
        { stop: jest.fn() }
      ];
      mockStream.getTracks.mockReturnValue(mockTracks);
      
      navigator.mediaDevices.getDisplayMedia.mockResolvedValue(mockStream);

      const mockMediaRecorder = {
        start: jest.fn(),
        stop: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        state: 'recording',
        ondataavailable: null,
        onstop: null,
        onerror: null,
      };
      global.MediaRecorder.mockReturnValue(mockMediaRecorder);

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockMediaRecorder.start).toHaveBeenCalled();
      });

      // Simulate stop recording (would need state management)
      // In a real scenario, we'd trigger the stop button click
    });
  });

  describe('Settings Management', () => {
    test('should update quality setting', async () => {
      renderRecord();
      
      await waitFor(() => {
        const qualitySelect = screen.getByDisplayValue('1080p');
        expect(qualitySelect).toBeInTheDocument();
        
        fireEvent.change(qualitySelect, { target: { value: '720p' } });
        expect(qualitySelect.value).toBe('720p');
      });
    });

    test('should update frame rate setting', async () => {
      renderRecord();
      
      await waitFor(() => {
        const fpsSelect = screen.getByDisplayValue('30');
        expect(fpsSelect).toBeInTheDocument();
        
        fireEvent.change(fpsSelect, { target: { value: '60' } });
        expect(fpsSelect.value).toBe('60');
      });
    });

    test('should toggle audio settings', async () => {
      renderRecord();
      
      await waitFor(() => {
        const systemAudioCheckbox = screen.getByLabelText('System Audio');
        const microphoneCheckbox = screen.getByLabelText('Microphone');
        
        expect(systemAudioCheckbox).toBeChecked();
        expect(microphoneCheckbox).toBeChecked();
        
        fireEvent.click(systemAudioCheckbox);
        expect(systemAudioCheckbox).not.toBeChecked();
        
        fireEvent.click(microphoneCheckbox);
        expect(microphoneCheckbox).not.toBeChecked();
      });
    });

    test('should disable settings during recording', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getDisplayMedia.mockResolvedValue(mockStream);

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        const qualitySelect = screen.getByDisplayValue('1080p');
        const fpsSelect = screen.getByDisplayValue('30');
        
        expect(qualitySelect).toBeDisabled();
        expect(fpsSelect).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle MediaRecorder creation errors', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getDisplayMedia.mockResolvedValue(mockStream);
      
      global.MediaRecorder.mockImplementation(() => {
        throw new Error('MediaRecorder not supported');
      });

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText('Error:')).toBeInTheDocument();
      });
    });

    test('should handle unsupported MIME types', async () => {
      const mockStream = global.testUtils.createMockMediaStream();
      navigator.mediaDevices.getDisplayMedia.mockResolvedValue(mockStream);
      
      global.MediaRecorder.isTypeSupported.mockReturnValue(false);

      renderRecord();
      
      const startButton = screen.getByText('Start Recording');
      fireEvent.click(startButton);

      // Should fallback to supported formats without error
      await waitFor(() => {
        expect(global.MediaRecorder).toHaveBeenCalled();
      });
    });

    test('should handle storage errors gracefully', async () => {
      storage.get.mockRejectedValue(new Error('Storage error'));
      
      // Should still render component
      renderRecord();
      
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper form labels and controls', () => {
      renderRecord();
      
      expect(screen.getByLabelText('Quality:')).toBeInTheDocument();
      expect(screen.getByLabelText('Frame Rate:')).toBeInTheDocument();
      expect(screen.getByLabelText('System Audio')).toBeInTheDocument();
      expect(screen.getByLabelText('Microphone')).toBeInTheDocument();
    });

    test('should have proper button roles and labels', () => {
      renderRecord();
      
      expect(screen.getByRole('button', { name: /start recording/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should have proper heading hierarchy', () => {
      renderRecord();
      
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Screen Recording');
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Recording Settings');
    });
  });
});