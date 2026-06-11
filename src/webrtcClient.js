// ============================================
// WebRTC Client — wraps native WebRTC + Supabase Realtime signaling
// Provides Agora-style API for VideoRoom.js
// ============================================
import { supabase } from './supabase';
import { createPeerConnection, addTracksToPeer, replaceVideoTrack, createOffer, handleOffer, handleAnswer, handleIceCandidate, closePeer } from './webrtc';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// Local media streams
let localStream = null;
let localAudioTrack = null;
let localVideoTrack = null;
let localScreenStream = null;

// Active peer connections: peerId -> { pc, stream }
const peerConnections = {};

// Active signaling channel
let signalingChannel = null;

// ============================================
// LOCAL MEDIA
// ============================================

export function getLocalStream() {
  return localStream;
}

export async function joinChannel(token, mode, roomId, uid, callbacks) {
  // Clean up any previous session
  await destroyAgoraClient();

  const userId = uid || String(Date.now() % 100000);
  const userName = callbacks?.userName || 'Guest';

  // Get local media
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err) {
    console.error('[WebRTC] Failed to get user media:', err);
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    } catch (err2) {
      callbacks?.onError?.('Camera/microphone access denied. Please allow camera and microphone permissions.');
      return;
    }
  }

  localAudioTrack = localStream.getAudioTracks()[0];
  localVideoTrack = localStream.getVideoTracks()[0];

  // Supabase Realtime broadcast channel
  const channelName = `videoroom:${roomId}`;
  signalingChannel = supabase.channel(channelName, {
    config: { broadcast: { self: false } }
  });

  signalingChannel.on('broadcast', { event: 'signal' }, ({ payload }) => {
    if (payload.fromUserId === userId) return;
    callbacks?.onSignal?.(payload);
  });

  signalingChannel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Announce ourselves
      await signalingChannel.send({
        type: 'broadcast', event: 'signal',
        payload: { type: 'peer-joined', fromUserId: userId, fromUserName: userName, role: 'participant' }
      });
      callbacks?.onJoined?.({ roomId, userId });
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      callbacks?.onError?.('Failed to connect to signaling server.');
    }
  });

  return { userId, roomId };
}

export async function leaveChannel() {
  // Close all peer connections
  for (const [pid, { pc }] of Object.entries(peerConnections)) {
    try { closePeer(pc); } catch (e) {}
  }
  Object.keys(peerConnections).forEach(k => delete peerConnections[k]);

  // Stop local media
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  localAudioTrack = null;
  localVideoTrack = null;

  if (localScreenStream) {
    localScreenStream.getTracks().forEach(t => t.stop());
    localScreenStream = null;
  }

  // Leave signaling channel
  if (signalingChannel) {
    try {
      await signalingChannel.send({
        type: 'broadcast', event: 'signal',
        payload: { type: 'peer-left' }
      });
    } catch (e) {}
    supabase.removeChannel(signalingChannel);
    signalingChannel = null;
  }
}

// ============================================
// MIC / CAMERA TOGGLE
// ============================================

export async function toggleMic() {
  if (!localAudioTrack) return false;
  localAudioTrack.enabled = !localAudioTrack.enabled;
  return localAudioTrack.enabled;
}

export async function toggleCamera() {
  if (!localVideoTrack) return false;
  localVideoTrack.enabled = !localVideoTrack.enabled;
  return localVideoTrack.enabled;
}

// ============================================
// SCREEN SHARE
// ============================================

export async function startScreenShare(token, mode, roomId, uid) {
  if (!localVideoTrack) return null;
  try {
    localScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const screenTrack = localScreenStream.getVideoTracks()[0];

    // Stop camera video while sharing screen
    localVideoTrack.enabled = false;

    // Replace video track in all peer connections
    for (const [pid, { pc }] of Object.entries(peerConnections)) {
      replaceVideoTrack(pc, screenTrack);
    }

    // Handle "Stop Sharing" button in browser
    screenTrack.onended = async () => {
      await stopScreenShare();
    };

    return localScreenStream;
  } catch (err) {
    console.warn('[WebRTC] Screen share cancelled or failed:', err.message);
    return null;
  }
}

export async function stopScreenShare() {
  if (localScreenStream) {
    localScreenStream.getTracks().forEach(t => t.stop());
    localScreenStream = null;
  }
  // Restore camera video
  if (localVideoTrack) {
    localVideoTrack.enabled = true;
    // Re-add camera track to peers
    const videoTrack = localStream.getVideoTracks()[0];
    for (const [pid, { pc }] of Object.entries(peerConnections)) {
      replaceVideoTrack(pc, videoTrack);
    }
  }
}

// ============================================
// PEER CONNECTION MANAGEMENT
// ============================================

export function setupPeerMessageHandler(onSignal, onPeerJoined, onPeerLeft, onError) {
  // This function is called by VideoRoom.js to set up handlers
  // for incoming signals from the signaling channel
  window.__webrtcHandler = { onSignal, onPeerJoined, onPeerLeft, onError };
}

export function handleIncomingSignal(payload) {
  const handler = window.__webrtcHandler;
  if (!handler) return;

  const { type, fromUserId, fromUserName, sdp, candidate } = payload;

  if (type === 'peer-joined') {
    // Initiate WebRTC connection to new peer
    initiatePeer(fromUserId, fromUserName);
    handler.onPeerJoined?.(fromUserId, fromUserName);
  } else if (type === 'peer-left') {
    removePeer(fromUserId);
    handler.onPeerLeft?.(fromUserId);
  } else if (type === 'offer') {
    handleOfferFromPeer(fromUserId, fromUserName, sdp);
  } else if (type === 'answer') {
    handleAnswerFromPeer(fromUserId, sdp);
  } else if (type === 'ice-candidate') {
    handleIceFromPeer(fromUserId, candidate);
  }
}

async function initiatePeer(peerId, peerName) {
  if (peerConnections[peerId]) return; // already connected

  const socket = createSignalingSocket(peerId);
  const pc = createPeerConnection(socket, peerId);

  // Handle remote stream
  pc._onstream = (stream) => {
    window.__webrtcHandler?.onSignal?.({ type: 'remote-stream', fromUserId: peerId, stream });
  };

  // Handle connection state
  pc.onstatechange = (pid, state) => {
    if (state === 'failed' || state === 'disconnected') {
      removePeer(peerId);
    }
  };

  // Add local tracks
  if (localStream) {
    addTracksToPeer(pc, localStream);
  }

  peerConnections[peerId] = { pc, socket };

  // Create and send offer
  await createOffer(socket, pc, peerId);
}

async function handleOfferFromPeer(peerId, peerName, sdp) {
  if (!signalingChannel) return;

  if (!peerConnections[peerId]) {
    const socket = createSignalingSocket(peerId);
    const pc = createPeerConnection(socket, peerId);

    pc._onstream = (stream) => {
      window.__webrtcHandler?.onSignal?.({ type: 'remote-stream', fromUserId: peerId, stream });
    };
    pc.onstatechange = (pid, state) => {
      if (state === 'failed' || state === 'disconnected') removePeer(peerId);
    };

    if (localStream) addTracksToPeer(pc, localStream);
    peerConnections[peerId] = { pc, socket };
  }

  await handleOffer(peerConnections[peerId].socket, peerConnections[peerId].pc, peerId, sdp);
}

async function handleAnswerFromPeer(peerId, sdp) {
  const peer = peerConnections[peerId];
  if (peer) await handleAnswer(peer.pc, sdp);
}

async function handleIceFromPeer(peerId, candidate) {
  const peer = peerConnections[peerId];
  if (peer) await handleIceCandidate(peer.pc, candidate);
}

function removePeer(peerId) {
  const peer = peerConnections[peerId];
  if (peer) {
    try { closePeer(peer.pc); } catch (e) {}
    delete peerConnections[peerId];
  }
}

// WebSocket-like interface using Supabase broadcast
function createSignalingSocket(targetUserId) {
  return {
    send(msg) {
      if (!signalingChannel) return;
      const payload = typeof msg === 'string' ? JSON.parse(msg) : msg;
      signalingChannel.send({
        type: 'broadcast', event: 'signal', payload
      }).catch(e => console.warn('Signal send failed:', e.message));
    }
  };
}

// ============================================
// CLEANUP
// ============================================

export async function destroyAgoraClient() {
  await leaveChannel();
}
