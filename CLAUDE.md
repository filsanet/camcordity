# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Camcordity is a web application conversion of the Screenity Chrome extension, providing in-browser video recording without Chrome extension APIs. It's built with React, TypeScript, and Webpack.

## Development Commands

- `npm install` - Install dependencies (includes patch-package postinstall)
- `npm run build` - Build production version using utils/build.js
- `npm start` - Start development server using utils/server.js
- `npm run dev` - Start development with watch mode (runs start + build:watch concurrently)
- `npm run prettier` - Format code with Prettier

## Architecture

### Page Structure
The application uses a multi-page architecture with separate webpack entry points:
- **Background** (`src/pages/Background/`) - Service worker functionality
- **Content** (`src/pages/Content/`) - Main content script with recording UI
- **Recorder** (`src/pages/Recorder/`) - Recording interface
- **Editor/Sandbox** (`src/pages/Editor/`, `src/pages/Sandbox/`) - Video editing functionality
- **Camera** (`src/pages/Camera/`) - Camera-only recording
- **Region** (`src/pages/Region/`) - Region selection for recording

### Key Components
- **Content Script**: Main recording interface with popup, toolbar, canvas, and region selection
- **Fabric.js Integration**: Canvas-based drawing and annotation tools in `src/pages/Content/canvas/`
- **Video Processing**: FFmpeg WASM-based editing in Editor/Sandbox pages
- **AI Features**: TensorFlow.js selfie segmentation for background effects

### State Management
- React Context for component state (`src/pages/Content/context/ContentState.jsx`)
- LocalForage for offline video storage
- Chrome extension storage APIs (transitioning to web storage)

### Build Configuration
- Webpack builds multiple entry points to separate HTML pages
- TypeScript compilation with `jsx: "preserve"`
- SCSS compilation with source maps
- Asset copying from `src/assets/` to `build/assets/`
- Patch-package applies fixes to fabric.js, plyr, and Radix UI

### Testing
No test framework detected in package.json. Check with user for testing approach before adding tests.

## Key Libraries
- React 17 with hot reloading
- Fabric.js for canvas drawing
- Radix UI primitives for components  
- TensorFlow.js for AI background effects
- Wavesurfer.js for audio visualization
- LocalForage for IndexedDB storage
- Plyr for video playback