/**
 * Record component - Main recording interface for web app
 * Handles screen, camera, and region recording using web standards
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { local as storage } from '../utils/storage.js';
import { useRecordingState, useMessageListener } from '../hooks/useMessage.js';

const Record = () => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  
  // Message service hooks
  const { 
    startRecording: startRecordingMessage, 
    stopRecording: stopRecordingMessage,
    pauseRecording: pauseRecordingMessage,
    resumeRecording: resumeRecordingMessage
  } = useRecordingState();

  // Component state
  const [recordingType, setRecordingType] = useState('screen');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Recording settings
  const [settings, setSettings] = useState({
    quality: '1080p',
    fps: '30',
    audioEnabled: true,
    microphoneEnabled: true,
    countdown: 3
  });

  useEffect(() => {
    // Load recording type and settings from storage
    const loadSettings = async () => {
      try {
        const data = await storage.get([
          'recordingType', 
          'qualityValue', 
          'fpsValue', 
          'micActive',
          'countdown'
        ]);
        
        if (data.recordingType) setRecordingType(data.recordingType);
        if (data.qualityValue) setSettings(prev => ({ ...prev, quality: data.qualityValue }));
        if (data.fpsValue) setSettings(prev => ({ ...prev, fps: data.fpsValue }));
        if (data.micActive !== undefined) setSettings(prev => ({ ...prev, microphoneEnabled: data.micActive }));
        if (data.countdown !== undefined) setSettings(prev => ({ ...prev, countdown: data.countdown }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    // Timer for recording duration
    let interval;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Listen for state changes from other components
  useMessageListener('state-change', (data) => {
    if (data.key === 'recording') {
      setIsRecording(data.value);
    } else if (data.key === 'paused') {
      setIsPaused(data.value);
    } else if (data.key === 'time') {
      setRecordingTime(data.value);
    }
  }, []);

  // Format recording time for display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get quality constraints based on settings
  const getQualityConstraints = () => {
    const qualityMap = {
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '1440p': { width: 2560, height: 1440 },
      '4K': { width: 3840, height: 2160 }
    };

    const quality = qualityMap[settings.quality] || qualityMap['1080p'];
    const frameRate = parseInt(settings.fps);

    return {
      video: {
        width: { ideal: quality.width },
        height: { ideal: quality.height },
        frameRate: { ideal: frameRate }
      },
      audio: settings.audioEnabled
    };
  };

  // Request media stream based on recording type
  const requestMediaStream = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let stream;
      const constraints = getQualityConstraints();

      switch (recordingType) {
        case 'screen':
        case 'region':
          // Use getDisplayMedia for screen/window capture
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              ...constraints.video,
              cursor: 'always'
            },
            audio: settings.audioEnabled
          });
          break;

        case 'camera':
          // Use getUserMedia for camera capture
          stream = await navigator.mediaDevices.getUserMedia({
            video: constraints.video,
            audio: settings.microphoneEnabled
          });
          break;

        default:
          throw new Error('Invalid recording type');
      }

      // If microphone is enabled and we're doing screen recording, 
      // we need to mix audio streams
      if (settings.microphoneEnabled && recordingType !== 'camera') {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: false 
          });
          
          // Mix the streams using Web Audio API
          const audioContext = new AudioContext();
          const destination = audioContext.createMediaStreamDestination();
          
          // Add screen audio (if available)
          const screenAudioTracks = stream.getAudioTracks();
          if (screenAudioTracks.length > 0) {
            const screenSource = audioContext.createMediaStreamSource(
              new MediaStream(screenAudioTracks)
            );
            screenSource.connect(destination);
          }
          
          // Add microphone audio
          const micSource = audioContext.createMediaStreamSource(micStream);
          micSource.connect(destination);
          
          // Replace audio tracks with mixed audio
          stream.getAudioTracks().forEach(track => track.stop());
          stream.removeTrack(...stream.getAudioTracks());
          destination.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (micError) {
          console.warn('Could not access microphone:', micError);
          // Continue without microphone
        }
      }

      streamRef.current = stream;
      
      // Show preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setHasPermission(true);
      return stream;

    } catch (error) {
      console.error('Error accessing media:', error);
      setError(error.message);
      setHasPermission(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = streamRef.current || await requestMediaStream();
      
      // Configure MediaRecorder
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecording: getBitrate()
      };

      // Fallback MIME types if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await handleRecordingComplete();
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording failed: ' + event.error.message);
      };

      // Start recording with countdown
      if (settings.countdown > 0) {
        await showCountdown();
      }

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Notify other components via message service
      await startRecordingMessage();

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording: ' + error.message);
    }
  };

  // Show countdown before recording
  const showCountdown = () => {
    return new Promise(resolve => {
      let count = settings.countdown;
      const countdownInterval = setInterval(() => {
        if (count <= 0) {
          clearInterval(countdownInterval);
          resolve();
        } else {
          // You could show countdown UI here
          console.log(`Recording starts in ${count}...`);
          count--;
        }
      }, 1000);
    });
  };

  // Pause/Resume recording
  const togglePause = async () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      await resumeRecordingMessage();
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      await pauseRecordingMessage();
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Notify other components via message service
      await stopRecordingMessage();
    }
  };

  // Handle recording completion
  const handleRecordingComplete = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camcordity-recording-${new Date().toISOString().slice(0, 19)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Navigate back to home or show success message
      navigate('/');
      
    } catch (error) {
      console.error('Error handling recording completion:', error);
      setError('Failed to save recording: ' + error.message);
    }
  };

  // Get bitrate based on quality setting
  const getBitrate = () => {
    const bitrateMap = {
      '720p': 2500000,   // 2.5 Mbps
      '1080p': 5000000,  // 5 Mbps
      '1440p': 8000000,  // 8 Mbps
      '4K': 15000000     // 15 Mbps
    };
    return bitrateMap[settings.quality] || bitrateMap['1080p'];
  };

  // Cancel recording setup
  const cancelRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    navigate('/');
  };

  return (
    <div className="record">
      <div className="record-container">
        {/* Header */}
        <div className="record-header">
          <h1>
            {recordingType === 'screen' && 'Screen Recording'}
            {recordingType === 'camera' && 'Camera Recording'}
            {recordingType === 'region' && 'Region Recording'}
          </h1>
          <p>
            Quality: {settings.quality} @ {settings.fps}fps
            {settings.microphoneEnabled && ' • Microphone enabled'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Recording Status */}
        {isRecording && (
          <div className="recording-status">
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>
                {isPaused ? 'Recording Paused' : 'Recording'} - {formatTime(recordingTime)}
              </span>
            </div>
          </div>
        )}

        {/* Video Preview */}
        <div className="video-preview">
          <video 
            ref={videoRef}
            autoPlay 
            muted 
            playsInline
            className="preview-video"
          />
          {!hasPermission && !isLoading && (
            <div className="preview-placeholder">
              <div className="placeholder-content">
                <h3>Ready to Record</h3>
                <p>Click "Start Recording" to begin capture</p>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="preview-placeholder">
              <div className="placeholder-content">
                <div className="spinner"></div>
                <p>Requesting permissions...</p>
              </div>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="recording-controls">
          {!isRecording ? (
            <div className="control-group">
              <button 
                className="btn btn-primary start-btn"
                onClick={startRecording}
                disabled={isLoading}
              >
                <img src="./assets/record-tab-active.svg" alt="Record" />
                Start Recording
              </button>
              <button 
                className="btn btn-secondary cancel-btn"
                onClick={cancelRecording}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="control-group">
              <button 
                className="btn btn-secondary pause-btn"
                onClick={togglePause}
              >
                <img 
                  src={isPaused ? "./assets/tool-icons/play-icon.svg" : "./assets/tool-icons/pause-icon.svg"} 
                  alt={isPaused ? "Resume" : "Pause"} 
                />
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button 
                className="btn btn-danger stop-btn"
                onClick={stopRecording}
              >
                <img src="./assets/tool-icons/stop-icon.svg" alt="Stop" />
                Stop Recording
              </button>
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="settings-panel">
          <h3>Recording Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label htmlFor="quality">Quality:</label>
              <select 
                id="quality"
                value={settings.quality}
                onChange={(e) => setSettings(prev => ({ ...prev, quality: e.target.value }))}
                disabled={isRecording}
              >
                <option value="720p">720p HD</option>
                <option value="1080p">1080p Full HD</option>
                <option value="1440p">1440p QHD</option>
                <option value="4K">4K Ultra HD</option>
              </select>
            </div>

            <div className="setting-item">
              <label htmlFor="fps">Frame Rate:</label>
              <select 
                id="fps"
                value={settings.fps}
                onChange={(e) => setSettings(prev => ({ ...prev, fps: e.target.value }))}
                disabled={isRecording}
              >
                <option value="24">24 fps</option>
                <option value="30">30 fps</option>
                <option value="60">60 fps</option>
              </select>
            </div>

            {recordingType !== 'camera' && (
              <div className="setting-item">
                <label>
                  <input 
                    type="checkbox"
                    checked={settings.audioEnabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, audioEnabled: e.target.checked }))}
                    disabled={isRecording}
                  />
                  System Audio
                </label>
              </div>
            )}

            <div className="setting-item">
              <label>
                <input 
                  type="checkbox"
                  checked={settings.microphoneEnabled}
                  onChange={(e) => setSettings(prev => ({ ...prev, microphoneEnabled: e.target.checked }))}
                  disabled={isRecording}
                />
                Microphone
              </label>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .record {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          min-height: calc(100vh - 64px);
        }

        .record-container {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .record-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .record-header h1 {
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .record-header p {
          color: #6e7684;
          margin: 0;
        }

        .error-message {
          background: #fee;
          color: #dc3545;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #f8d7da;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message button {
          background: none;
          border: none;
          color: #dc3545;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .recording-status {
          text-align: center;
          margin-bottom: 1rem;
        }

        .recording-indicator {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: #fee;
          color: #dc3545;
          padding: 0.75rem 1.5rem;
          border-radius: 25px;
          font-weight: 600;
        }

        .recording-dot {
          width: 10px;
          height: 10px;
          background: #dc3545;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .video-preview {
          position: relative;
          background: #f8f9fa;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 2rem;
          aspect-ratio: 16/9;
        }

        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }

        .preview-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
        }

        .placeholder-content {
          text-align: center;
        }

        .placeholder-content h3 {
          color: #1a1a1a;
          margin-bottom: 0.5rem;
        }

        .placeholder-content p {
          color: #6e7684;
          margin: 0;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e8e8e8;
          border-top: 3px solid #4597f7;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .recording-controls {
          text-align: center;
          margin-bottom: 2rem;
        }

        .control-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn img {
          width: 16px;
          height: 16px;
        }

        .btn-primary {
          background: #4597f7;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #3585e5;
        }

        .btn-secondary {
          background: #6e7684;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #5a6169;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: #c82333;
        }

        .settings-panel {
          border-top: 1px solid #e8e8e8;
          padding-top: 2rem;
        }

        .settings-panel h3 {
          color: #1a1a1a;
          margin-bottom: 1rem;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .setting-item label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          color: #1a1a1a;
        }

        .setting-item select {
          padding: 0.5rem;
          border: 1px solid #e8e8e8;
          border-radius: 4px;
          background: white;
          min-width: 120px;
        }

        .setting-item input[type="checkbox"] {
          margin: 0;
        }

        @media (max-width: 768px) {
          .record {
            padding: 1rem;
          }

          .record-container {
            padding: 1rem;
          }

          .control-group {
            flex-direction: column;
            align-items: center;
          }

          .btn {
            width: 100%;
            max-width: 200px;
            justify-content: center;
          }

          .settings-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Record;