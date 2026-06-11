// ============================================
// MODERN LIVE CLASSROOM — VIDEO ROOM v2
// Features: Video Grid, Transcription, Translation,
// Contact Registration, Chat, Whiteboard, Screen Share
// ============================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  joinChannel, leaveChannel,
  toggleMic, toggleCamera,
  startScreenShare, stopScreenShare,
  destroyAgoraClient, getLocalStream
} from './webrtcClient';
import { joinSignalingRoom } from './signaling';
import { fetchContacts, saveContacts } from './supabase';



const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VideoRoom({ user, onLeave }) {
  // ==================== ROOM STATE ====================
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hashRoom = window.location.hash.replace('#', '').replace('?room=', '');
    return params.get('room') || (hashRoom.startsWith('room-') ? hashRoom : 'room-' + Math.floor(100000 + Math.random() * 900000));
  });
  const displayName = user?.name || 'Guest';
  const [stage, setStage] = useState('connecting'); // connecting | live | error
  const [errorMsg, setErrorMsg] = useState(null);
  const [connectionTime, setConnectionTime] = useState(null);
  const localUidRef = useRef(null);
  const joinedRef = useRef(false);

  // ==================== MEDIA STATE ====================
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const nativeStreamRef = useRef(null);

  // ==================== PARTICIPANTS ====================
  const [participants, setParticipants] = useState([]);
  const [activeSpeakerUid, setActiveSpeakerUid] = useState(null);

  // ==================== LAYOUT MODE ====================
  const [layoutMode, setLayoutMode] = useState('speaker'); // 'grid' | 'speaker' | 'spotlight'
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  // ==================== PER-TILE VIDEO REFS (avoids sharing one ref across tiles) ====================
  // We attach stream directly in each ref callback so it's always in sync

  // ==================== ACTIVE SPEAKER DETECTION ====================
  useEffect(() => {
    if (layoutMode !== 'speaker') return;
    const interval = setInterval(() => {
      const stream = getLocalStream();
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].enabled) {
          setActiveSpeakerUid(localUidRef.current);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [layoutMode]);

  // ==================== PANELS ====================
  const [activePanel, setActivePanel] = useState(null); // null | 'chat' | 'people' | 'transcript' | 'translate' | 'contacts' | 'whiteboard'

  // ==================== CHAT ====================
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);
  const signalingRef = useRef(null);
  const chatScrollRef = useRef(null);

  // ==================== TRANSCRIPTION ====================
  const [transcripts, setTranscripts] = useState([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptLang, setTranscriptLang] = useState('en-US');
  const recognitionRef = useRef(null);
  const transcriptScrollRef = useRef(null);

  // ==================== TRANSLATION ====================
  const [translations, setTranslations] = useState([]);
  const [translateFrom, setTranslateFrom] = useState('en');
  const [translateTo, setTranslateTo] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateQueue, setTranslateQueue] = useState([]);
  const translateLock = useRef(false);

  // ==================== CONTACTS ====================
  const [appContacts, setAppContacts] = useState([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerTarget, setRegisterTarget] = useState(null);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', role: 'Student', phone: '', subject: '' });

  // ==================== WHITEBOARD ====================
  const canvasRef = useRef(null);
  const [wbStrokes, setWbStrokes] = useState([]); // all strokes drawn by anyone
  const wbCurrentStroke = useRef(null); // stroke being drawn right now
  const [wbTool, setWbTool] = useState('pen'); // 'pen' | 'eraser'
  const [wbColor, setWbColor] = useState('#ffffff');
  const [wbSize, setWbSize] = useState(3);
  const wbCanvasRef = useRef(null); // ref to canvas for direct drawing

  // Draw all strokes onto a canvas context
  const redrawCanvas = useCallback((strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#1a1a2e' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.size * 3 : stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // When strokes change (new one received), redraw
  useEffect(() => {
    redrawCanvas(wbStrokes);
  }, [wbStrokes, redrawCanvas]);

  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const wbStart = (e) => {
    e.preventDefault();
    const p = getCanvasPos(e);
    wbCurrentStroke.current = {
      userId: localUidRef.current,
      color: wbColor,
      size: wbSize,
      tool: wbTool,
      points: [p]
    };
  };

  const wbMove = (e) => {
    e.preventDefault();
    if (!wbCurrentStroke.current) return;
    const p = getCanvasPos(e);
    wbCurrentStroke.current.points.push(p);
    // Live preview on canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pts = wbCurrentStroke.current.points;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = wbTool === 'eraser' ? '#1a1a2e' : wbColor;
    ctx.lineWidth = wbTool === 'eraser' ? wbSize * 3 : wbSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const wbEnd = (e) => {
    e.preventDefault();
    if (!wbCurrentStroke.current || wbCurrentStroke.current.points.length < 2) {
      wbCurrentStroke.current = null;
      return;
    }
    const completed = wbCurrentStroke.current;
    wbCurrentStroke.current = null;

    // Add to local strokes
    setWbStrokes(prev => {
      const next = [...prev, completed];
      return next;
    });

    // Broadcast to all participants
    if (signalingRef.current) {
      signalingRef.current.send(JSON.stringify({
        type: 'wb-stroke',
        stroke: completed,
        roomId
      }));
    }
  };


  const wbClearAll = () => {
    setWbStrokes([]);
    if (signalingRef.current) {
      signalingRef.current.send(JSON.stringify({ type: 'wb-clear', userId: localUidRef.current, roomId }));
    }
  };

  const wbColorPresets = ['#ffffff', '#ff4444', '#44ff44', '#4488ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8800'];

  // ==================== AUTO JOIN ====================
  useEffect(() => {
    handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== LOAD APP CONTACTS ====================
  useEffect(() => {
    fetchContacts().then(c => {
      setAppContacts(c || []);
      setContactsLoaded(true);
    }).catch(() => {
      setContactsLoaded(true);
    });
  }, []);

  // ==================== JOIN ROOM ====================
  const handleJoin = useCallback(async () => {
    if (!displayName.trim()) return;
    setStage('connecting');

    try {
      const uid = Math.floor(10000 + Math.random() * 90000);
      localUidRef.current = uid;

      await joinChannel(null, null, roomId, uid, {
        userName: displayName.trim(),
        isHost: true,
        onRemoteUser: (peerUid, info) => {
          setParticipants(prev => {
            const exists = prev.find(p => p.uid === peerUid);
            if (exists) return prev;
            return [...prev, {
              uid: peerUid,
              name: info?.name || 'User ' + String(peerUid).slice(-3),
              hasVideo: true,
              isHost: false,
            }];
          });
        },
        onRemoteTrack: (peerUid, stream, track) => {
          setParticipants(prev => prev.map(p =>
            p.uid === peerUid
              ? { ...p, hasVideo: track.kind === 'video' ? true : p.hasVideo, remoteStream: stream }
              : p
          ));
        },
        onRemoteLeave: (peerUid) => {
          setParticipants(prev => prev.filter(p => p.uid !== peerUid));
        },
      });

      joinedRef.current = true;
      setConnectionTime(new Date());
      setStage('live');

      setParticipants(prev => [
        { uid, name: displayName.trim(), hasVideo: camOn, isHost: true },
        ...prev
      ]);

      signalingRef.current = joinSignalingRoom(roomId, uid, displayName.trim(), user?.role || 'guest', {
        onmessage: (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'chat') {
            setMessages(prev => [...prev, { ...data, id: Date.now() + Math.random() }]);
            if (activePanel !== 'chat') setUnreadChat(u => u + 1);
          }
          if (data.type === 'wb-stroke' && data.stroke && data.stroke.userId !== uid) {
            setWbStrokes(prev => [...prev, data.stroke]);
          }
          if (data.type === 'wb-clear' && data.userId !== uid) {
            setWbStrokes([]);
          }
        }
      });

    } catch (err) {
      setErrorMsg('Failed to join room: ' + (err.message || 'Unknown error'));
      setStage('error');
    }
  }, [roomId, displayName, camOn, user, activePanel]);

  // ==================== AUTO SCROLL ====================
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    if (transcriptScrollRef.current) transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
  }, [transcripts]);
  useEffect(() => { if (activePanel === 'chat') setUnreadChat(0); }, [activePanel]);

  // ==================== MEDIA CONTROLS ====================
  const handleMic = useCallback(async () => {
    try {
      const enabled = await toggleMic();
      if (nativeStreamRef.current) nativeStreamRef.current.getAudioTracks().forEach(t => { t.enabled = enabled; });
      setMicOn(enabled);
    } catch (e) {}
  }, []);

  const handleCam = useCallback(async () => {
    try {
      const enabled = await toggleCamera();
      if (nativeStreamRef.current) nativeStreamRef.current.getVideoTracks().forEach(t => { t.enabled = enabled; });
      setCamOn(enabled);
      setParticipants(prev => prev.map(p => p.isHost ? { ...p, hasVideo: enabled } : p));
    } catch (e) {}
  }, []);

  const handleScreen = useCallback(async () => {
    if (screenOn) {
      await stopScreenShare();
      setScreenOn(false);
    } else {
      try {
        await startScreenShare(null, null, roomId, localUidRef.current);
        setScreenOn(true);
      } catch (e) { setScreenOn(false); }
    }
  }, [screenOn, roomId]);

  // ==================== CHAT ====================
  const sendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;
    const msg = { type: 'chat', id: Date.now() + Math.random(), userId: localUidRef.current, userName: displayName, text, time: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    if (signalingRef.current) signalingRef.current.send(JSON.stringify(msg));
    setChatInput('');
  }, [chatInput, displayName]);

  // ==================== TRANSCRIPTION ====================
  const startTranscription = useCallback(() => {
    if (!SpeechRecognition) { alert('Speech recognition is not supported in this browser.'); return; }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = transcriptLang;

    rec.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final.trim()) {
        const entry = { id: Date.now(), text: final.trim(), speaker: displayName, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), lang: transcriptLang };
        setTranscripts(prev => [...prev, entry]);
        setTranslateQueue(prev => [...prev, entry]);
      }
    };

    rec.onerror = () => { setIsTranscribing(false); };
    rec.onend = () => { if (isTranscribing) rec.start(); };

    recognitionRef.current = rec;
    rec.start();
    setIsTranscribing(true);
  }, [transcriptLang, displayName, isTranscribing]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsTranscribing(false);
  }, []);

  // ==================== TRANSLATION ====================
  useEffect(() => {
    async function processQueue() {
      if (translateLock.current || translateQueue.length === 0) return;
      translateLock.current = true;
      const item = translateQueue[0];
      try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(item.text)}&langpair=${translateFrom}|${translateTo}`);
        const data = await res.json();
        const translated = data?.responseData?.translatedText || item.text;
        setTranslations(prev => [...prev, { ...item, translated, to: translateTo }]);
        setTranslateQueue(prev => prev.slice(1));
      } catch (e) {
        setTranslations(prev => [...prev, { ...item, translated: '[Translation failed]', to: translateTo }]);
        setTranslateQueue(prev => prev.slice(1));
      }
      translateLock.current = false;
    }
    processQueue();
  }, [translateQueue, translateFrom, translateTo]);

  // ==================== CONTACTS INTEGRATION ====================
  const unknownParticipants = participants.filter(p => !p.isHost && !appContacts.some(c => c.name === p.name || c.email === p.name));

  const openRegisterModal = (participant) => {
    setRegisterTarget(participant);
    setRegisterForm({ name: participant.name || '', email: '', role: 'Student', phone: '', subject: '' });
    setShowRegisterModal(true);
  };

  const confirmRegister = () => {
    if (!registerForm.name.trim() || !registerForm.email.trim()) return;
    const newContact = {
      id: Date.now(),
      name: registerForm.name.trim(),
      role: registerForm.role,
      email: registerForm.email.trim(),
      phone: registerForm.phone.trim() || '',
      subject: registerForm.subject.trim() || '',
      avatar: registerForm.role === 'Teacher' ? '👩‍🏫' : registerForm.role === 'Student' ? '👤' : '👨',
      status: 'active',
      lastActive: 'Today'
    };
    const updated = [newContact, ...appContacts];
    setAppContacts(updated);
    saveContacts(updated).catch(() => {});
    setShowRegisterModal(false);
    setRegisterTarget(null);
  };

  const inviteContact = (contact) => {
    const msg = {
      type: 'chat', id: Date.now() + Math.random(),
      userId: localUidRef.current, userName: 'System',
      text: `📩 ${displayName} invited ${contact.name} to join the room.`,
      time: new Date().toISOString()
    };
    setMessages(prev => [...prev, msg]);
    if (signalingRef.current) signalingRef.current.send(JSON.stringify(msg));
  };

  // ==================== LEAVE ====================
  const handleLeave = useCallback(async () => {
    stopTranscription();
    if (nativeStreamRef.current) { nativeStreamRef.current.getTracks().forEach(t => t.stop()); nativeStreamRef.current = null; }
    if (signalingRef.current) { signalingRef.current.close(); signalingRef.current = null; }
    try { await destroyAgoraClient(); } catch (e) {}
    joinedRef.current = false;
    if (onLeave) onLeave();
  }, [onLeave, stopTranscription]);

  // ==================== RENDER HELPERS ====================
  const togglePanel = (name) => setActivePanel(p => p === name ? null : name);

  const langOptions = [
    { code: 'en-US', label: 'English' },
    { code: 'es-ES', label: 'Spanish' },
    { code: 'fr-FR', label: 'French' },
    { code: 'de-DE', label: 'German' },
    { code: 'it-IT', label: 'Italian' },
    { code: 'pt-BR', label: 'Portuguese' },
    { code: 'zh-CN', label: 'Chinese' },
    { code: 'ja-JP', label: 'Japanese' },
    { code: 'ko-KR', label: 'Korean' },
    { code: 'ar-SA', label: 'Arabic' },
    { code: 'ru-RU', label: 'Russian' },
  ];

  const translateLangs = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'ar', label: 'Arabic' },
    { code: 'ru', label: 'Russian' },
  ];

  // ==================== CONNECTING / ERROR ====================
  if (stage === 'connecting') {
    return (
      <div className="vr-overlay">
        <div className="vr-ring-dots" />
        <p>Joining room <strong>{roomId}</strong>...</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="vr-overlay">
        <div className="vr-guest-ico">⚠️</div>
        <h3>Connection Failed</h3>
        <p>{errorMsg}</p>
        <button onClick={() => { setErrorMsg(null); setStage('connecting'); handleJoin(); }} className="vr-guest-join">Try Again</button>
        <button onClick={handleLeave} className="vr-guest-cancel">Exit</button>
      </div>
    );
  }

  // ==================== LIVE ROOM ====================
  const duration = connectionTime ? Math.floor((Date.now() - connectionTime.getTime()) / 1000) : 0;
  const durText = `${Math.floor(duration / 60)}m ${duration % 60}s`;

  return (
    <div className="vroom">
      {/* TOP BAR */}
      <div className="vr-top">
        <div className="vr-top-left">
          <div className="vr-top-btn">
            <span className="vr-top-dot" /> LIVE
          </div>
          <span className="vr-top-title">Room: {roomId}</span>
          <span className="vr-top-timer">⏱ {durText}</span>
        </div>
        <div className="vr-top-right">
          <button className="vr-top-btn" onClick={() => { navigator.clipboard.writeText(window.location.href + '?room=' + roomId); }} title="Copy room link">🔗 Copy Link</button>
          <span className="vr-top-title">👥 {participants.length}</span>
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="vr-body">
        {/* VIDEO GRID */}
        <div className="vr-video-zone">
          {/* LAYOUT TOGGLE */}
          <div className="vr-layout-wrap" style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}>
            <button className="vr-layout-btn" onClick={() => setShowLayoutMenu(m => !m)}>
              {layoutMode === 'grid' ? '⊞ Grid' : layoutMode === 'speaker' ? '🎤 Speaker' : '⭐ Spotlight'}
            </button>
            {showLayoutMenu && (
              <div className="vr-layout-dropdown">
                {[
                  { key: 'grid', label: '⊞ Grid', desc: 'All visible' },
                  { key: 'speaker', label: '🎤 Speaker', desc: 'Active speaker center' },
                  { key: 'spotlight', label: '⭐ Spotlight', desc: 'Pin one person' },
                ].map(m => (
                  <div key={m.key}
                    className={'vr-layout-item ' + (layoutMode === m.key ? 'vr-layout-active' : '')}
                    onClick={() => { setLayoutMode(m.key); setShowLayoutMenu(false); }}
                  >
                    {m.label} <span style={{ color: '#8e8e93', fontSize: 10, marginLeft: 'auto' }}>{m.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GRID LAYOUT */}
          {layoutMode === 'grid' && (
            <div className="vr-grid-wrap">
              <div className={'vr-grid ' + (participants.length <= 1 ? '' : participants.length === 2 ? 'vr-grid-2' : participants.length === 3 ? 'vr-grid-3-main' : participants.length === 4 ? 'vr-grid-4' : 'vr-grid-many')}>
                {/* LOCAL */}
                <div className={'vr-tile ' + (activeSpeakerUid === localUidRef.current ? 'vr-tile-spk' : '') + (!camOn ? 'vr-tile-bg' : '')}>
                  {camOn && <video key="local-grid" ref={el => { if (el) { el.srcObject = getLocalStream(); } }} autoPlay muted playsInline />}
                  {!camOn && <div className="vr-tile-bg"><div className="vr-tile-emoji">{(displayName || 'You')[0].toUpperCase()}</div></div>}
                  <div className="vr-tile-label">
                    <div className="vr-tile-label-name">{displayName} (You){screenOn && ' · Sharing'}</div>
                    <div className="vr-tile-label-mic">{!micOn && '🔇'}</div>
                  </div>
                </div>
                {/* REMOTE */}
                {participants.filter(p => !p.isHost).map(p => (
                  <div key={p.uid} className={'vr-tile ' + (activeSpeakerUid === p.uid ? 'vr-tile-spk' : '') + (!p.hasVideo ? 'vr-tile-bg' : '')}>
                    {p.remoteStream && <RemoteVideo stream={p.remoteStream} />}
                    {!p.hasVideo && <div className="vr-tile-bg"><div className="vr-tile-emoji">{(p.name || 'G')[0].toUpperCase()}</div></div>}
                    <div className="vr-tile-label">
                      <div className="vr-tile-label-name">{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPEAKER LAYOUT — active speaker big center */}
          {layoutMode === 'speaker' && (
            <div className="vr-speaker-wrap">
              <div className="vr-speaker-main">
                {(() => {
                  const speaker = participants.find(p => p.uid === activeSpeakerUid) ||
                    participants.find(p => !p.isHost) ||
                    participants.find(p => p.isHost);
                  if (!speaker) return null;
                  return (
                    <div className={'vr-tile vr-tile-main ' + (activeSpeakerUid === speaker.uid ? 'vr-tile-spk' : '')}>
                      {speaker.isHost ? (
                        <video key="local-speaker-main" ref={el => { if (el) { el.srcObject = getLocalStream(); } }} autoPlay muted playsInline />
                      ) : speaker.remoteStream ? (
                        <RemoteVideo stream={speaker.remoteStream} />
                      ) : null}
                      <div className="vr-tile-label">
                        <div className="vr-tile-label-name">{speaker.name}{speaker.isHost ? ' (You)' : ''}{!speaker.hasVideo && ' 📷'}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* Strip of all participants */}
              <div className="vr-speaker-strip">
                {participants.map((p, i) => (
                  <div key={p.uid}
                    className={'vr-tile vr-tile-thumb ' + (activeSpeakerUid === p.uid ? 'vr-tile-spk' : '')}
                    onClick={() => setActiveSpeakerUid(p.uid)}
                    title={p.name}
                  >
                    {p.isHost ? (
                      <video key={'local-strip-' + i} ref={el => { if (el) { el.srcObject = getLocalStream(); } }} autoPlay muted playsInline />
                    ) : p.remoteStream ? (
                      <RemoteVideo stream={p.remoteStream} />
                    ) : null}
                    {!p.hasVideo && p.isHost && <div className="vr-tile-bg"><div className="vr-tile-emoji" style={{ fontSize: '28px' }}>{(p.name || '?')[0].toUpperCase()}</div></div>}
                    <div className="vr-tile-label">
                      <div className="vr-tile-label-name">{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPOTLIGHT LAYOUT — pinned + thumbnail strip */}
          {layoutMode === 'spotlight' && (
            <div className="vr-spotlight-wrap">
              <div className="vr-spotlight-main">
                {(() => {
                  const pinned = participants.find(p => p.uid === activeSpeakerUid) || participants.find(p => !p.isHost) || participants.find(p => p.isHost);
                  if (!pinned) return null;
                  return (
                    <div className={'vr-tile vr-tile-main ' + (!pinned.hasVideo && !pinned.isHost ? 'vr-tile-bg' : '')}>
                      {pinned.isHost ? (
                        <video key="local-spotlight-main" ref={el => { if (el) { el.srcObject = getLocalStream(); } }} autoPlay muted playsInline />
                      ) : pinned.remoteStream ? (
                        <RemoteVideo stream={pinned.remoteStream} />
                      ) : null}
                      <div className="vr-tile-label">
                        <div className="vr-tile-label-name">{pinned.name}{pinned.isHost ? ' (You)' : ''}{!pinned.hasVideo && ' 📷'}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="vr-spotlight-strip">
                {participants.map((p, i) => (
                  <div key={p.uid}
                    className={'vr-tile vr-tile-thumb ' + (activeSpeakerUid === p.uid ? 'vr-tile-spk' : '')}
                    onClick={() => setActiveSpeakerUid(p.uid)}
                  >
                    {p.isHost ? (
                      <video key={'local-spot-' + i} ref={el => { if (el) { el.srcObject = getLocalStream(); } }} autoPlay muted playsInline />
                    ) : p.remoteStream ? (
                      <RemoteVideo stream={p.remoteStream} />
                    ) : null}
                    {!p.hasVideo && p.isHost && <div className="vr-tile-bg"><div className="vr-tile-emoji" style={{ fontSize: '20px' }}>{(p.name || '?')[0].toUpperCase()}</div></div>}
                    <div className="vr-tile-label">
                      <div className="vr-tile-label-name">{p.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDE PANEL */}
        {activePanel && (
          <div className="vr-panel">
            {/* CHAT */}
            {activePanel === 'chat' && (
              <div className="vr-chat-body">
                <div className="vr-panel-hd"><div className="vr-panel-ttl">Chat</div><button className="vr-panel-x" onClick={() => setActivePanel(null)}>✕</button></div>
                <div className="vr-chat-msgs" ref={chatScrollRef}>
                  {messages.map(m => (
                    <div key={m.id} className={'vr-msg ' + (m.userId === localUidRef.current ? 'vr-msg-me' : '')}>
                      <span className="vr-msg-from">{m.userName}</span>
                      <span className="vr-msg-bub">{m.text}</span>
                      <span className="vr-msg-ts">{new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                  {messages.length === 0 && <div className="vr-no-cts">No messages yet</div>}
                </div>
                <div className="vr-chat-inp">
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Type a message..." />
                  <button onClick={sendChat}>➤</button>
                </div>
              </div>
            )}

            {/* PEOPLE */}
            {activePanel === 'people' && (
              <div className="vr-mem-list">
                <div className="vr-panel-hd"><div className="vr-panel-ttl">Participants ({participants.length})</div><button className="vr-panel-x" onClick={() => setActivePanel(null)}>✕</button></div>
                <div className="vr-mem-list-inner">
                  {participants.map(p => (
                    <div key={p.uid} className="vr-mem-row">
                      <div className="vr-mem-av">{p.name[0]?.toUpperCase()}</div>
                      <div className="vr-mem-info">
                        <span className="vr-mem-name">{p.name}</span>
                      </div>
                      {!p.isHost && !appContacts.some(c => c.name === p.name) && (
                        <button className="vr-mem-call" onClick={() => openRegisterModal(p)} title="Add to contacts">+</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRANSCRIPTION */}
            {activePanel === 'transcript' && (
              <div className="vr-tran-body">
                <div className="vr-panel-hd"><div className="vr-panel-ttl">Transcription</div>
                  <div className="vr-panel-tools">
                    <select value={transcriptLang} onChange={e => setTranscriptLang(e.target.value)}>
                      {langOptions.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                    <button onClick={() => isTranscribing ? stopTranscription() : startTranscription()} className={isTranscribing ? 'vr-bar-act' : ''}>
                      {isTranscribing ? '⏹ Stop' : '🎙 Start'}
                    </button>
                  </div>
                  <button onClick={() => setActivePanel(null)}>✕</button>
                </div>
                <div className="vr-panel-scroll" ref={transcriptScrollRef}>
                  {transcripts.map(t => (
                    <div key={t.id} className="vr-tran-line">
                      <span className="vr-tran-spk">{t.speaker}</span>
                      <span className="vr-tran-txt">{t.text}</span>
                      <span className="vr-tran-tm">{t.time}</span>
                    </div>
                  ))}
                  {transcripts.length === 0 && <div className="vr-no-cts">Transcription will appear here</div>}
                </div>
              </div>
            )}

            {/* TRANSLATION */}
            {activePanel === 'translate' && (
              <div className="vr-panel-inner">
                <div className="vr-panel-header">
                  <h4>Translation</h4>
                  <div className="vr-panel-tools">
                    <select value={translateFrom} onChange={e => setTranslateFrom(e.target.value)}>{translateLangs.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
                    <span>→</span>
                    <select value={translateTo} onChange={e => setTranslateTo(e.target.value)}>{translateLangs.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}</select>
                  </div>
                  <button onClick={() => setActivePanel(null)}>✕</button>
                </div>
                <div className="vr-panel-scroll">
                  {translations.map((t, i) => (
                    <div key={i} className="vr-ai-item">
                      <div className="vr-ai-text">{t.text}</div>
                      <div className="vr-tran-tm">↓</div>
                      <div className="vr-tran-txt">{t.translated}</div>
                      <div className="vr-tran-tm">{t.speaker} · {t.time}</div>
                    </div>
                  ))}
                  {translations.length === 0 && <div className="vr-no-cts">Start transcription to see translations</div>}
                </div>
              </div>
            )}

            {/* CONTACTS / INVITE */}
            {activePanel === 'contacts' && (
              <div className="vr-panel-inner">
                <div className="vr-panel-header"><h4>Contacts & Invite</h4><button onClick={() => setActivePanel(null)}>✕</button></div>
                <div className="vr-panel-scroll">
                  {!contactsLoaded && <div className="vr-no-cts">Loading contacts...</div>}
                  {contactsLoaded && appContacts.length === 0 && <div className="vr-no-cts">No contacts found</div>}
                  {appContacts.map(c => (
                    <div key={c.id} className="vr-inv-row">
                      <div className="vr-mem-av">{c.avatar || '👤'}</div>
                      <div className="vr-mem-info">
                        <span className="vr-mem-name">{c.name}</span>
                        <span className="vr-mem-sub">{c.role} · {c.email}</span>
                      </div>
                      <button className="vr-inv-cpy" onClick={() => inviteContact(c)}>Invite</button>
                    </div>
                  ))}
                  <div className="vr-mem-div">In Room</div>
                  {participants.filter(p => !p.isHost).map(p => (
                    <div key={p.uid} className="vr-inv-row">
                      <div className="vr-mem-av">{(p.name || '?')[0].toUpperCase()}</div>
                      <div className="vr-mem-info">
                        <span className="vr-mem-name">{p.name}</span>
                        <span className="vr-mem-sub">{appContacts.some(c => c.name === p.name) ? '✓ In contacts' : 'Not registered'}</span>
                      </div>
                      {!appContacts.some(c => c.name === p.name) && (
                        <button className="vr-mem-call" onClick={() => openRegisterModal(p)}>+</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WHITEBOARD */}
            {activePanel === 'whiteboard' && (
              <div className="vr-panel-inner">
                <div className="vr-panel-header">
                  <h4>🎨 Whiteboard</h4>
                  <button onClick={() => setActivePanel(null)}>✕</button>
                </div>
                <div className="wb-toolbar">
                  <div className="wb-tool-group">
                    <button className={'wb-btn ' + (wbTool === 'pen' ? 'wb-btn-active' : '')}
                      onClick={() => setWbTool('pen')} title="Pen">✏️ Pen</button>
                    <button className={'wb-btn ' + (wbTool === 'eraser' ? 'wb-btn-active' : '')}
                      onClick={() => setWbTool('eraser')} title="Eraser">🧹 Eraser</button>
                  </div>
                  <div className="wb-colors">
                    {wbColorPresets.map(c => (
                      <button key={c} className={'wb-color-btn ' + (wbColor === c && wbTool === 'pen' ? 'wb-color-active' : '')}
                        style={{ background: c }}
                        onClick={() => { setWbColor(c); setWbTool('pen'); }} />
                    ))}
                    <input type="color" value={wbColor} onChange={e => { setWbColor(e.target.value); setWbTool('pen'); }}
                      className="wb-color-picker" title="Custom color" />
                  </div>
                  <div className="wb-sizes">
                    {[2, 4, 8, 16].map(s => (
                      <button key={s} className={'wb-size-btn ' + (wbSize === s ? 'wb-size-active' : '')}
                        onClick={() => setWbSize(s)}>
                        <span style={{ width: s * 2, height: s * 2, borderRadius: '50%', background: '#fff', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                  <button className="wb-btn wb-clear-btn" onClick={wbClearAll}>🗑️ Clear All</button>
                </div>
                <canvas ref={canvasRef} width={600} height={400} className="wb-canvas"
                  onMouseDown={wbStart} onMouseMove={wbMove} onMouseUp={wbEnd} onMouseLeave={wbEnd}
                  onTouchStart={wbStart} onTouchMove={wbMove} onTouchEnd={wbEnd} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="vr-bar-wrap">
        <button onClick={handleMic} className={'vr-bar-btn ' + (!micOn ? 'vr-bar-btn-off' : '')} title="Toggle mic">
          <span className="vr-bar-btn-icon">{micOn ? '🎤' : '🔇'}</span>
          <span className="vr-bar-btn-label">{micOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <button onClick={handleCam} className={'vr-bar-btn ' + (!camOn ? 'vr-bar-btn-off' : '')} title="Toggle camera">
          <span className="vr-bar-btn-icon">{camOn ? '📹' : '📷'}</span>
          <span className="vr-bar-btn-label">{camOn ? 'Stop Video' : 'Start Video'}</span>
        </button>
        <button onClick={handleScreen} className={'vr-bar-btn ' + (screenOn ? 'vr-bar-btn-active' : '')} title="Share screen">
          <span className="vr-bar-btn-icon">🖥️</span>
          <span className="vr-bar-btn-label">{screenOn ? 'Stop Share' : 'Share'}</span>
        </button>
        <button onClick={() => togglePanel('chat')} className={'vr-bar-btn ' + (activePanel === 'chat' ? 'vr-bar-btn-active' : '')} title="Chat">
          <span className="vr-bar-btn-icon">💬</span>
          <span className="vr-bar-btn-label">Chat{unreadChat > 0 ? ` (${unreadChat})` : ''}</span>
        </button>
        <button onClick={() => togglePanel('people')} className={'vr-bar-btn ' + (activePanel === 'people' ? 'vr-bar-btn-active' : '')} title="Participants">
          <span className="vr-bar-btn-icon">👥</span>
          <span className="vr-bar-btn-label">People</span>
        </button>
        <button onClick={() => togglePanel('transcript')} className={'vr-bar-btn ' + (activePanel === 'transcript' ? 'vr-bar-btn-active' : '') + ' ' + (isTranscribing ? 'vr-bar-btn-pulse' : '')} title="Transcription">
          <span className="vr-bar-btn-icon">📝</span>
          <span className="vr-bar-btn-label">{isTranscribing ? 'Listening...' : 'Transcript'}</span>
        </button>
        <button onClick={() => togglePanel('translate')} className={'vr-bar-btn ' + (activePanel === 'translate' ? 'vr-bar-btn-active' : '')} title="Translation">
          <span className="vr-bar-btn-icon">🌐</span>
          <span className="vr-bar-btn-label">Translate</span>
        </button>
        <button onClick={() => togglePanel('contacts')} className={'vr-bar-btn ' + (activePanel === 'contacts' ? 'vr-bar-btn-active' : '')} title="Contacts">
          <span className="vr-bar-btn-icon">📇</span>
          <span className="vr-bar-btn-label">Contacts</span>
        </button>
        <button onClick={() => togglePanel('whiteboard')} className={'vr-bar-btn ' + (activePanel === 'whiteboard' ? 'vr-bar-btn-active' : '')} title="Whiteboard">
          <span className="vr-bar-btn-icon">🎨</span>
          <span className="vr-bar-btn-label">Board</span>
        </button>
        <div className="vr-bar-div" />
        <button onClick={handleLeave} className="vr-bar-btn vr-bar-end" title="Leave room">
          <span className="vr-bar-btn-icon">📴</span>
          <span className="vr-bar-btn-label">Leave</span>
        </button>
      </div>

      {/* REGISTER CONTACT MODAL */}
      {showRegisterModal && (
        <div className="vr-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="vr-guest-card" onClick={e => e.stopPropagation()}>
            <h4>Register Contact</h4>
            <p>Add <strong>{registerTarget?.name}</strong> to your app contacts.</p>
            <input value={registerForm.name} onChange={e => setRegisterForm({ ...registerForm, name: e.target.value })} placeholder="Full name" />
            <input value={registerForm.email} onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="Email" />
            <input value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="Phone (optional)" />
            <select value={registerForm.role} onChange={e => setRegisterForm({ ...registerForm, role: e.target.value })}>
              <option value="Student">Student</option>
              <option value="Teacher">Teacher</option>
              <option value="Parent">Parent</option>
            </select>
            <input value={registerForm.subject} onChange={e => setRegisterForm({ ...registerForm, subject: e.target.value })} placeholder="Subject (optional)" />
            <div className="vr-guest-card-actions">
              <button onClick={confirmRegister} className="vr-guest-join">Save Contact</button>
              <button onClick={() => setShowRegisterModal(false)} className="vr-guest-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== REMOTE VIDEO PLAYER ====================
function RemoteVideo({ track, stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (stream) {
      ref.current.srcObject = stream;
    } else if (track) {
      track.play(ref.current);
    }
    return () => {
      if (stream) ref.current.srcObject = null;
      else if (track) track.stop();
    };
  }, [track, stream]);
  return <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}
