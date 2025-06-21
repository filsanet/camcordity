/**
 * Jest tests for Home component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home.jsx';
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

describe('Home Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default storage mock returns
    storage.get.mockImplementation((keys) => {
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (key === 'recording') result[key] = false;
          if (key === 'recordingType') result[key] = 'screen';
        });
        return Promise.resolve(result);
      }
      
      if (typeof keys === 'string') {
        const values = {
          recording: false,
          recordingType: 'screen'
        };
        return Promise.resolve({ [keys]: values[keys] || false });
      }
      
      return Promise.resolve({
        recording: false,
        recordingType: 'screen'
      });
    });
    
    storage.set.mockResolvedValue();
  });

  const renderHome = () => {
    return render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
  };

  describe('Initial Render', () => {
    test('should render home component with main elements', async () => {
      renderHome();
      
      // Check for main heading and description
      expect(screen.getByText('Free Screen Recording')).toBeInTheDocument();
      expect(screen.getByText('Record your screen, camera, or both with professional features')).toBeInTheDocument();
      
      // Check for logo
      expect(screen.getByAltText('Camcordity')).toBeInTheDocument();
      
      // Wait for component to load storage state
      await waitFor(() => {
        expect(screen.getByText('What would you like to record?')).toBeInTheDocument();
      });
    });

    test('should display recording options', async () => {
      renderHome();
      
      await waitFor(() => {
        expect(screen.getByText('Screen')).toBeInTheDocument();
        expect(screen.getByText('Camera')).toBeInTheDocument();
        expect(screen.getByText('Region')).toBeInTheDocument();
      });
      
      // Check descriptions
      expect(screen.getByText('Record your entire screen or a specific window')).toBeInTheDocument();
      expect(screen.getByText('Record from your webcam only')).toBeInTheDocument();
      expect(screen.getByText('Record a specific area of your screen')).toBeInTheDocument();
    });

    test('should display features section', async () => {
      renderHome();
      
      await waitFor(() => {
        expect(screen.getByText('Features')).toBeInTheDocument();
      });
      
      // Check feature items
      expect(screen.getByText('Annotations')).toBeInTheDocument();
      expect(screen.getByText('Camera Overlay')).toBeInTheDocument();
      expect(screen.getByText('Built-in Editor')).toBeInTheDocument();
      expect(screen.getByText('High-Quality Audio')).toBeInTheDocument();
    });
  });

  describe('Recording Type Selection', () => {
    test('should have screen recording selected by default', async () => {
      renderHome();
      
      await waitFor(() => {
        const screenOption = screen.getByText('Screen').closest('button');
        expect(screenOption).toHaveClass('active');
      });
    });

    test('should change recording type when option is clicked', async () => {
      renderHome();
      
      await waitFor(() => {
        // Click camera option
        const cameraOption = screen.getByText('Camera').closest('button');
        fireEvent.click(cameraOption);
        
        expect(cameraOption).toHaveClass('active');
      });
    });

    test('should show only one active option at a time', async () => {
      renderHome();
      
      await waitFor(() => {
        const screenOption = screen.getByText('Screen').closest('button');
        const cameraOption = screen.getByText('Camera').closest('button');
        const regionOption = screen.getByText('Region').closest('button');
        
        // Initially screen should be active
        expect(screenOption).toHaveClass('active');
        expect(cameraOption).not.toHaveClass('active');
        expect(regionOption).not.toHaveClass('active');
        
        // Click camera
        fireEvent.click(cameraOption);
        
        expect(screenOption).not.toHaveClass('active');
        expect(cameraOption).toHaveClass('active');
        expect(regionOption).not.toHaveClass('active');
      });
    });
  });

  describe('Recording Controls', () => {
    test('should show start recording button when not recording', async () => {
      renderHome();
      
      await waitFor(() => {
        expect(screen.getByText('Start Recording')).toBeInTheDocument();
      });
    });

    test('should navigate to record page when start recording is clicked', async () => {
      renderHome();
      
      await waitFor(() => {
        const startButton = screen.getByText('Start Recording');
        fireEvent.click(startButton);
      });
      
      // Should save recording type to storage
      expect(storage.set).toHaveBeenCalledWith({ recordingType: 'screen' });
      
      // Should navigate to record page
      expect(mockNavigate).toHaveBeenCalledWith('/record');
    });

    test('should save selected recording type before navigating', async () => {
      renderHome();
      
      await waitFor(() => {
        // Select camera
        const cameraOption = screen.getByText('Camera').closest('button');
        fireEvent.click(cameraOption);
        
        // Click start recording
        const startButton = screen.getByText('Start Recording');
        fireEvent.click(startButton);
      });
      
      expect(storage.set).toHaveBeenCalledWith({ recordingType: 'camera' });
      expect(mockNavigate).toHaveBeenCalledWith('/record');
    });
  });

  describe('Recording State', () => {
    test('should show recording active state when recording is true', async () => {
      // Mock recording state as true
      storage.get.mockImplementation((keys) => {
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => {
            if (key === 'recording') result[key] = true;
            if (key === 'recordingType') result[key] = 'screen';
          });
          return Promise.resolve(result);
        }
        
        if (typeof keys === 'string') {
          const values = {
            recording: true,
            recordingType: 'screen'
          };
          return Promise.resolve({ [keys]: values[keys] || false });
        }
        
        return Promise.resolve({
          recording: true,
          recordingType: 'screen'
        });
      });
      
      renderHome();
      
      await waitFor(() => {
        expect(screen.getByText('Recording in progress...')).toBeInTheDocument();
        expect(screen.getByText('Stop Recording')).toBeInTheDocument();
      });
    });

    test('should stop recording when stop button is clicked', async () => {
      // Mock recording state as true
      storage.get.mockImplementation(() => Promise.resolve({
        recording: true,
        recordingType: 'screen'
      }));
      
      renderHome();
      
      await waitFor(() => {
        const stopButton = screen.getByText('Stop Recording');
        fireEvent.click(stopButton);
      });
      
      expect(storage.set).toHaveBeenCalledWith({ recording: false });
    });

    test('should show recording indicator with pulsing dot', async () => {
      // Mock recording state as true
      storage.get.mockImplementation(() => Promise.resolve({
        recording: true,
        recordingType: 'screen'
      }));
      
      renderHome();
      
      await waitFor(() => {
        const recordingIndicator = screen.getByText('Recording in progress...');
        expect(recordingIndicator).toBeInTheDocument();
        
        // Check for recording dot (by class name)
        const recordingActive = screen.getByText('Recording in progress...').closest('.recording-active');
        expect(recordingActive).toBeInTheDocument();
      });
    });
  });

  describe('Storage Integration', () => {
    test('should load initial state from storage', async () => {
      storage.get.mockImplementation(() => Promise.resolve({
        recording: false,
        recordingType: 'camera'
      }));
      
      renderHome();
      
      await waitFor(() => {
        const cameraOption = screen.getByText('Camera').closest('button');
        expect(cameraOption).toHaveClass('active');
      });
    });

    test('should poll storage for recording state changes', async () => {
      jest.useFakeTimers();
      
      storage.get.mockImplementation(() => Promise.resolve({
        recording: false,
        recordingType: 'screen'
      }));
      
      renderHome();
      
      // Fast-forward time to trigger polling
      jest.advanceTimersByTime(1000);
      
      // Storage should be polled
      expect(storage.get).toHaveBeenCalledTimes(2); // Initial load + poll
      
      jest.useRealTimers();
    });

    test('should handle storage errors gracefully', async () => {
      storage.get.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw
      expect(() => renderHome()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    test('should have proper button roles and labels', async () => {
      renderHome();
      
      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /start recording/i });
        expect(startButton).toBeInTheDocument();
        
        const recordingOptions = screen.getAllByRole('button');
        const optionButtons = recordingOptions.filter(button => 
          button.textContent.includes('Screen') || 
          button.textContent.includes('Camera') || 
          button.textContent.includes('Region')
        );
        
        expect(optionButtons).toHaveLength(3);
      });
    });

    test('should have proper heading hierarchy', async () => {
      renderHome();
      
      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 });
        expect(mainHeading).toHaveTextContent('Free Screen Recording');
        
        const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
        expect(sectionHeadings.length).toBeGreaterThan(0);
      });
    });

    test('should have descriptive alt text for images', async () => {
      renderHome();
      
      await waitFor(() => {
        const logo = screen.getByAltText('Camcordity');
        expect(logo).toBeInTheDocument();
        
        // Feature icons should have descriptive alt text
        const featureIcons = screen.getAllByRole('img');
        featureIcons.forEach(icon => {
          expect(icon).toHaveAttribute('alt');
          expect(icon.getAttribute('alt')).toBeTruthy();
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle navigation errors gracefully', async () => {
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error');
      });
      
      renderHome();
      
      await waitFor(() => {
        const startButton = screen.getByText('Start Recording');
        
        // Should not throw when clicking start
        expect(() => fireEvent.click(startButton)).not.toThrow();
      });
    });

    test('should handle storage set errors gracefully', async () => {
      storage.set.mockRejectedValue(new Error('Storage error'));
      
      renderHome();
      
      await waitFor(() => {
        const startButton = screen.getByText('Start Recording');
        
        // Should not throw when storage fails
        expect(() => fireEvent.click(startButton)).not.toThrow();
      });
    });
  });
});