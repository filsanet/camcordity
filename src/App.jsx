import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './utils/chromeCompat.js'; // Initialize Chrome API compatibility layer

// Import web app specific components  
import Home from './components/Home.jsx';
import Navigation from './components/Navigation.jsx';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="app-content">
          <Routes>
            {/* Main web app routes */}
            <Route path="/" element={<Home />} />
            
            {/* Placeholder routes for future implementation */}
            <Route path="/record" element={<div>Recording interface coming soon...</div>} />
            <Route path="/camera" element={<div>Camera interface coming soon...</div>} />
            <Route path="/editor" element={<div>Editor coming soon...</div>} />
            <Route path="/setup" element={<div>Settings coming soon...</div>} />
            <Route path="/permissions" element={<div>Permissions coming soon...</div>} />
            
            {/* Catch-all redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;