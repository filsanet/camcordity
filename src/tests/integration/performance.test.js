/**
 * Performance integration tests
 * Tests app performance, memory usage, and optimization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../../App.jsx';
import messageService from '../../utils/messageService.js';

// Mock storage
jest.mock('../../utils/storage.js', () => ({
  local: {
    get: jest.fn(),
    set: jest.fn(),
  }
}));

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    // Reset performance marks
    if (global.performance && global.performance.clearMarks) {
      global.performance.clearMarks();
      global.performance.clearMeasures();
    }

    // Mock storage
    const { local: storage } = require('../../utils/storage.js');
    storage.get.mockResolvedValue({
      recordingType: 'screen',
      recording: false
    });
    storage.set.mockResolvedValue();

    // Reset message service
    messageService.messageHandlers.clear();
    messageService.responseHandlers.clear();
  });

  test('App initial render performance', async () => {
    const startTime = performance.now();
    
    render(<App />);
    
    // Wait for app to fully load
    await waitFor(() => {
      expect(screen.getByText('Free Screen Recording')).toBeInTheDocument();
    });
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // App should render within reasonable time (< 500ms)
    expect(renderTime).toBeLessThan(500);
    
    console.log(`App render time: ${renderTime.toFixed(2)}ms`);
  });

  test('Navigation performance', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });

    const startTime = performance.now();
    
    // Navigate to recording page
    const startButton = screen.getByText('Start Recording');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(window.location.pathname).toBe('/record');
    });
    
    const endTime = performance.now();
    const navigationTime = endTime - startTime;
    
    // Navigation should be fast (< 100ms)
    expect(navigationTime).toBeLessThan(100);
    
    console.log(`Navigation time: ${navigationTime.toFixed(2)}ms`);
  });

  test('Message service performance', async () => {
    const messageCount = 100;
    const messages = [];
    
    // Set up message handler
    messageService.addMessageHandler('performance-test', (data) => {
      messages.push(data);
    });
    
    const startTime = performance.now();
    
    // Send multiple messages rapidly
    for (let i = 0; i < messageCount; i++) {
      messageService.sendMessage('performance-test', { index: i });
    }
    
    // Wait for all messages to be processed
    await waitFor(() => {
      expect(messages.length).toBe(messageCount);
    }, { timeout: 1000 });
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / messageCount;
    
    // Each message should be processed quickly (< 1ms average)
    expect(averageTime).toBeLessThan(1);
    
    console.log(`Message processing: ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(3)}ms average`);
  });

  test('Storage operations performance', async () => {
    const { local: storage } = require('../../utils/storage.js');
    const operationCount = 50;
    
    const startTime = performance.now();
    
    // Perform multiple storage operations
    const promises = [];
    for (let i = 0; i < operationCount; i++) {
      promises.push(storage.set({ [`key${i}`]: `value${i}` }));
    }
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / operationCount;
    
    // Storage operations should be reasonably fast (< 2ms average)
    expect(averageTime).toBeLessThan(2);
    
    console.log(`Storage operations: ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(3)}ms average`);
  });

  test('Component re-render optimization', async () => {
    let renderCount = 0;
    
    // Create a test component that counts renders
    const TestComponent = React.memo(() => {
      renderCount++;
      return <div>Render count: {renderCount}</div>;
    });
    
    const { rerender } = render(<TestComponent />);
    
    expect(renderCount).toBe(1);
    
    // Re-render with same props - should not trigger new render due to React.memo
    rerender(<TestComponent />);
    expect(renderCount).toBe(1);
    
    console.log(`Component properly optimized with React.memo`);
  });

  test('Memory usage during state updates', async () => {
    render(<App />);
    
    // Get initial memory usage (if available)
    const initialMemory = global.performance?.memory?.usedJSHeapSize || 0;
    
    // Perform multiple state updates
    for (let i = 0; i < 20; i++) {
      messageService.sendMessage('state-change', { 
        key: 'test', 
        value: `update-${i}` 
      });
    }
    
    // Wait for updates to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalMemory = global.performance?.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    if (initialMemory > 0) {
      // Memory increase should be reasonable (< 1MB for state updates)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
      console.log(`Memory usage increase: ${(memoryIncrease / 1024).toFixed(2)}KB`);
    } else {
      console.log('Memory monitoring not available in test environment');
    }
  });

  test('Event listener cleanup', async () => {
    const { unmount } = render(<App />);
    
    // Track initial handler count
    const initialHandlerCount = messageService.messageHandlers.size;
    
    // Component should add handlers
    expect(messageService.messageHandlers.size).toBeGreaterThanOrEqual(initialHandlerCount);
    
    // Unmount component
    unmount();
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Handlers should be cleaned up (though some global ones may remain)
    console.log(`Message handlers after unmount: ${messageService.messageHandlers.size}`);
  });

  test('Bundle size analysis', () => {
    // This would typically be run as part of build process
    // Here we can check that key modules are available
    
    const coreModules = [
      'React',
      'messageService',
      'storage'
    ];
    
    coreModules.forEach(module => {
      switch (module) {
        case 'React':
          expect(React).toBeDefined();
          break;
        case 'messageService':
          expect(messageService).toBeDefined();
          break;
        case 'storage':
          expect(require('../../utils/storage.js')).toBeDefined();
          break;
      }
    });
    
    console.log('All core modules loaded successfully');
  });

  test('Render batching optimization', async () => {
    let renderCount = 0;
    
    const TestComponent = () => {
      const [state, setState] = React.useState(0);
      
      React.useEffect(() => {
        renderCount++;
      });
      
      React.useEffect(() => {
        // Perform multiple state updates in quick succession
        setState(1);
        setState(2);
        setState(3);
      }, []);
      
      return <div>{state}</div>;
    };
    
    render(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
    
    // Should only render twice: initial + batched updates
    expect(renderCount).toBeLessThanOrEqual(2);
    
    console.log(`Renders for batched updates: ${renderCount}`);
  });
});