import { useState, useEffect, useRef } from 'react';

// Icons with explicit sizes to prevent giant rendering
const IconSvg = ({ children, size = 20 }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ flexShrink: 0 }}>{children}</svg>
);

const Icons = {
  Video: () => <IconSvg><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></IconSvg>,
  Screen: () => <IconSvg><path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></IconSvg>,
  Mic: () => <IconSvg><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></IconSvg>,
  MicOff: () => <IconSvg><path d="M19 11h-1.7c0 .74-.16 1.44-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></IconSvg>,
  CameraOff: () => <IconSvg><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2z"/></IconSvg>,
  Close: () => <IconSvg><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></IconSvg>,
  Send: () => <IconSvg><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></IconSvg>,
  File: () => <IconSvg><path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/></IconSvg>,
  Download: () => <IconSvg><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></IconSvg>,
  Users: () => <IconSvg size={18}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></IconSvg>,
  Leave: () => <IconSvg><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></IconSvg>,
  Upload: () => <IconSvg size={32}><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></IconSvg>,
  Whiteboard: () => <IconSvg><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h7v2H7z"/></IconSvg>,
  Brush: () => <IconSvg><path d="M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a.996.996 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a.996.996 0 000-1.41z"/></IconSvg>,
  Eraser: () => <IconSvg><path d="M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.78-.78 2.04 0 2.82l3.86 3.86c.78.78 2.04.78 2.82 0l11.14-11.14c.78-.78.78-2.04 0-2.82l-3.86-3.86c-.38-.39-.89-.59-1.41-.59zm-2.83 16.52l-3.86-3.86-4.24 4.24 3.86 3.86 4.24-4.24z"/></IconSvg>,
  Clear: () => <IconSvg><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></IconSvg>,
  Save: () => <IconSvg><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></IconSvg>,
};

function VideoRoom({ classData, userName, userRole, avatar, onLeave, classes, setClasses }) {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const [screenStream, setScreenStream] = useState(null);
  
  // Whiteboard refs and state
  const whiteboardRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState('brush'); // 'brush' or 'eraser'
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  // Get current class data
  const currentClass = classes.find(c => c.id === classData?.id) || classData;

  // Initialize camera on mount — keep separate from chat/whiteboard effects
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;
    
    // Start camera
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: audioEnabled 
        });
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.log('Camera not available:', err);
        setVideoEnabled(false);
      }
    };
    
    startCamera();
    
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []); // Run once on mount

  // React to video enabled/disabled changes
  useEffect(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = videoEnabled;
    }
  }, [videoEnabled]);

  // React to audio enabled/disabled changes
  useEffect(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = audioEnabled;
    }
  }, [audioEnabled]);

  // Scroll to bottom of chat + initialize whiteboard
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    
    if (showWhiteboard && whiteboardRef.current) {
      initWhiteboard();
    }
  }, [messages, showChat, showWhiteboard]);

  const initWhiteboard = () => {
    const canvas = whiteboardRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const getCanvasCoords = (e) => {
    const canvas = whiteboardRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setLastPos(coords);
    
    // Draw a dot on start
    const ctx = whiteboardRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = tool === 'eraser' ? '#1a1a2e' : drawColor;
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const coords = getCanvasCoords(e);
    const ctx = whiteboardRef.current?.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = tool === 'eraser' ? '#1a1a2e' : drawColor;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    setLastPos(coords);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearWhiteboard = () => {
    if (whiteboardRef.current) {
      const ctx = whiteboardRef.current.getContext('2d');
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, whiteboardRef.current.width, whiteboardRef.current.height);
    }
  };

  const toggleVideo = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    setVideoEnabled(videoTrack.enabled);
  };

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }
        setScreenSharing(true);
        
        // Handle when user stops sharing via browser UI
        stream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          setScreenStream(null);
        };
      } catch (err) {
        console.log('Screen sharing cancelled or failed:', err);
      }
    }
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    
    const msg = {
      id: Date.now(),
      sender: userName,
      senderRole: userRole,
      avatar: avatar,
      text: chatMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setClasses(prev => prev.map(c => {
      if (c.id === currentClass.id) {
        return { ...c, chat: [...c.chat, msg] };
      }
      return c;
    }));
    setMessages(prev => [...prev, msg]);
    setChatMessage('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type, filename) => {
    if (type.startsWith('video/')) return <Icons.Video />;
    if (type.startsWith('audio/')) return '🎵';
    if (type.startsWith('image/')) return '🖼️';
    if (filename?.endsWith('.pdf')) return '📄';
    return <Icons.File />;
  };

  const classMessages = currentClass?.chat || [];

  return (
    <div className="video-room">
      {/* Header */}
      <header className="room-header">
        <div className="room-info">
          <span className="live-badge">🔴 LIVE</span>
          <h2>{currentClass?.title || 'Classroom'}</h2>
          <span className="participant-count">
            <Icons.Users /> {currentClass?.students?.length || 0} students
          </span>
        </div>
        <button className="leave-btn" onClick={onLeave}>
          <Icons.Leave /> Leave
        </button>
      </header>

      {/* Main Content */}
      <div className="room-content">
        {/* Video Area */}
        <div className="video-area">
          {/* Screen Share Display */}
          {screenSharing && !showWhiteboard && (
            <div className="screen-share-container">
              <video 
                ref={screenVideoRef} 
                autoPlay 
                playsInline 
                className="screen-video"
              />
              <div className="screen-share-indicator">
                <Icons.Screen /> Sharing Screen
              </div>
            </div>
          )}

          {/* Whiteboard Display */}
          {showWhiteboard && (
            <div className="whiteboard-container">
              <canvas
                ref={whiteboardRef}
                width={1280}
                height={720}
                className="whiteboard-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <div className="whiteboard-toolbar">
                <button 
                  className={`wb-tool ${tool === 'brush' ? 'active' : ''}`}
                  onClick={() => setTool('brush')}
                  title="Brush"
                >
                  <Icons.Brush />
                </button>
                <button 
                  className={`wb-tool ${tool === 'eraser' ? 'active' : ''}`}
                  onClick={() => setTool('eraser')}
                  title="Eraser"
                >
                  <Icons.Eraser />
                </button>
                <div className="wb-divider" />
                <input
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  className="wb-color-picker"
                  title="Color"
                />
                <div className="wb-divider" />
                <div className="wb-brush-size">
                  <span>Size:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                  />
                  <span>{brushSize}px</span>
                </div>
                <div className="wb-divider" />
                <button className="wb-tool wb-clear" onClick={clearWhiteboard} title="Clear">
                  <Icons.Clear />
                </button>
              </div>
              <div className="whiteboard-indicator">
                <Icons.Whiteboard /> Whiteboard Active
              </div>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          <div className={`local-video-container ${screenSharing || showWhiteboard ? 'pip' : 'full'}`}>
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted
              className="local-video"
            />
            {!videoEnabled && (
              <div className="video-off-overlay">
                <span>{avatar}</span>
                <p>Camera Off</p>
              </div>
            )}
            <div className="local-video-label">
              {userName} (You) {userRole === 'teacher' && '👨‍🏫'}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`room-sidebar ${showChat || showMaterials ? 'open' : ''}`}>
          {/* Sidebar Tabs */}
          <div className="sidebar-tabs">
            <button 
              className={`sidebar-tab ${showChat ? 'active' : ''}`}
              onClick={() => { setShowChat(!showChat); setShowMaterials(false); }}
            >
              💬 Chat
            </button>
            <button 
              className={`sidebar-tab ${showMaterials ? 'active' : ''}`}
              onClick={() => { setShowMaterials(!showMaterials); setShowChat(false); }}
            >
              📁 Materials
            </button>
            <button 
              className="sidebar-close"
              onClick={() => { setShowChat(false); setShowMaterials(false); }}
            >
              ✕
            </button>
          </div>

          {/* Chat Panel */}
          {showChat && (
            <div className="chat-panel">
              <div className="chat-messages">
                {classMessages.length > 0 ? (
                  classMessages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`chat-message ${msg.sender === userName ? 'own' : ''}`}
                    >
                      <span className="msg-avatar">{msg.avatar}</span>
                      <div className="msg-content">
                        <div className="msg-header">
                          <span className="msg-sender">{msg.sender}</span>
                          <span className="msg-time">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="msg-text">{msg.text}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-messages">No messages yet</div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button onClick={handleSendMessage}>
                  <Icons.Send />
                </button>
              </div>
            </div>
          )}

          {/* Materials Panel */}
          {showMaterials && (
            <div className="materials-panel">
              {currentClass?.materials?.length > 0 ? (
                <div className="materials-list">
                  {currentClass.materials.map(m => (
                    <div key={m.id} className="material-item">
                      <div className="material-icon">
                        {getFileIcon(m.type, m.name)}
                      </div>
                      <div className="material-info">
                        <p className="material-name">{m.name}</p>
                        <p className="material-meta">
                          {formatFileSize(m.size)} • {m.uploadedBy}
                        </p>
                      </div>
                      <a href={m.data} download={m.name} className="download-btn">
                        <Icons.Download />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-materials">No materials shared yet</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="room-controls">
        <div className="controls-group">
          <button 
            className={`control-btn ${!audioEnabled ? 'off' : ''}`}
            onClick={toggleAudio}
          >
            {audioEnabled ? <Icons.Mic /> : <Icons.MicOff />}
            <span className="btn-label">{audioEnabled ? 'Mute' : 'Unmute'}</span>
          </button>

          <button 
            className={`control-btn ${!videoEnabled ? 'off' : ''}`}
            onClick={toggleVideo}
          >
            {videoEnabled ? <Icons.Video /> : <Icons.CameraOff />}
            <span className="btn-label">{videoEnabled ? 'Stop Video' : 'Start Video'}</span>
          </button>

          <button 
            className={`control-btn ${screenSharing ? 'sharing' : ''}`}
            onClick={toggleScreenShare}
          >
            <Icons.Screen />
            <span className="btn-label">{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
          </button>

          <button 
            className={`control-btn ${showWhiteboard ? 'whiteboard-active' : ''}`}
            onClick={() => setShowWhiteboard(!showWhiteboard)}
          >
            <Icons.Whiteboard />
            <span className="btn-label">Whiteboard</span>
          </button>
        </div>

        <div className="controls-divider" />

        <div className="controls-group">
          <button 
            className={`control-btn ${showChat ? 'chat-active' : ''}`}
            onClick={() => { setShowChat(!showChat); setShowMaterials(false); }}
          >
            💬
            <span className="btn-label">Chat</span>
            {classMessages.length > 0 && (
              <span className="notification-badge">{classMessages.length}</span>
            )}
          </button>

          <button 
            className={`control-btn ${showMaterials ? 'materials-active' : ''}`}
            onClick={() => { setShowMaterials(!showMaterials); setShowChat(false); }}
          >
            📁
            <span className="btn-label">Files</span>
          </button>
        </div>

        <div className="controls-divider" />

        <button 
          className="control-btn leave-btn"
          onClick={onLeave}
        >
          <Icons.Close />
          <span className="btn-label">Leave</span>
        </button>
      </div>

      <style>{`
        .video-room {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%);
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
        }

        .video-room::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at 20% 20%, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(118, 75, 162, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 32px;
          background: linear-gradient(180deg, rgba(15, 15, 35, 0.95) 0%, rgba(15, 15, 35, 0.7) 100%);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(139, 92, 246, 0.15);
          position: relative;
          z-index: 10;
        }

        .room-header::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 5%;
          right: 5%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.4), rgba(236, 72, 153, 0.4), transparent);
        }

        .room-info {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .live-badge {
          background: linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #ec4899 100%);
          color: white;
          padding: 7px 18px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          animation: pulse-badge 2s infinite;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5), 0 0 30px rgba(244, 63, 94, 0.2);
          position: relative;
          overflow: hidden;
        }

        .live-badge::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 3s infinite;
        }

        @keyframes shimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }

        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 20px rgba(239, 68, 68, 0.5), 0 0 30px rgba(244, 63, 94, 0.2); }
          50% { transform: scale(1.05); box-shadow: 0 6px 30px rgba(239, 68, 68, 0.7), 0 0 50px rgba(244, 63, 94, 0.3); }
        }

        .room-info h2 {
          font-size: 24px;
          color: white;
          font-weight: 800;
          text-shadow: 0 2px 20px rgba(139, 92, 246, 0.3);
          background: linear-gradient(135deg, #fff 0%, #c4b5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .participant-count {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #c4b5fd;
          font-size: 14px;
          font-weight: 600;
          background: linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(30, 27, 75, 0.3));
          padding: 8px 18px;
          border-radius: 20px;
          border: 1px solid rgba(139, 92, 246, 0.2);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .participant-count svg {
          width: 18px;
          height: 18px;
          color: #34d399;
          filter: drop-shadow(0 0 6px rgba(52, 211, 153, 0.5));
        }

        .room-header .leave-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 13px 28px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #ef4444 0%, #f43f5e 50%, #ec4899 100%);
          color: white;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 6px 25px rgba(239, 68, 68, 0.4), 0 0 40px rgba(244, 63, 94, 0.15);
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          overflow: hidden;
        }

        .room-header .leave-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .room-header .leave-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 35px rgba(239, 68, 68, 0.6), 0 0 60px rgba(244, 63, 94, 0.25);
        }

        .room-header .leave-btn:hover::before {
          opacity: 1;
        }

        .room-content {
          flex: 1;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        .video-area {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, #1a1a3e 0%, #0f0f23 100%);
        }

        .screen-share-container {
          position: absolute;
          inset: 20px;
          display: flex;
          flex-direction: column;
        }

        .screen-video {
          flex: 1;
          width: 100%;
          border-radius: 16px;
          background: #1a1a2e;
        }

        .screen-share-indicator {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(102, 126, 234, 0.9);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .local-video-container {
          position: absolute;
          background: linear-gradient(145deg, #2a2a4a, #1a1a3a);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(102, 126, 234, 0.5);
        }

        .local-video-container.full {
          inset: 24px;
        }

        .local-video-container.pip {
          width: 260px;
          height: 195px;
          bottom: 120px;
          right: 24px;
          z-index: 20;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(102, 126, 234, 0.5);
        }

        .local-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-off-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, #2d2d5a, #1a1a3a);
        }

        .video-off-overlay span {
          font-size: 56px;
          margin-bottom: 12px;
          filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.3));
        }

        .video-off-overlay p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 500;
        }

        .local-video-label {
          position: absolute;
          bottom: 10px;
          left: 10px;
          padding: 6px 12px;
          background: linear-gradient(145deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5));
          backdrop-filter: blur(10px);
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .room-sidebar {
          width: 0;
          background: linear-gradient(180deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
          border-left: 1px solid rgba(139, 92, 246, 0.2);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: -10px 0 40px rgba(139, 92, 246, 0.15);
        }

        .room-sidebar.open {
          width: 400px;
        }

        .sidebar-tabs {
          display: flex;
          padding: 20px 16px 16px;
          gap: 8px;
          border-bottom: 1px solid rgba(139, 92, 246, 0.15);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.4) 100%);
        }

        .sidebar-tab {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid transparent;
          background: linear-gradient(145deg, rgba(30, 27, 75, 0.6), rgba(15, 23, 42, 0.8));
          color: rgba(199, 210, 254, 0.7);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          border-radius: 14px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          position: relative;
          overflow: hidden;
        }

        .sidebar-tab::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1));
          opacity: 0;
          transition: opacity 0.3s;
        }

        .sidebar-tab:hover {
          border-color: rgba(139, 92, 246, 0.4);
          color: #e0e7ff;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.2);
        }

        .sidebar-tab:hover::before {
          opacity: 1;
        }

        .sidebar-tab.active {
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f43f5e 100%);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 30px rgba(139, 92, 246, 0.5), 0 0 60px rgba(236, 72, 153, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .sidebar-tab.active::before {
          display: none;
        }

        .sidebar-close {
          width: 48px;
          border: 2px solid rgba(244, 63, 94, 0.3);
          background: linear-gradient(145deg, rgba(244, 63, 94, 0.15), rgba(244, 63, 94, 0.05));
          color: #fb7185;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s;
          font-size: 18px;
          font-weight: 700;
        }

        .sidebar-close:hover {
          background: linear-gradient(145deg, #f43f5e, #e11d48);
          color: white;
          border-color: transparent;
          transform: scale(1.08);
          box-shadow: 0 8px 25px rgba(244, 63, 94, 0.5);
        }

        .chat-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.3) 0%, rgba(30, 27, 75, 0.1) 100%);
        }

        .chat-messages {
          flex: 1;
          padding: 24px 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .chat-message {
          display: flex;
          gap: 12px;
          animation: messagePopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes messagePopIn {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .chat-message.own {
          flex-direction: row-reverse;
        }

        .msg-avatar {
          font-size: 40px;
          flex-shrink: 0;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
          animation: avatarBounce 0.5s ease;
        }

        @keyframes avatarBounce {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .msg-content {
          max-width: 78%;
          background: linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
          padding: 16px 20px;
          border-radius: 20px;
          border-top-left-radius: 4px;
          border: 1px solid rgba(139, 92, 246, 0.15);
          backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.05);
          position: relative;
          overflow: hidden;
        }

        .msg-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #8b5cf6, #ec4899, #f43f5e);
          opacity: 0.6;
        }

        .chat-message.own .msg-content {
          background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 30%, #ec4899 100%);
          border-radius: 20px;
          border-top-right-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 32px rgba(124, 58, 237, 0.4), 0 0 60px rgba(236, 72, 153, 0.15);
        }

        .chat-message.own .msg-content::before {
          background: linear-gradient(90deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
          opacity: 0.5;
        }

        .msg-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 8px;
          align-items: center;
        }

        .msg-sender {
          font-weight: 800;
          font-size: 13px;
          color: #c4b5fd;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .chat-message.own .msg-sender {
          color: rgba(255, 255, 255, 0.95);
        }

        .msg-time {
          font-size: 11px;
          color: rgba(167, 139, 250, 0.6);
          font-weight: 500;
        }

        .chat-message.own .msg-time {
          color: rgba(255, 255, 255, 0.7);
        }

        .msg-text {
          font-size: 15px;
          line-height: 1.6;
          color: #e2e8f0;
          font-weight: 500;
        }

        .chat-message.own .msg-text {
          color: rgba(255, 255, 255, 0.98);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .no-messages {
          text-align: center;
          color: rgba(167, 139, 250, 0.5);
          padding: 60px 20px;
          font-size: 15px;
          font-weight: 500;
        }

        .chat-input {
          display: flex;
          gap: 14px;
          padding: 20px 24px;
          border-top: 1px solid rgba(139, 92, 246, 0.12);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.9) 100%);
          position: relative;
        }

        .chat-input::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 10%;
          right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3), transparent);
        }

        .chat-input input {
          flex: 1;
          padding: 16px 24px;
          border: 2px solid rgba(139, 92, 246, 0.2);
          background: linear-gradient(145deg, rgba(30, 27, 75, 0.6), rgba(15, 23, 42, 0.8));
          border-radius: 16px;
          color: #e2e8f0;
          font-size: 15px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .chat-input input::placeholder {
          color: rgba(167, 139, 250, 0.4);
          font-weight: 400;
        }

        .chat-input input:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.6);
          background: linear-gradient(145deg, rgba(30, 27, 75, 0.8), rgba(15, 23, 42, 0.95));
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.2), inset 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .chat-input button {
          width: 54px;
          height: 54px;
          border: none;
          background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f43f5e 100%);
          border-radius: 16px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4), 0 0 40px rgba(236, 72, 153, 0.15);
          position: relative;
          overflow: hidden;
        }

        .chat-input button::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .chat-input button:hover {
          transform: scale(1.12) rotate(-5deg);
          box-shadow: 0 12px 35px rgba(139, 92, 246, 0.6), 0 0 60px rgba(236, 72, 153, 0.25);
        }

        .chat-input button:hover::before {
          opacity: 1;
        }

        .chat-input button:active {
          transform: scale(1.05) rotate(0deg);
        }

        .chat-input button svg {
          width: 24px;
          height: 24px;
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        }

        .materials-panel {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .materials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .material-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }

        .material-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(102, 126, 234, 0.2);
          border-radius: 8px;
        }

        .material-icon svg {
          width: 20px;
          height: 20px;
          color: #667eea;
        }

        .material-info {
          flex: 1;
          min-width: 0;
        }

        .material-name {
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .material-meta {
          font-size: 11px;
          color: #94a3b8;
        }

        .download-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.3s;
        }

        .download-btn:hover {
          background: #10b981;
          color: white;
        }

        .download-btn svg {
          width: 16px;
          height: 16px;
        }

        .no-materials {
          text-align: center;
          color: #94a3b8;
          padding: 40px;
        }

        .room-controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          padding: 20px 32px;
          background: linear-gradient(180deg, rgba(15, 15, 35, 0.8) 0%, rgba(10, 10, 30, 0.95) 100%);
          backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .controls-group {
          display: flex;
          gap: 8px;
        }

        .controls-divider {
          width: 1px;
          height: 50px;
          background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          margin: 0 8px;
        }

        .control-btn {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          border: none;
          background: linear-gradient(145deg, rgba(60, 60, 100, 0.6), rgba(40, 40, 80, 0.4));
          color: white;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .control-btn:hover {
          transform: translateY(-4px) scale(1.05);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .control-btn:active {
          transform: translateY(-2px) scale(1.02);
        }

        .control-btn svg, .control-btn span:first-child {
          font-size: 26px;
        }

        .btn-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.9;
        }

        .control-btn.off {
          background: linear-gradient(145deg, #dc2626, #b91c1c);
          box-shadow: 0 4px 20px rgba(220, 38, 38, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .control-btn.off:hover {
          box-shadow: 0 8px 30px rgba(220, 38, 38, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .control-btn.sharing {
          background: linear-gradient(145deg, #10b981, #059669);
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          animation: pulse-glow 2s infinite;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 4px 20px rgba(16, 185, 129, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
          50% { box-shadow: 0 4px 30px rgba(16, 185, 129, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
        }

        .control-btn.whiteboard-active {
          background: linear-gradient(145deg, #8b5cf6, #7c3aed);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          animation: pulse-glow-purple 2s infinite;
        }

        @keyframes pulse-glow-purple {
          0%, 100% { box-shadow: 0 4px 20px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2); }
          50% { box-shadow: 0 4px 30px rgba(139, 92, 246, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.3); }
        }

        .control-btn.chat-active {
          background: linear-gradient(145deg, #3b82f6, #2563eb);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .control-btn.materials-active {
          background: linear-gradient(145deg, #f59e0b, #d97706);
          box-shadow: 0 4px 20px rgba(245, 158, 11, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .control-btn.leave-btn {
          background: linear-gradient(145deg, #ef4444, #dc2626);
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .control-btn.leave-btn:hover {
          box-shadow: 0 8px 30px rgba(239, 68, 68, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.2);
          background: linear-gradient(145deg, #f87171, #ef4444);
        }

        .control-btn svg {
          width: 28px;
          height: 28px;
        }

        .notification-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          background: linear-gradient(145deg, #f43f5e, #e11d48);
          border-radius: 50%;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(244, 63, 94, 0.5);
        }

        @media (max-width: 768px) {
          .room-sidebar.open {
            position: absolute;
            inset: 0;
            width: 100%;
            z-index: 10;
          }

          .control-btn {
            width: 64px;
            height: 70px;
          }

          .btn-label {
            font-size: 9px;
          }

          .room-controls {
            gap: 8px;
            padding: 12px 16px;
          }

          .controls-divider {
            height: 40px;
            margin: 0 4px;
          }

          .local-video-container.pip {
            width: 120px;
            height: 90px;
            bottom: 100px;
            right: 12px;
          }

          .room-info h2 {
            font-size: 16px;
          }

          .live-badge {
            padding: 4px 10px;
            font-size: 10px;
          }

          .participant-count {
            display: none;
          }
        }

        /* Whiteboard Styles */
        .whiteboard-container {
          position: absolute;
          inset: 20px;
          display: flex;
          flex-direction: column;
          background: #0a0a1a;
          border-radius: 16px;
          overflow: hidden;
        }

        .whiteboard-canvas {
          flex: 1;
          width: 100%;
          cursor: crosshair;
          touch-action: none;
        }

        .whiteboard-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
        }

        .wb-tool {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .wb-tool:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .wb-tool.active {
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .wb-tool svg {
          width: 22px;
          height: 22px;
        }

        .wb-tool.wb-clear:hover {
          background: #ef4444;
        }

        .wb-divider {
          width: 1px;
          height: 30px;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 4px;
        }

        .wb-color-picker {
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          background: transparent;
        }

        .wb-color-picker::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .wb-color-picker::-webkit-color-swatch {
          border-radius: 8px;
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .wb-brush-size {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-size: 13px;
        }

        .wb-brush-size input[type="range"] {
          width: 80px;
          height: 6px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          cursor: pointer;
        }

        .wb-brush-size input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }

        .whiteboard-indicator {
          position: absolute;
          top: 20px;
          left: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(102, 126, 234, 0.9);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
        }

        .whiteboard-indicator svg {
          width: 18px;
          height: 18px;
        }

        @media (max-width: 768px) {
          .whiteboard-toolbar {
            flex-wrap: wrap;
            gap: 6px;
            padding: 10px;
          }
          
          .wb-tool {
            width: 40px;
            height: 40px;
          }
          
          .wb-brush-size input[type="range"] {
            width: 60px;
          }
        }
      `}</style>
    </div>
  );
}

export default VideoRoom;
