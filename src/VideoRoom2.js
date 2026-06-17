// ============================================
// VideoRoom2 — Tencent Meeting Style
// WebRTC + Supabase Realtime + STT/TTS + Contacts
// ============================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  joinChannel, leaveChannel,
  toggleMic, toggleCamera,
  startScreenShare, stopScreenShare,
  destroyAgoraClient, getLocalStream,
  setupPeerMessageHandler, handleIncomingSignal
} from './webrtcClient';
import { fetchContacts, saveContacts, fetchTeachers, fetchStudents } from './supabase';
import { supabase } from './supabase';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// ============================================
// LANGUAGE OPTIONS
// ============================================
const LANG_OPTIONS = [
  { code: 'en-US', label: 'English' }, { code: 'zh-CN', label: '中文' },
  { code: 'zh-TW', label: '中文(繁)' }, { code: 'ja-JP', label: '日本語' },
  { code: 'ko-KR', label: '한국어' }, { code: 'es-ES', label: 'Español' },
  { code: 'fr-FR', label: 'Français' }, { code: 'de-DE', label: 'Deutsch' },
];

// ============================================
// TTS — speak text aloud
// ============================================
function speakText(text, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || 'en-US';
  u.rate = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.startsWith(u.lang.split('-')[0]));
  if (match) u.voice = match;
  window.speechSynthesis.speak(u);
}

// ============================================
// STT — start speech recognition
// ============================================
function startSTT(onResult, onEnd, lang) {
  if (!SpeechRecognition) return null;
  const rec = new SpeechRecognition();
  rec.lang = lang || 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) onResult(e.results[i][0].transcript);
    }
  };
  rec.onend = onEnd;
  rec.onerror = () => {};
  rec.start();
  return rec;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function VideoRoom2({ user, onLeave }) {
  const displayName = user?.name || 'Guest';
  const myRole = user?.role || 'Student';

  // ---- Room ----
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoom = urlParams.get('room');
  const [roomId, setRoomId] = useState(urlRoom || '');
  const [roomCode, setRoomCode] = useState(''); // 6-char display code
  const [joinCode, setJoinCode] = useState('');  // code entered by guest
  const [prejoinMode, setPrejoinMode] = useState(urlRoom ? 'url' : 'choose'); // 'choose' | 'host' | 'join' | 'url'

  // ---- Join stage ----
  const [stage, setStage] = useState('prejoin'); // prejoin | joining | live | error
  const [errorMsg, setErrorMsg] = useState(null);
  const localUidRef = useRef(null);
  const signalingRef = useRef(null);

  // ---- Media ----
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [streamKey, setStreamKey] = useState(0); // bump this to force re-render

  // ---- WebRTC Status ----
  const [webrtcStatus, setWebrtcStatus] = useState('checking'); // 'checking' | 'ok' | 'no-relay' | 'fallback'
  // ---- Video refs for remote streams ----
  const videoRefs = useRef({});
  // ---- Supabase Relay Fallback ----
  const [supabaseRelay, setSupabaseRelay] = useState(false);
  const [relayFrame, setRelayFrame] = useState(null); // base64 frame from remote
  const [framesReceived, setFramesReceived] = useState(0);
  const [framesSent, setFramesSent] = useState(0);
  const supabaseRelayRef = useRef(null);
  const relayCanvasRef = useRef(null);
  const relayIntervalRef = useRef(null);
  // Dedicated hidden video element for relay capture
  const captureVideoRef = useRef(null);
  // Track received frames per remote participant
  const [remoteFramesReceived, setRemoteFramesReceived] = useState({});

  // ---- Participants ----
  const [participants, setParticipants] = useState([]);
  const [activeSpeakerUid, setActiveSpeakerUid] = useState(null);

  // ---- STT ----
  const [isListening, setIsListening] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [sttLang, setSttLang] = useState('en-US');
  const sttRef = useRef(null);
  const transcriptScrollRef = useRef(null);

  // ---- TTS ----
  const [ttsLang, setTtsLang] = useState('en-US');

  // ---- Contacts ----
  const [appContacts, setAppContacts] = useState([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'Student', phone: '', subject: '' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // ---- Active panel (slide-in from right) ----
  const [activePanel, setActivePanel] = useState(null); // null | 'transcript' | 'contacts'

  // ---- Layout ----
  const [layoutMode, setLayoutMode] = useState('auto');
  const effectiveMode = layoutMode === 'auto'
    ? (participants.length <= 1 ? 'solo' : participants.length === 2 ? 'duo' : 'grid')
    : layoutMode;

  // ---- Load contacts from Supabase ----
  useEffect(() => {
    const load = async () => {
      try {
        const [contacts, teachers, students] = await Promise.all([
          fetchContacts().catch(() => []),
          fetchTeachers().catch(() => []),
          fetchStudents().catch(() => []),
        ]);
        // Merge contacts + teachers + students into one list
        const all = [
          ...contacts.map(c => ({ ...c, _src: 'contact' })),
          ...teachers.map(t => ({ id: 't_' + t.id, name: t.name, email: t.email, role: 'Teacher', phone: t.phone || '', subject: t.subject || '', avatar: '👩‍🏫', _src: 'teacher' })),
          ...students.map(s => ({ id: 's_' + s.id, name: s.name, email: s.email || '', role: 'Student', phone: '', subject: s.subject || '', avatar: '🎓', _src: 'student' })),
        ];
        setAppContacts(all);
      } catch {
        setAppContacts([]);
      }
      setContactsLoaded(true);
    };
    load();
  }, []);

  // ---- STT auto-scroll ----
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // ==================== ROOM CODE HELPERS ====================
  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleCreateRoom = () => {
    const code = generateCode();
    setRoomCode(code);
    setRoomId(code);
    setPrejoinMode('host');
  };

  const handleJoinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code || code.length < 4) return;
    setRoomId(code);
    setRoomCode(code);
    setPrejoinMode('join');
  };

  // ==================== JOIN ROOM ====================
  const handleJoin = async () => {
    if (!roomId) return;
    setStage('joining');
    try {
      const result = await joinChannel(null, null, roomId, null, {
        userName: displayName,
        onJoined: ({ roomId: rid, userId }) => {
          localUidRef.current = userId;
          const stream = getLocalStream();
          setLocalStream(stream);
          setStreamKey(k => k + 1);
          const me = {
            uid: userId, name: displayName, role: myRole,
            isHost: prejoinMode === 'host', remoteStream: null, hasVideo: true,
          };
          setParticipants([me]);
          setStage('live');
          // Start Supabase relay immediately — our reliable video path from China
          setTimeout(() => startSupabaseRelay(), 500);
        },
        onSignal: handleIncomingSignal,
        onError: (msg) => {
          setErrorMsg(msg);
          setStage('error');
        },
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to join room');
      setStage('error');
    }
  };

  // ==================== SUPABASE RELAY — PRIMARY VIDEO (TURN fallback) ====================
  // Relays video frames through Supabase Realtime broadcast
  // Supabase IS accessible from China — this is our reliable video path
  const startSupabaseRelay = useCallback(() => {
    if (supabaseRelayRef.current) return;
    setSupabaseRelay(true);
    console.log('[Relay] Starting, localStream=', localStream ? 'YES' : 'NO');

    const channelName = `videorelay:${roomId}`;
    console.log('[Relay] Channel:', channelName);
    const relayChannel = supabase.channel(channelName, { config: { broadcast: { self: false } } });

    // Receive relay frames from remote peers
    relayChannel.on('broadcast', { event: 'relay' }, (msg) => {
      const payload = msg?.payload;
      if (!payload || payload.fromUserId === localUidRef.current) return;
      console.log('[Relay] 📥 Message received from', payload.fromUserName || payload.fromUserId, 'type:', payload.type);
      if (payload.type === 'relay-frame' && payload.frame) {
        console.log('[Relay] ✅ FRAME RECEIVED from', payload.fromUserName || payload.fromUserId);
        setFramesReceived(c => c + 1);
        setRemoteFramesReceived(prev => ({
          ...prev,
          [payload.fromUserId]: (prev[payload.fromUserId] || 0) + 1
        }));
        setParticipants(prev => prev.map(p =>
          p.uid === payload.fromUserId ? { ...p, relayFrame: payload.frame, hasVideo: true } : p
        ));
      }
    });

    relayChannel.subscribe(async (status) => {
      console.log('[Relay] Channel status:', status);
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('[Relay] ❌ Channel failed to connect. Check Supabase Realtime configuration.');
      }
    });

    // Capture and send local video frames — tiny frames for reliable delivery
    let frameCount = 0;
    let sending = false;
    const sendFrame = () => {
      if (sending) return;
      const video = captureVideoRef.current;
      const canvas = relayCanvasRef.current;
      if (!video || !canvas) return;
      if (!video.srcObject || video.readyState < 2) return;

      sending = true;
      // 320x180 at quality 0.4 = ~20-30KB per frame, reliable delivery at 10fps
      canvas.width = 320; canvas.height = 180;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, 320, 180);
      canvas.toBlob((blob) => {
        if (!blob) { sending = false; return; }
        const sizeKB = Math.round(blob.size / 1024);
        console.log('[Relay] 📤 frame', ++frameCount, sizeKB + 'KB');
        setFramesSent(c => c + 1);
        const reader = new FileReader();
        reader.onloadend = () => {
          relayChannel.send({
            type: 'broadcast', event: 'relay',
            payload: { type: 'relay-frame', fromUserId: localUidRef.current, fromUserName: displayName, frame: reader.result }
          }).then(() => { sending = false; }).catch(e => { sending = false; });
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.4); // quality 0.4 = ~20-30KB per frame at 320x180
    };

    relayIntervalRef.current = setInterval(sendFrame, 100); // 10fps
    const waitForVideo = () => {
      const video = captureVideoRef.current;
      if (video && video.srcObject && video.readyState >= 2) sendFrame();
      else setTimeout(waitForVideo, 500);
    };
    setTimeout(waitForVideo, 500);
    supabaseRelayRef.current = relayChannel;
  }, [localStream, roomId, displayName]);

  const stopSupabaseRelay = useCallback(() => {
    if (relayIntervalRef.current) { clearInterval(relayIntervalRef.current); relayIntervalRef.current = null; }
    if (supabaseRelayRef.current) {
      supabase.channel(supabaseRelayRef.current.name).unsubscribe();
      supabaseRelayRef.current = null;
    }
    setSupabaseRelay(false);
  }, []);

  // ==================== ATTACH REMOTE STREAMS TO VIDEO ELEMENTS ====================
  useEffect(() => {
    participants.forEach(p => {
      if (!p.isHost && p.remoteStream) {
        const el = videoRefs.current[p.uid];
        if (el && el.srcObject !== p.remoteStream) {
          console.log(`[VideoRoom2] Attaching remote stream to video element for ${p.name}`);
          el.srcObject = p.remoteStream;
          el.play().catch(() => {});
        }
      }
    });
  }, [participants]);

  // ==================== WIRE UP CAPTURE VIDEO + AUTO-START RELAY ====================
  useEffect(() => {
    if (!localStream) return;
    console.log('[VideoRoom2] localStream ready, wiring capture video');
    if (captureVideoRef.current) {
      captureVideoRef.current.srcObject = localStream;
      captureVideoRef.current.muted = true;
      captureVideoRef.current.playsInline = true;
      captureVideoRef.current.play().catch(() => {});
    }
    // Start relay if not already started
    if (!supabaseRelayRef.current) {
      console.log('[VideoRoom2] Auto-starting Supabase relay from useEffect');
      startSupabaseRelay();
    }
  }, [localStream]);

  // ==================== PEER HANDLERS ====================
  useEffect(() => {
    setupPeerMessageHandler(
      // onSignal
      (payload) => {
        console.log(`[VideoRoom2] onSignal: type=${payload.type} from=${payload.fromUserId}`);
        if (payload.type === 'remote-stream') {
          console.log(`[VideoRoom2] Remote stream from ${payload.fromUserId}!`);
          setParticipants(prev => {
            const exists = prev.some(p => p.uid === payload.fromUserId);
            if (exists) {
              return prev.map(p =>
                p.uid === payload.fromUserId ? { ...p, remoteStream: payload.stream } : p
              );
            } else {
              // Remote stream arrived before peer-joined — add participant with stream
              console.log(`[VideoRoom2] Adding peer with remote stream (${payload.fromUserId})`);
              return [...prev, {
                uid: payload.fromUserId,
                name: payload.fromUserName || String(payload.fromUserId),
                role: 'Participant',
                isHost: false,
                remoteStream: payload.stream,
                hasVideo: true
              }];
            }
          });
          setStreamKey(k => k + 1);
          setWebrtcStatus('ok');
        } else if (payload.type === 'relay-frame') {
          // Supabase relay fallback — receive a video frame
          setRelayFrame(payload.frame);
        }
      },
      // onPeerJoined
      (uid, name) => {
        console.log(`[VideoRoom2] Peer joined: ${name}(${uid})`);
        setParticipants(prev => {
          if (prev.some(p => p.uid === uid)) return prev;
          return [...prev, { uid, name, role: 'Participant', isHost: false, remoteStream: null, hasVideo: true }];
        });
      },
      // onPeerLeft
      (uid) => {
        console.log(`[VideoRoom2] Peer left: ${uid}`);
        setParticipants(prev => prev.filter(p => p.uid !== uid));
      },
      // onError
      (msg) => { console.error(msg); }
    );

    // Listen for ICE status from webrtc.js
    const handleIceStatus = (e) => {
      const { status } = e.detail;
      setWebrtcStatus(status);
      if (status === 'no-relay') {
        console.warn('[VideoRoom2] No srflx/relay ICE candidates — switching to Supabase relay fallback');
        startSupabaseRelay();
      }
    };
    window.addEventListener('__webrtcIceStatus', handleIceStatus);
    return () => window.removeEventListener('__webrtcIceStatus', handleIceStatus);
  }, []);

  // ==================== LEAVE ====================
  const handleLeave = useCallback(async () => {
    stopSupabaseRelay();
    if (sttRef.current) { sttRef.current.stop(); sttRef.current = null; }
    setIsListening(false);
    await destroyAgoraClient();
    signalingRef.current = null;
    onLeave?.();
  }, [onLeave, stopSupabaseRelay]);

  // ==================== TOGGLE HANDLERS ====================
  const handleMic = async () => {
    const on = await toggleMic();
    setMicOn(on);
  };
  const handleCam = async () => {
    const on = await toggleCamera();
    setCamOn(on);
  };
  const handleScreen = async () => {
    if (screenOn) {
      await stopScreenShare();
      setScreenOn(false);
    } else {
      const stream = await startScreenShare();
      if (stream) setScreenOn(true);
    }
  };

  // ==================== STT ====================
  const startTranscription = () => {
    if (isListening) return;
    setIsListening(true);
    sttRef.current = startSTT(
      (text) => {
        if (!text.trim()) return;
        const line = { id: Date.now(), speaker: displayName, text: text.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setTranscripts(prev => [...prev, line]);
      },
      () => setIsListening(false),
      sttLang
    );
  };
  const stopTranscription = () => {
    if (sttRef.current) { sttRef.current.stop(); sttRef.current = null; }
    setIsListening(false);
  };

  // ==================== CONTACTS ====================
  const handleAddContact = () => {
    const { name, email, role, phone, subject } = addForm;
    if (!name.trim() || !email.trim()) return;
    const avatar = role === 'Teacher' ? '👩‍🏫' : role === 'Parent' ? '👨‍👩‍👧' : '👤';
    const newContact = { id: 'ct_' + Date.now(), name: name.trim(), email: email.trim(), role, phone: phone.trim(), subject: subject.trim(), avatar };
    const updated = [newContact, ...appContacts];
    setAppContacts(updated);
    saveContacts(updated).catch(() => {});
    setAddForm({ name: '', email: '', role: 'Student', phone: '', subject: '' });
    setShowAddForm(false);
  };

  const deleteContact = (id) => {
    const updated = appContacts.filter(c => c.id !== id);
    setAppContacts(updated);
    saveContacts(updated).catch(() => {});
    setConfirmDeleteId(null);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const filteredContacts = appContacts.filter(c =>
    !contactSearch || c.name.toLowerCase().includes(contactSearch.toLowerCase()) || (c.email || '').toLowerCase().includes(contactSearch.toLowerCase())
  );

  // ==================== RENDER ====================
  const renderTile = (p, index) => {
    let stream = p.isHost ? localStream : p.remoteStream;
    return (
      <div key={p.uid} className="vr2-tile" style={{ animationDelay: index * 0.05 + 's' }}>
        {/* Hidden canvas for Supabase relay capture */}
        <canvas ref={p.isHost ? relayCanvasRef : undefined} style={{ display: 'none' }} />
        {stream && p.hasVideo ? (
          <video
            key={`vr-${p.uid}-${streamKey}`}
            ref={el => {
              if (el && stream) {
                videoRefs.current[p.uid] = el;
                el.srcObject = stream;
                el.muted = p.isHost;
              }
            }}
            autoPlay playsInline
          />
        ) : p.relayFrame ? (
          <img
            src={p.relayFrame}
            alt={p.name}
            onLoad={() => console.log('[Tile] relayFrame IMG LOADED for', p.name)}
            onError={() => console.error('[Tile] relayFrame IMG FAILED for', p.name)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#1a1a30' }}
          />
        ) : (
          <div className="vr2-tile-avatar">
            <span>{p.name?.[0]?.toUpperCase() || '?'}</span>
          </div>
        )}
        {!p.hasVideo && (
          <div className="vr2-tile-avatar">
            <span>{p.name?.[0]?.toUpperCase() || '?'}</span>
          </div>
        )}
        <div className="vr2-tile-label">
          <span className="vr2-tile-name">{p.name}</span>
          {p.isHost && <span className="vr2-tile-badge">You</span>}
          {!p.hasVideo && <span className="vr2-tile-badge">🔇</span>}
          {p.relayFrame && !p.isHost && (
            <span className="vr2-tile-badge">📷 {remoteFramesReceived[p.uid] || 0}</span>
          )}
        </div>
      </div>
    );
  };

  // ==================== PREJOIN SCREEN ====================
  if (stage === 'prejoin' || stage === 'joining') {
    // ---- CHOOSE MODE: create or join ----
    if (prejoinMode === 'choose') {
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 20, padding: '40px 48px', textAlign: 'center', maxWidth: 420, width: '90%' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📹</div>
            <h2 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: 22, fontWeight: 700 }}>LinguaClass Video</h2>
            <p style={{ color: '#64748b', margin: '0 0 28px', fontSize: 13 }}>You are: <strong style={{ color: '#f1f5f9' }}>{displayName}</strong></p>

            <button onClick={handleCreateRoom} style={{ width: '100%', padding: '14px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 12 }}>
              🆕 Create a Room
            </button>

            <div style={{ color: '#475569', margin: '4px 0 12px', fontSize: 12 }}>— or —</div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter code"
                maxLength={8}
                style={{ flex: 1, padding: '12px 14px', background: '#1a1a30', border: '1px solid #2a2a4a', borderRadius: 12, color: '#f1f5f9', fontSize: 15, fontWeight: 600, letterSpacing: 2, textAlign: 'center', outline: 'none' }}
              />
              <button onClick={handleJoinByCode} style={{ padding: '12px 18px', background: '#1e293b', color: '#818cf8', border: '1px solid #2a2a4a', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Join
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ---- HOST MODE: show code, share it ----
    if (prejoinMode === 'host') {
      return (
        <div style={{ position: 'fixed', inset: 0, background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#12122a', border: '1px solid #6366f1', borderRadius: 20, padding: '40px 48px', textAlign: 'center', maxWidth: 420, width: '90%' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
            <h2 style={{ color: '#f1f5f9', margin: '0 0 4px', fontSize: 20 }}>Your Room is Ready</h2>
            <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: 13 }}>Share this code with participants</p>
            <div style={{ background: '#1a1a30', border: '2px dashed #6366f1', borderRadius: 14, padding: '20px 0', marginBottom: 20 }}>
              <div style={{ color: '#818cf8', fontSize: 11, marginBottom: 6, letterSpacing: 1 }}>ROOM CODE</div>
              <div style={{ color: '#f1f5f9', fontSize: 40, fontWeight: 800, letterSpacing: 8 }}>{roomCode}</div>
            </div>
            <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: 12 }}>Participants enter this code to join your room</p>
            <button onClick={handleJoin} disabled={stage === 'joining'} style={{ width: '100%', padding: '14px 0', background: stage === 'joining' ? '#4338ca' : '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: stage === 'joining' ? 'not-allowed' : 'pointer' }}>
              {stage === 'joining' ? 'Starting...' : '▶ Start Room'}
            </button>
          </div>
        </div>
      );
    }

    // ---- JOIN MODE or URL mode: just join ----
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
        <div style={{ background: '#12122a', border: '1px solid #2a2a4a', borderRadius: 20, padding: '40px 48px', textAlign: 'center', maxWidth: 400, width: '90%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📹</div>
          <h2 style={{ color: '#f1f5f9', margin: '0 0 8px', fontSize: 20 }}>{urlRoom ? 'Join Room' : 'Enter the Room'}</h2>
          {roomCode && <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: 13 }}>Room code: <strong style={{ color: '#818cf8', letterSpacing: 2 }}>{roomCode}</strong></p>}
          {!roomCode && urlRoom && <p style={{ color: '#94a3b8', margin: '0 0 16px', fontSize: 13 }}>Room: <strong style={{ color: '#818cf8' }}>{roomId}</strong></p>}
          <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 12 }}>Joining as <strong style={{ color: '#f1f5f9' }}>{displayName}</strong></p>
          <button onClick={handleJoin} disabled={stage === 'joining'} style={{ width: '100%', padding: '12px 0', background: stage === 'joining' ? '#4338ca' : '#6366f1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: stage === 'joining' ? 'not-allowed' : 'pointer' }}>
            {stage === 'joining' ? 'Connecting...' : '▶ Join Room'}
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
        <div style={{ background: '#12122a', border: '1px solid #ef4444', borderRadius: 20, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: '#f1f5f9', margin: '0 0 12px' }}>Connection Failed</h2>
          <p style={{ color: '#94a3b8', margin: '0 0 20px', fontSize: 13 }}>{errorMsg}</p>
          <button onClick={onLeave} style={{ padding: '10px 24px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a14', display: 'flex', flexDirection: 'column', zIndex: 500, fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif' }}>

      {/* Hidden video + canvas for Supabase relay capture */}
      <video ref={captureVideoRef} style={{ display: 'none' }} playsInline />
      <canvas ref={relayCanvasRef} style={{ display: 'none' }} />

      {/* ===== TOP BAR ===== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, padding: '0 16px', background: '#12122a', borderBottom: '1px solid #1e1e3a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: '#6366f1', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>▶</div>
          <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 500 }}>LinguaClass</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#34c759', fontSize: 11 }}>● LIVE</span>
          {supabaseRelay && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#065f46', color: '#34d399' }}>
              📡 Relay ↑{framesSent} ↓{framesReceived}
            </span>
          )}
          {!supabaseRelay && webrtcStatus !== 'ok' && (
            <span style={{
              fontSize: 10,
              padding: '2px 8px',
              borderRadius: 10,
              fontWeight: 600,
              background: webrtcStatus === 'checking' ? '#fbbf24' : webrtcStatus === 'no-relay' ? '#f97316' : '#94a3b8',
              color: '#000',
            }}>{webrtcStatus === 'checking' ? '🔍 Checking...' : webrtcStatus === 'no-relay' ? '⚡ Fallback...' : '📡 Relay'}</span>
          )}
          <div style={{ background: '#1a1a30', border: '1px solid #2a2a4a', borderRadius: 8, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#94a3b8', fontSize: 10 }}>Code:</span>
            <span style={{ color: '#818cf8', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>{roomCode || roomId}</span>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(roomCode || roomId).catch(() => {}); setInviteCopied(true); setTimeout(() => setInviteCopied(false), 2000); }}
            style={{ padding: '3px 8px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>
            {inviteCopied ? '✅' : '📋'}
          </button>
          <span style={{ color: '#64748b', fontSize: 11 }}>· {participants.length} in room</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select value={layoutMode} onChange={e => setLayoutMode(e.target.value)} style={{ background: 'transparent', border: '1px solid #2a2a4a', color: '#94a3b8', borderRadius: 6, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}>
            <option value="auto">✨ Auto</option>
            <option value="solo">👤 Solo</option>
            <option value="duo">👥 Duo</option>
            <option value="grid">⊞ Grid</option>
          </select>
          <button onClick={handleLeave} style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>End</button>
        </div>
      </div>

      {/* ===== VIDEO AREA ===== */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>

        {/* Video grid */}
        {effectiveMode === 'solo' && (
          <div style={{ width: '100%', maxWidth: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {participants[0] && renderTile(participants[0], 0)}
          </div>
        )}

        {effectiveMode === 'duo' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 900 }}>
            {participants.map((p, i) => renderTile(p, i))}
          </div>
        )}

        {effectiveMode === 'grid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, width: '100%' }}>
            {participants.map((p, i) => renderTile(p, i))}
          </div>
        )}

        {/* Floating right-side icon bar */}
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10,
          background: 'rgba(18, 18, 42, 0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 16, padding: '8px 6px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <button onClick={() => setActivePanel(activePanel === 'transcript' ? null : 'transcript')} title="Transcript" style={btnStyle(activePanel === 'transcript')}>📝</button>
          <button onClick={() => setShowContactsModal(true)} title="Contacts" style={btnStyle(false)}>📇</button>
          <button onClick={() => speakText('Hello! This is text to speech.', ttsLang)} title="Test TTS" style={btnStyle(false)}>🔊</button>
        </div>

        {/* Floating bottom-right contacts button (always visible) */}
        <button
          onClick={() => setShowContactsModal(true)}
          style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 10,
            width: 44, height: 44, background: 'rgba(99,102,241,0.9)', borderRadius: 14,
            fontSize: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          }}>📇</button>
      </div>

      {/* ===== BOTTOM CONTROL BAR ===== */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', background: '#0d0d1f', borderTop: '1px solid #1e1e3a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a1a30', borderRadius: 16, padding: '4px 8px' }}>
          <button onClick={handleMic} style={ctrlBtn(!micOn)}>{micOn ? '🎤' : '🔇'}<span>Mute</span></button>
          <button onClick={handleCam} style={ctrlBtn(!camOn)}>{camOn ? '📹' : '📷'}<span>Stop</span></button>
          <button onClick={handleScreen} style={ctrlBtn(screenOn)}>🖥️<span>{screenOn ? 'Stop' : 'Share'}</span></button>
          <div style={{ width: 1, height: 24, background: '#2a2a4a', margin: '0 4px' }} />
          <button onClick={() => setActivePanel(activePanel === 'transcript' ? null : 'transcript')} style={ctrlBtn(activePanel === 'transcript')}>
            📝<span>{isListening ? 'Listening...' : 'STT'}</span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <select value={sttLang} onChange={e => setSttLang(e.target.value)} style={selStyle}>
              {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <button onClick={isListening ? stopTranscription : startTranscription} style={ctrlBtn(isListening)}>
            {isListening ? '⏹' : '🎙'}<span>{isListening ? 'Stop' : 'Start'}</span>
          </button>
          <div style={{ width: 1, height: 24, background: '#2a2a4a', margin: '0 4px' }} />
          <button onClick={handleLeave} style={{ ...ctrlBtnStyle, background: '#ef4444', color: '#fff' }}>📴<span>Leave</span></button>
        </div>
      </div>

      {/* ===== TRANSCRIPT SLIDE-IN PANEL ===== */}
      {activePanel === 'transcript' && (
        <div style={slidePanel}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #1e1e3a' }}>
            <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600 }}>📝 Transcript</span>
            <button onClick={() => setActivePanel(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          <div ref={transcriptScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {transcripts.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 20 }}>Press 🎙 Start to begin transcription.</div>}
            {transcripts.map(t => (
              <div key={t.id} style={{ padding: '6px 0', borderBottom: '1px solid #1a1a30' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
                  <span style={{ color: '#818cf8', fontSize: 10, fontWeight: 600 }}>{t.speaker}</span>
                  <span style={{ color: '#475569', fontSize: 9 }}>{t.time}</span>
                </div>
                <div style={{ color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 }}>{t.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CONTACTS MODAL ===== */}
      {showContactsModal && (
        <div style={modalOverlay} onClick={() => { setShowContactsModal(false); setShowAddForm(false); setConfirmDeleteId(null); }}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #1e1e3a' }}>
              <span style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>📇 Contacts <span style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>({appContacts.length})</span></span>
              <button onClick={() => { setShowContactsModal(false); setShowAddForm(false); setConfirmDeleteId(null); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            {/* Copy invite */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', borderBottom: '1px solid #1e1e3a' }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Room: <strong style={{ color: '#818cf8' }}>{roomId}</strong></span>
              <button onClick={copyInviteLink} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>
                {inviteCopied ? '✅ Copied!' : '📋 Copy Link'}
              </button>
            </div>
            {/* Search + Add */}
            {!showAddForm ? (
              <div style={{ display: 'flex', gap: 6, padding: '6px 10px', borderBottom: '1px solid #1e1e3a' }}>
                <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="🔍 Search..." style={{ flex: 1, background: '#1a1a30', border: '1px solid #2a2a4a', borderRadius: 8, padding: '6px 8px', fontSize: 12, color: '#f1f5f9', outline: 'none' }} />
                <button onClick={() => setShowAddForm(true)} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '8px 10px', borderBottom: '1px solid #1e1e3a' }}>
                {['name', 'email', 'phone', 'subject'].map(f => (
                  <input key={f} value={addForm[f]} onChange={e => setAddForm({...addForm, [f]: e.target.value})} placeholder={f === 'name' ? 'Full name *' : f === 'email' ? 'Email *' : f === 'phone' ? 'Phone (optional)' : 'Subject (optional)'}
                    type={f === 'email' ? 'email' : f === 'phone' ? 'tel' : 'text'}
                    style={{ background: '#1a1a30', border: '1px solid #2a2a4a', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: '#f1f5f9', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
                ))}
                <select value={addForm.role} onChange={e => setAddForm({...addForm, role: e.target.value})} style={{ background: '#1a1a30', border: '1px solid #2a2a4a', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: '#f1f5f9', outline: 'none' }}>
                  <option>Student</option><option>Teacher</option><option>Parent</option>
                </select>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={handleAddContact} style={{ flex: 1, padding: '5px 0', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Save</button>
                  <button onClick={() => { setShowAddForm(false); setAddForm({ name: '', email: '', role: 'Student', phone: '', subject: '' }); }} style={{ flex: 1, padding: '5px 0', background: 'transparent', color: '#64748b', border: '1px solid #2a2a4a', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}
            {/* Contact list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {!contactsLoaded && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: 20 }}>Loading...</div>}
              {contactsLoaded && filteredContacts.length === 0 && <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', padding: 20 }}>No contacts. Tap + Add to add one.</div>}
              {filteredContacts.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #1a1a30' }}>
                  <span style={{ fontSize: 20 }}>{c.avatar || '👤'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{c.role} · {c.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => { copyInviteLink(); speakText(`Invite link for ${c.name} copied!`, ttsLang); }}
                      style={{ padding: '2px 8px', background: '#1e293b', color: '#818cf8', border: '1px solid #2a2a4a', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>Invite</button>
                    {confirmDeleteId === c.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <span style={{ color: '#f87171' }}>Delete?</span>
                        <button onClick={() => deleteContact(c.id)} style={{ padding: '2px 6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ padding: '2px 6px', background: 'transparent', color: '#64748b', border: '1px solid #2a2a4a', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(c.id)} style={{ width: 24, height: 24, background: 'transparent', border: 'none', color: '#475569', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STYLE HELPERS ====================
const btnStyle = (active) => ({
  width: 44, height: 44, border: 'none', borderRadius: 12,
  background: active ? 'rgba(99,102,241,0.3)' : 'transparent',
  color: active ? '#818cf8' : '#94a3b8',
  fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s',
});

const ctrlBtnStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 2, minWidth: 44, height: 44, border: 'none', borderRadius: 10,
  background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 18,
};
const ctrlBtn = (on) => ({ ...ctrlBtnStyle, color: on ? '#ef4444' : '#94a3b8' });

const selStyle = {
  background: '#1a1a30', border: '1px solid #2a2a4a', color: '#94a3b8',
  borderRadius: 6, fontSize: 10, padding: '2px 4px', outline: 'none',
};

const slidePanel = {
  position: 'fixed', right: 0, top: 0, bottom: 0, width: 300,
  background: 'rgba(12, 12, 26, 0.97)', backdropFilter: 'blur(20px)',
  borderLeft: '1px solid #1e1e3a', zIndex: 100, display: 'flex', flexDirection: 'column',
  animation: 'slideIn 0.2s ease',
};

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const modalBox = {
  background: '#0f0f1e', borderRadius: 14, width: 370, maxHeight: '72vh',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  border: '1px solid #1e1e3a', boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
};