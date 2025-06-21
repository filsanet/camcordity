# Camcordity Web App

This is the web application version of Camcordity, converted from the Chrome extension to work as a standalone web application.

## Getting Started

### Prerequisites
- Node.js >= 14
- npm

### Installation
```bash
npm install
```

### Development
```bash
# Start the web app development server
npm run dev:webapp

# This will start the webpack dev server on https://localhost:3000
# HTTPS is required for media capture APIs
```

### Production Build
```bash
# Build the web app for production
npm run build:webapp

# Files will be output to the `dist/` directory
```

### Extension Development (Original)
```bash
# Start the Chrome extension development server
npm run dev

# Build the Chrome extension
npm run build
```

## Web App Features

### ✅ Completed
- Storage abstraction layer (IndexedDB + localStorage)
- Chrome API compatibility layer
- React Router navigation
- Basic UI components (Home, Navigation)
- Webpack configuration for web app
- Service worker for offline functionality

### 🚧 In Progress
- Media capture API integration (getDisplayMedia)
- Recording functionality conversion
- UI component migration from extension popup

### 📋 Todo
- Complete recording interface conversion
- Editor component integration
- Camera functionality
- Settings/preferences page
- Progressive Web App (PWA) features

## Architecture

### Storage Layer
- `src/utils/storage.js` - Storage abstraction matching chrome.storage.local API
- Uses IndexedDB for primary storage with localStorage fallback
- Automatic synchronization of frequently accessed items

### Chrome API Compatibility
- `src/utils/chromeCompat.js` - Web API equivalents for Chrome extension APIs
- Replaces chrome.runtime, chrome.tabs, chrome.permissions, etc.
- Uses standard web APIs like getDisplayMedia, permissions API, etc.

### Routing
- Single-page application using React Router
- Routes: `/`, `/record`, `/camera`, `/editor`, `/setup`, `/permissions`
- Legacy extension routes maintained for gradual migration

### Build System
- `webpack.webapp.config.js` - Web app specific configuration
- Separate from extension build system
- Optimized for web deployment with code splitting

## Development Notes

### Media APIs
- Screen recording uses `getDisplayMedia()` instead of `chrome.desktopCapture`
- Camera access uses `getUserMedia()` directly
- Audio recording uses Web Audio API

### Communication
- Uses custom events and BroadcastChannel API instead of chrome.runtime.sendMessage
- Service worker handles background tasks

### Storage Migration
The storage abstraction layer is designed to be compatible with existing chrome.storage.local usage, allowing for gradual migration of components.

## Deployment

The web app requires HTTPS for media capture APIs to work. Deploy to any static hosting service that supports HTTPS.

### Required Headers
```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

These are configured in the webpack dev server and should be set on your production server.