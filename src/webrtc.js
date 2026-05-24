// WebRTC multi-peer connection manager
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function createPeerConnection(socket, targetUserId) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.send(JSON.stringify({
        type: 'ice-candidate',
        targetUserId,
        candidate: event.candidate
      }));
    }
  };

  pc.ontrack = (event) => {
    // This will be handled by the caller — store stream info
    pc._remoteStream = event.streams[0];
    if (pc._onstream) pc._onstream(event.streams[0]);
  };

  pc.onconnectionstatechange = () => {
    console.log(`PC with ${targetUserId}: ${pc.connectionState}`);
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.onstatechange) pc.onstatechange(targetUserId, pc.iceConnectionState);
  };

  return pc;
}

export async function createOffer(socket, pc, targetUserId) {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.send(JSON.stringify({
      type: 'offer',
      targetUserId,
      sdp: pc.localDescription
    }));
    return true;
  } catch (err) {
    console.error('Failed to create offer:', err);
    return false;
  }
}

export async function handleOffer(socket, pc, fromUserId, sdp) {
  try {
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.send(JSON.stringify({
      type: 'answer',
      targetUserId: fromUserId,
      sdp: pc.localDescription
    }));
    return true;
  } catch (err) {
    console.error('Failed to handle offer:', err);
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
  stream.getTracks().forEach(track => {
    try {
      pc.addTrack(track, stream);
    } catch (e) {
      console.warn('Could not add track:', e.message);
    }
  });
}

export function closePeer(pc) {
  try {
    pc.close();
  } catch (e) {}
}
