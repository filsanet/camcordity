# Chrome Extension to Web App Conversion Plan

## Phase 1: Chrome Extension API Inventory & Analysis

### **Critical Chrome Extension APIs Used:**
1. **chrome.storage.local** - Persistent settings and state storage (used extensively throughout)
2. **chrome.runtime** - Message passing, extension URLs, manifest access
3. **chrome.tabs** - Tab management, messaging between tabs
4. **chrome.desktopCapture** - Screen/window capture for recording
5. **chrome.tabCapture** - Tab-specific recording capabilities  
6. **chrome.permissions** - Runtime permission requests
7. **chrome.offscreen** - Offscreen document API for recording
8. **chrome.action** - Extension button behavior
9. **chrome.commands** - Keyboard shortcuts
10. **chrome.alarms** - Recording time limits
11. **chrome.identity** - Google Drive authentication
12. **chrome.i18n** - Internationalization

### **Key Files with Heavy Extension API Usage:**
- `src/pages/Background/index.js` (1700+ lines, core background script)
- `src/pages/Content/context/ContentState.jsx` (message handling, storage)
- `src/pages/Recorder/Recorder.jsx` (desktopCapture, tabCapture)
- `src/pages/Background/modules/tabHelper.js` (tab management)

## Phase 2: Web API Replacement Strategy

### **2.1 Storage Layer Migration**
- Replace `chrome.storage.local` with **localStorage + IndexedDB**
- Create abstraction layer for seamless API switching
- Migrate existing settings and state management

### **2.2 Media Capture Modernization**
- Replace `chrome.desktopCapture` with **Screen Capture API** (`getDisplayMedia()`)
- Replace `chrome.tabCapture` with **getDisplayMedia()** tab capture
- Update MediaRecorder implementation for web standards

### **2.3 Navigation & Routing**
- Replace Chrome extension's multi-page architecture with **React Router**
- Convert popup interface to modal/overlay system
- Implement proper web app navigation flow

### **2.4 Communication Architecture**
- Replace `chrome.runtime.sendMessage` with **Broadcast Channel API** + **Custom Events**
- Implement service worker for background processing
- Create message routing system for inter-component communication

## Phase 3: Architecture Restructuring

### **3.1 Entry Point Transformation**
- Convert from manifest.json to standard web app structure
- Create single-page application with multiple views
- Implement proper routing for recorder, editor, settings

### **3.2 Permission Management**
- Replace extension permissions with web permissions API
- Implement progressive permission requests
- Handle microphone/camera permissions via getUserMedia

### **3.3 File System Integration**
- Remove Google Drive integration (as mentioned in README)
- Implement browser download API for file saving
- Maintain IndexedDB for temporary storage

## Phase 4: Feature Adaptation

### **4.1 Recording Functionality**
- Maintain screen/window/tab recording via getDisplayMedia
- Keep camera-only recording via getUserMedia  
- Preserve annotation and drawing capabilities
- Retain video editing features

### **4.2 UI/UX Adaptation**
- Convert popup interface to in-page modal system
- Adapt toolbar positioning for web context
- Maintain responsive design principles

### **4.3 Background Processing**
- Migrate background script logic to service worker
- Implement proper state management without extension context
- Maintain video processing capabilities

## Phase 5: Implementation Steps

### **Step 1: Storage Migration**
- Create storage abstraction layer
- Implement localStorage/IndexedDB backends
- Test data persistence and migration

### **Step 2: Media API Updates**
- Replace desktopCapture with getDisplayMedia
- Update MediaRecorder configuration
- Test recording functionality across browsers

### **Step 3: Routing Implementation**
- Set up React Router
- Convert extension pages to routes
- Implement navigation between views

### **Step 4: Communication Refactor**
- Replace runtime messaging with web-standard APIs
- Implement event-driven architecture
- Test cross-component communication

### **Step 5: Integration Testing**
- End-to-end testing of core workflows
- Cross-browser compatibility testing
- Performance optimization

## Phase 6: Deployment Preparation

### **6.1 Build System Updates**
- Modify webpack configuration for web app
- Remove extension-specific build steps
- Optimize for web deployment

### **6.2 Hosting Setup**
- Configure for static site hosting
- Set up HTTPS (required for media APIs)
- Implement service worker for offline functionality

This plan maintains the core functionality while modernizing the architecture for web standards. The modular approach allows for incremental migration and testing.