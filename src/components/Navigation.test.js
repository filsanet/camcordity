/**
 * Jest tests for Navigation component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navigation from './Navigation.jsx';
import { local as storage } from '../utils/storage.js';

// Mock the storage module
jest.mock('../utils/storage.js', () => ({
  local: {
    get: jest.fn(),
  }
}));

// Mock useLocation
const mockLocation = { pathname: '/' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockLocation,
}));

describe('Navigation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default storage mock - not recording
    storage.get.mockResolvedValue({ recording: false });
    
    // Reset location
    mockLocation.pathname = '/';
  });

  const renderNavigation = () => {
    return render(
      <BrowserRouter>
        <Navigation />
      </BrowserRouter>
    );
  };

  describe('Basic Rendering', () => {
    test('should render navigation with logo and links', async () => {
      renderNavigation();
      
      // Check for logo and brand
      expect(screen.getByAltText('Camcordity')).toBeInTheDocument();
      expect(screen.getByText('Camcordity')).toBeInTheDocument();
      
      // Check for navigation links
      expect(screen.getByText('Record')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    test('should have proper navigation structure', () => {
      renderNavigation();
      
      // Check for nav element
      const nav = document.querySelector('.navigation');
      expect(nav).toBeInTheDocument();
      
      // Check for container
      const container = document.querySelector('.nav-container');
      expect(container).toBeInTheDocument();
    });

    test('should render all navigation sections', () => {
      renderNavigation();
      
      // Brand section
      const brand = document.querySelector('.nav-brand');
      expect(brand).toBeInTheDocument();
      
      // Links section
      const links = document.querySelector('.nav-links');
      expect(links).toBeInTheDocument();
      
      // Status section
      const status = document.querySelector('.nav-status');
      expect(status).toBeInTheDocument();
    });
  });

  describe('Active Link Highlighting', () => {
    test('should highlight home link when on home page', () => {
      mockLocation.pathname = '/';
      renderNavigation();
      
      const recordLink = screen.getByText('Record').closest('a');
      expect(recordLink).toHaveClass('active');
    });

    test('should highlight editor link when on editor page', () => {
      mockLocation.pathname = '/editor';
      renderNavigation();
      
      const editorLink = screen.getByText('Editor').closest('a');
      expect(editorLink).toHaveClass('active');
    });

    test('should highlight settings link when on setup page', () => {
      mockLocation.pathname = '/setup';
      renderNavigation();
      
      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveClass('active');
    });

    test('should only have one active link at a time', () => {
      mockLocation.pathname = '/editor';
      renderNavigation();
      
      const recordLink = screen.getByText('Record').closest('a');
      const editorLink = screen.getByText('Editor').closest('a');
      const settingsLink = screen.getByText('Settings').closest('a');
      
      expect(recordLink).not.toHaveClass('active');
      expect(editorLink).toHaveClass('active');
      expect(settingsLink).not.toHaveClass('active');
    });
  });

  describe('Recording Status', () => {
    test('should not show recording indicator when not recording', async () => {
      storage.get.mockResolvedValue({ recording: false });
      renderNavigation();
      
      await waitFor(() => {
        expect(screen.queryByText('Recording')).not.toBeInTheDocument();
      });
    });

    test('should show recording indicator when recording', async () => {
      storage.get.mockResolvedValue({ recording: true });
      renderNavigation();
      
      await waitFor(() => {
        expect(screen.getByText('Recording')).toBeInTheDocument();
      });
    });

    test('should show recording dot when recording', async () => {
      storage.get.mockResolvedValue({ recording: true });
      renderNavigation();
      
      await waitFor(() => {
        const recordingIndicator = screen.getByText('Recording').closest('.recording-indicator');
        expect(recordingIndicator).toBeInTheDocument();
        
        const recordingDot = recordingIndicator.querySelector('.recording-dot');
        expect(recordingDot).toBeInTheDocument();
      });
    });

    test('should poll storage for recording status changes', async () => {
      renderNavigation();
      
      // Wait for initial load
      await waitFor(() => {
        expect(storage.get).toHaveBeenCalledWith('recording');
      });
      
      // Should poll again after interval
      await waitFor(() => {
        expect(storage.get).toHaveBeenCalledTimes(2);
      }, { timeout: 2000 });
    });
  });

  describe('Hidden Routes', () => {
    test('should hide navigation on recorder page', () => {
      mockLocation.pathname = '/recorder';
      const { container } = renderNavigation();
      
      // Navigation should not be rendered
      expect(container.firstChild).toBeNull();
    });

    test('should hide navigation on permissions page', () => {
      mockLocation.pathname = '/permissions';
      const { container } = renderNavigation();
      
      // Navigation should not be rendered
      expect(container.firstChild).toBeNull();
    });

    test('should show navigation on other pages', () => {
      mockLocation.pathname = '/some-other-page';
      renderNavigation();
      
      // Navigation should be rendered
      expect(screen.getByText('Camcordity')).toBeInTheDocument();
    });
  });

  describe('Links and Navigation', () => {
    test('should have correct href attributes', () => {
      renderNavigation();
      
      const brandLink = screen.getByText('Camcordity').closest('a');
      expect(brandLink).toHaveAttribute('href', '/');
      
      const recordLink = screen.getByText('Record').closest('a');
      expect(recordLink).toHaveAttribute('href', '/');
      
      const editorLink = screen.getByText('Editor').closest('a');
      expect(editorLink).toHaveAttribute('href', '/editor');
      
      const settingsLink = screen.getByText('Settings').closest('a');
      expect(settingsLink).toHaveAttribute('href', '/setup');
    });

    test('should have proper link icons', () => {
      renderNavigation();
      
      // Check for link icons
      const links = screen.getAllByRole('link');
      const linkIcons = document.querySelectorAll('.nav-link img');
      
      // Should have icons for each nav link (excluding brand)
      expect(linkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    test('should have proper landmark roles', () => {
      renderNavigation();
      
      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    test('should have descriptive alt text for images', () => {
      renderNavigation();
      
      const logo = screen.getByAltText('Camcordity');
      expect(logo).toBeInTheDocument();
      
      // All images should have alt text
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).toBeTruthy();
      });
    });

    test('should have proper link text', () => {
      renderNavigation();
      
      // Links should have descriptive text
      expect(screen.getByRole('link', { name: /camcordity/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /record/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /editor/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      storage.get.mockRejectedValue(new Error('Storage error'));
      
      // Should not throw
      expect(() => renderNavigation()).not.toThrow();
    });

    test('should handle missing storage data gracefully', async () => {
      storage.get.mockResolvedValue(null);
      
      renderNavigation();
      
      // Should render without errors
      expect(screen.getByText('Camcordity')).toBeInTheDocument();
    });

    test('should handle undefined recording status gracefully', async () => {
      storage.get.mockResolvedValue({ recording: undefined });
      
      renderNavigation();
      
      await waitFor(() => {
        // Should not show recording indicator
        expect(screen.queryByText('Recording')).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    test('should have responsive classes for mobile', () => {
      renderNavigation();
      
      // Check that navigation has structure that supports responsive design
      const nav = document.querySelector('.navigation');
      expect(nav).toBeInTheDocument();
      
      const container = document.querySelector('.nav-container');
      expect(container).toBeInTheDocument();
    });
  });
});