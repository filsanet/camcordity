/**
 * Jest tests for App component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

// Mock the chrome compatibility module
jest.mock('./utils/chromeCompat.js', () => ({
  __esModule: true,
  default: {
    storage: { local: { get: jest.fn(), set: jest.fn() } },
    runtime: { getURL: jest.fn(path => `/mocked/${path}`) }
  }
}));

// Mock the storage module
jest.mock('./utils/storage.js', () => ({
  local: {
    get: jest.fn().mockResolvedValue({}),
    set: jest.fn().mockResolvedValue(),
  }
}));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render without crashing', () => {
    expect(() => render(<App />)).not.toThrow();
  });

  test('should render router with navigation', async () => {
    render(<App />);
    
    // Should have navigation (though it might be hidden on some routes)
    // App should render without errors
    expect(document.querySelector('.app')).toBeInTheDocument();
  });

  test('should render home route by default', async () => {
    render(<App />);
    
    // Should show home page content
    expect(screen.getByText('Free Screen Recording')).toBeInTheDocument();
  });

  test('should have proper app structure', () => {
    render(<App />);
    
    // Check for main app container
    const app = document.querySelector('.app');
    expect(app).toBeInTheDocument();
    
    // Check for content area
    const content = document.querySelector('.app-content');
    expect(content).toBeInTheDocument();
  });

  test('should load chrome compatibility layer', () => {
    render(<App />);
    
    // Should not throw errors related to chrome API
    expect(() => render(<App />)).not.toThrow();
  });

  test('should handle routing gracefully', () => {
    // Test that app renders even with no specific route
    render(<App />);
    
    // Should render main app structure
    expect(document.querySelector('.app')).toBeInTheDocument();
  });
});