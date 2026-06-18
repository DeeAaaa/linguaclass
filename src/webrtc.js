// WebRTC multi-peer connection manager
// STUN: public IP discovery  |  TURN: relay fallback when direct connection fails (needed for China mobile/carrier networks)
const ICE_SERVERS = {
  iceServers: [
    // STUN — Google
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // STUN — Twilio
    { urls: 'stun:global.stun.twilio.com:3478' },
    // TURN — Self-hosted coturn on Alibaba Cloud Shenzhen
    {
      urls: 'turn:47.115.75.90:3478?transport=tcp',
      username: 'lingua',
      credential: 'LinguaTurn2026!'
    },
    {
      urls: 'turn:47.115.75.90:443?transport=tcp',
      username: 'lingua',
      credential: 'LinguaTurn2026!'
    },
    {
      urls: 'turn:47.115.75.90:3478',
      username: 'lingua',
      credential: 'LinguaTurn2026!'
    },
  ]
};

export function createPeerConnection(socket, targetUserId) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  let hasNonHostCandidate = false;

  // Timeout: if no srflx/relay candidates in 12s, trigger fallback
  const gatherTimeout = setTimeout(() => {
    if (!hasNonHostCandidate) {
      console.warn(`[ICE] ⚠️ No srflx/relay in 12s — WebRTC TURN likely blocked. Switching to Supabase relay.`);
      window.dispatchEvent(new CustomEvent('__webrtcIceStatus', {
        detail: { peerId: targetUserId, status: 'no-relay' }
      }));
    }
  }, 12000);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const c = event.candidate;
      console.log(`[ICE] Candidate: type=${c.type} protocol=${c.protocol} addr=${c.address}:${c.port}`);
      if (c.type === 'srflx' || c.type === 'relay') {
        hasNonHostCandidate = true;
        clearTimeout(gatherTimeout);
        console.log(`[ICE] ✅ Non-host candidate found (${c.type}) — WebRTC should work!`);
        window.dispatchEvent(new CustomEvent('__webrtcIceStatus', {
          detail: { peerId: targetUserId, status: 'ok' }
        }));
      }
      socket.send(JSON.stringify({
        type: 'ice-candidate',
        targetUserId,
        candidate: event.candidate
      }));
    }
  };

  pc.onicegatheringstatechange = () => {
    console.log(`[ICE] Gathering state (${targetUserId}): ${pc.iceGatheringState}`);
  };

  pc.ontrack = (event) => {
    console.log(`[WebRTC] 🔴 ontrack FIRED! stream=${event.streams?.[0]?.id || 'unknown'} track=${event.track?.kind || 'unknown'}`);
    pc._remoteStream = event.streams[0];
    if (pc._onstream) pc._onstream(event.streams[0]);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] Connection state (${targetUserId}): ${pc.connectionState}`);
  };

  // Trigger renegotiation when track changes (e.g., screen share replaces camera)
  pc.onnegotiationneeded = async () => {
    console.log(`[WebRTC] 🔄 Negotiation needed for ${targetUserId} — sending new offer`);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.send(JSON.stringify({
        type: 'offer',
        targetUserId,
        fromUserId: window.__myUserId || targetUserId,
        fromUserName: window.__myUserName || 'Host',
        sdp: pc.localDescription
      }));
    } catch (err) {
      console.warn(`[WebRTC] Negotiation offer failed:`, err.message);
    }
  };

  pc.oniceconnectionstatechange = () => {
    const state = pc.iceConnectionState;
    console.log(`[WebRTC] ICE state (${targetUserId}): ${state}`);
    if (state === 'connected' || state === 'completed') {
      console.log(`[WebRTC] ✅ ICE CONNECTED with ${targetUserId}!`);
    }
    if (state === 'failed') {
      console.warn(`[WebRTC] ❌ ICE FAILED with ${targetUserId}`);
      window.dispatchEvent(new CustomEvent('__webrtcIceStatus', {
        detail: { peerId: targetUserId, status: 'no-relay' }
      }));
    }
    if (pc.onstatechange) pc.onstatechange(targetUserId, state);
  };
  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] Connection state (${targetUserId}): ${pc.connectionState}`);
  };

  return pc;
}

export async function createOffer(socket, pc, targetUserId) {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log(`[WebRTC] ✅ Offer created for ${targetUserId}, type=${offer.type}`);
    socket.send(JSON.stringify({
      type: 'offer',
      targetUserId,
      fromUserId: window.__myUserId || targetUserId,
      fromUserName: window.__myUserName || 'Host',
      sdp: pc.localDescription
    }));
    return true;
  } catch (err) {
    console.error('[WebRTC] ❌ Failed to create offer:', err);
    return false;
  }
}

export async function handleOffer(socket, pc, fromUserId, sdp) {
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    console.log(`[WebRTC] ✅ Answer created for ${fromUserId}`);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.send(JSON.stringify({
      type: 'answer',
      targetUserId: fromUserId,
      sdp: pc.localDescription
    }));
    return true;
  } catch (err) {
    console.error('[WebRTC] ❌ Failed to handle offer:', err);
    return false;
  }
}

export async function handleAnswer(pc, sdp) {
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    return true;
  } catch (err) {
    console.error('Failed to handle answer:', err);
    return false;
  }
}

export async function handleIceCandidate(pc, candidate) {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
    return true;
  } catch (err) {
    console.error('Failed to add ICE candidate:', err);
    return false;
  }
}

export function addTracksToPeer(pc, stream) {
  console.log(`[WebRTC] Adding ${stream.getTracks().length} tracks to peer:`, stream.getTracks().map(t => t.kind));
  stream.getTracks().forEach(track => {
    try {
      pc.addTrack(track, stream);
    } catch (e) {
      console.warn('[WebRTC] Could not add track:', e.message);
    }
  });
}

/** Replace the video track sent to a peer (used for screen sharing toggle) */
export function replaceVideoTrack(pc, newVideoTrack) {
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  if (sender) {
    sender.replaceTrack(newVideoTrack).catch(e => console.warn('replaceTrack error:', e.message));
  } else if (newVideoTrack) {
    pc.addTrack(newVideoTrack);
  }
}

export function closePeer(pc) {
  try {
    pc.close();
  } catch (e) {}
}
