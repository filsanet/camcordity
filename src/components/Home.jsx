import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { local as storage } from '../utils/storage.js';
import { useRecordingState, useMessageListener } from '../hooks/useMessage.js';

const Home = () => {
  const navigate = useNavigate();
  const [recordingType, setRecordingType] = useState('screen');
  const [isRecording, setIsRecording] = useState(false);
  
  // Message service hooks
  const { checkRecordingState, stopRecording } = useRecordingState();

  useEffect(() => {
    // Check if currently recording
    const checkRecordingStatus = async () => {
      const state = await checkRecordingState();
      setIsRecording(state.recording || false);
      
      const data = await storage.get(['recordingType']);
      setRecordingType(data.recordingType || 'screen');
    };

    checkRecordingStatus();
  }, [checkRecordingState]);

  // Listen for state changes from message service
  useMessageListener('state-change', (data) => {
    if (data.key === 'recording') {
      setIsRecording(data.value);
    }
  }, []);

  const handleStartRecording = async () => {
    // Save recording type
    await storage.set({ recordingType });
    
    // Navigate to recording interface
    navigate('/record');
  };

  const handleStopRecording = async () => {
    await stopRecording();
    setIsRecording(false);
  };

  return (
    <div className="home">
      <div className="home-header">
        <img 
          src="./assets/logo-text.svg" 
          alt="Camcordity" 
          className="logo"
        />
        <h1>Free Screen Recording</h1>
        <p>Record your screen, camera, or both with professional features</p>
      </div>

      <div className="home-content">
        {!isRecording ? (
          <div className="recording-setup">
            <div className="recording-types">
              <h2>What would you like to record?</h2>
              
              <div className="recording-options">
                <button
                  className={`recording-option ${recordingType === 'screen' ? 'active' : ''}`}
                  onClick={() => setRecordingType('screen')}
                >
                  <img src="./assets/screen-tab-on.svg" alt="Screen" />
                  <span>Screen</span>
                  <p>Record your entire screen or a specific window</p>
                </button>

                <button
                  className={`recording-option ${recordingType === 'camera' ? 'active' : ''}`}
                  onClick={() => setRecordingType('camera')}
                >
                  <img src="./assets/camera-on.svg" alt="Camera" />
                  <span>Camera</span>
                  <p>Record from your webcam only</p>
                </button>

                <button
                  className={`recording-option ${recordingType === 'region' ? 'active' : ''}`}
                  onClick={() => setRecordingType('region')}
                >
                  <img src="./assets/region-tab-on.svg" alt="Region" />
                  <span>Region</span>
                  <p>Record a specific area of your screen</p>
                </button>
              </div>
            </div>

            <div className="recording-controls">
              <button 
                className="start-recording-btn"
                onClick={handleStartRecording}
              >
                <img src="./assets/record-tab-active.svg" alt="Record" />
                Start Recording
              </button>
            </div>
          </div>
        ) : (
          <div className="recording-active">
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording in progress...</span>
            </div>
            
            <div className="recording-controls">
              <button 
                className="stop-recording-btn"
                onClick={handleStopRecording}
              >
                <img src="./assets/tool-icons/stop-icon.svg" alt="Stop" />
                Stop Recording
              </button>
            </div>
          </div>
        )}

        <div className="features">
          <h2>Features</h2>
          <div className="feature-grid">
            <div className="feature">
              <img src="./assets/tool-icons/drawing-icon.svg" alt="Annotations" />
              <h3>Annotations</h3>
              <p>Draw, highlight, and add text while recording</p>
            </div>
            
            <div className="feature">
              <img src="./assets/tool-icons/camera-icon.svg" alt="Camera" />
              <h3>Camera Overlay</h3>
              <p>Add your webcam to screen recordings</p>
            </div>
            
            <div className="feature">
              <img src="./assets/editor/icons/trim.svg" alt="Editor" />
              <h3>Built-in Editor</h3>
              <p>Trim, crop, and edit your recordings</p>
            </div>
            
            <div className="feature">
              <img src="./assets/tool-icons/audio-icon.svg" alt="Audio" />
              <h3>High-Quality Audio</h3>
              <p>Record system audio and microphone</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .home {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .home-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .logo {
          width: 150px;
          margin-bottom: 1rem;
        }

        .home-header h1 {
          font-size: 2.5rem;
          color: #1a1a1a;
          margin-bottom: 1rem;
          font-family: 'Satoshi-Bold', sans-serif;
        }

        .home-header p {
          font-size: 1.2rem;
          color: #6e7684;
          margin-bottom: 0;
        }

        .recording-setup {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          margin-bottom: 3rem;
        }

        .recording-types h2 {
          text-align: center;
          margin-bottom: 2rem;
          color: #1a1a1a;
        }

        .recording-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .recording-option {
          background: white;
          border: 2px solid #e8e8e8;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .recording-option:hover {
          border-color: #4597f7;
        }

        .recording-option.active {
          border-color: #4597f7;
          background: #f8fbff;
        }

        .recording-option img {
          width: 32px;
          height: 32px;
          margin-bottom: 0.5rem;
        }

        .recording-option span {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .recording-option p {
          font-size: 0.9rem;
          color: #6e7684;
          margin: 0;
        }

        .recording-controls {
          text-align: center;
        }

        .start-recording-btn,
        .stop-recording-btn {
          background: #4597f7;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: background-color 0.2s ease;
        }

        .start-recording-btn:hover {
          background: #3585e5;
        }

        .stop-recording-btn {
          background: #dc3545;
        }

        .stop-recording-btn:hover {
          background: #c82333;
        }

        .recording-active {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          margin-bottom: 3rem;
          text-align: center;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }

        .recording-dot {
          width: 12px;
          height: 12px;
          background: #dc3545;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .features {
          text-align: center;
        }

        .features h2 {
          margin-bottom: 2rem;
          color: #1a1a1a;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 2rem;
        }

        .feature {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .feature img {
          width: 32px;
          height: 32px;
          margin-bottom: 1rem;
        }

        .feature h3 {
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .feature p {
          color: #6e7684;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default Home;