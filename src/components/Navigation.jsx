import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { local as storage } from '../utils/storage.js';

const Navigation = () => {
  const location = useLocation();
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Check recording status
    const checkRecordingStatus = async () => {
      const data = await storage.get('recording');
      setIsRecording(data.recording || false);
    };

    checkRecordingStatus();

    // Set up periodic check
    const interval = setInterval(checkRecordingStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't show navigation on certain pages
  const hideNavigation = ['/recorder', '/permissions'].includes(location.pathname);

  if (hideNavigation) {
    return null;
  }

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <Link to="/">
            <img src="./assets/logo.svg" alt="Camcordity" className="nav-logo" />
            <span className="nav-title">Camcordity</span>
          </Link>
        </div>

        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <img src="./assets/tool-icons/record-icon.svg" alt="Record" />
            Record
          </Link>

          <Link 
            to="/editor" 
            className={`nav-link ${location.pathname === '/editor' ? 'active' : ''}`}
          >
            <img src="./assets/editor/icons/trim.svg" alt="Editor" />
            Editor
          </Link>

          <Link 
            to="/setup" 
            className={`nav-link ${location.pathname === '/setup' ? 'active' : ''}`}
          >
            <img src="./assets/tool-icons/help-icon.svg" alt="Settings" />
            Settings
          </Link>
        </div>

        <div className="nav-status">
          {isRecording && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .navigation {
          background: white;
          border-bottom: 1px solid #e8e8e8;
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
        }

        .nav-brand a {
          display: flex;
          align-items: center;
          text-decoration: none;
          color: inherit;
        }

        .nav-logo {
          width: 32px;
          height: 32px;
          margin-right: 0.5rem;
        }

        .nav-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1a1a1a;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: #6e7684;
          font-weight: 500;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          color: #4597f7;
          background: #f8fbff;
        }

        .nav-link.active {
          color: #4597f7;
          background: #f8fbff;
        }

        .nav-link img {
          width: 16px;
          height: 16px;
        }

        .nav-status {
          display: flex;
          align-items: center;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #fee;
          color: #dc3545;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .recording-dot {
          width: 8px;
          height: 8px;
          background: #dc3545;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .nav-container {
            padding: 0 1rem;
          }

          .nav-links {
            gap: 1rem;
          }

          .nav-link {
            padding: 0.5rem;
            font-size: 0.9rem;
          }

          .nav-link span {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navigation;