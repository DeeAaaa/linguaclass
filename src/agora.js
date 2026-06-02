// ============================================
// Agora Video SDK Service
// Replaces custom WebRTC + signaling for real,
// production-ready multi-party video calls.
// ============================================
import AgoraRTC from 'agora-rtc-sdk-ng';

const APP_ID = process.env.REACT_APP_AGORA_APP_ID || '';

let client = null;
let localAudioTrack = null;
let localVideoTrack = null;
let localScreenTrack = null;

// Callbacks the host component sets
let onRemoteUserPublished = null;
let onRemoteUserUnpublished = null;
let onRemoteUserLeft = null;
let onConnectionStateChange = null;
let onUserJoined = null;

// ============================================
// INIT & JOIN
// ============================================

export function initAgoraCallbacks(callbacks) {
  if (callbacks.onRemoteUserPublished) onRemoteUserPublished = callbacks.onRemoteUserPublished;
  if (callbacks.onRemoteUserUnpublished) onRemoteUserUnpublished = callbacks.onRemoteUserUnpublished;
  if (callbacks.onRemoteUserLeft) onRemoteUserLeft = callbacks.onRemoteUserLeft;
  if (callbacks.onConnectionStateChange) onConnectionStateChange = callbacks.onConnectionStateChange;
  if (callbacks.onUserJoined) onUserJoined = callbacks.onUserJoined;
}

export async function joinAgoraRoom(channelName, uid, token = null) {
  if (!APP_ID) {
    console.warn('[Agora] No App ID configured. Video calls will use fallback mode.');
    return false;
  }

  // Create client
  client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

  // Setup event listeners
  client.on('user-published', async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    if (onRemoteUserPublished) {
      onRemoteUserPublished(user, mediaType);
    }
  });

  client.on('user-unpublished', (user, mediaType) => {
    if (onRemoteUserUnpublished) {
      onRemoteUserUnpublished(user, mediaType);
    }
  });

  client.on('user-left', (user) => {
    if (onRemoteUserLeft) onRemoteUserLeft(user);
  });

  client.on('user-joined', (user) => {
    if (onUserJoined) onUserJoined(user);
  });

  client.on('connection-state-change', (curState, prevState, reason) => {
    console.log('[Agora] Connection:', prevState, '→', curState, reason);
    if (onConnectionStateChange) onConnectionStateChange(curState, prevState, reason);
  });

  client.on('exception', (e) => {
    console.warn('[Agora] Exception:', e.code, e.msg);
  });

  // Join channel
  const effectiveUid = uid || String(Math.floor(Math.random() * 1000000));
  await client.join(APP_ID, channelName, token || null, effectiveUid);
  console.log('[Agora] Joined channel:', channelName, 'as uid:', effectiveUid);
  return true;
}

// ============================================
// LOCAL TRACKS
// ============================================

export async function createLocalTracks(videoEnabled = true, audioEnabled = true) {
  if (!client) return null;

  try {
    const tracks = await AgoraRTC.createMicrophoneAndCameraTracks(
      { encoderConfig: 'music_standard' },
      { encoderConfig: '720p_1' }
    );

    localAudioTrack = tracks[0];
    localVideoTrack = tracks[1];

    // Apply initial mute state
    await localAudioTrack.setEnabled(audioEnabled);
    await localVideoTrack.setEnabled(videoEnabled);

    return { audioTrack: localAudioTrack, videoTrack: localVideoTrack };
  } catch (e) {
    console.error('[Agora] Failed to create local tracks:', e);
    return null;
  }
}

export function getLocalAudioTrack() { return localAudioTrack; }
export function getLocalVideoTrack() { return localVideoTrack; }
export function getLocalScreenTrack() { return localScreenTrack; }

export function getClient() { return client; }
export function getLocalUid() { return client ? client.uid : null; }

// Play local video into a DOM element
export function playLocalVideo(domElement) {
  if (localVideoTrack && domElement) {
    localVideoTrack.play(domElement);
  }
}

// Stop playing local video
export function stopLocalVideo() {
  if (localVideoTrack) {
    localVideoTrack.stop();
  }
}

// ============================================
// PUBLISH / UNPUBLISH
// ============================================

export async function publishLocalTracks() {
  if (!client) return;
  const tracks = [];
  if (localAudioTrack) tracks.push(localAudioTrack);
  if (localVideoTrack) tracks.push(localVideoTrack);
  if (tracks.length > 0) {
    await client.publish(tracks);
  }
}

export async function unpublishLocalTracks() {
  if (!client) return;
  const tracks = [];
  if (localAudioTrack) tracks.push(localAudioTrack);
  if (localVideoTrack) tracks.push(localVideoTrack);
  for (const t of tracks) {
    try { await client.unpublish(t); } catch (e) {}
  }
}

// ============================================
// VIDEO / AUDIO CONTROL
// ============================================

export async function toggleLocalVideo(enabled) {
  if (localVideoTrack) {
    await localVideoTrack.setEnabled(enabled);
    return enabled;
  }
  return false;
}

export async function toggleLocalAudio(enabled) {
  if (localAudioTrack) {
    await localAudioTrack.setEnabled(enabled);
    return enabled;
  }
  return false;
}

// ============================================
// SCREEN SHARING
// ============================================

export async function startScreenShare(onScreenShareStopped) {
  if (!client) return null;

  try {
    localScreenTrack = await AgoraRTC.createScreenVideoTrack({
      encoderConfig: '1080p_1',
      optimizationMode: 'detail',
    }, 'auto');

    // Handle browser's "Stop Sharing" button
    if (Array.isArray(localScreenTrack)) {
      // Some browsers return [videoTrack, audioTrack]
      localScreenTrack = localScreenTrack[0];
      if (localScreenTrack[1]) {
        // Screen audio track — publish it too
        await client.publish(localScreenTrack[1]);
      }
    }

    localScreenTrack.on('track-ended', () => {
      stopScreenShare();
      if (onScreenShareStopped) onScreenShareStopped();
    });

    // Unpublish camera video, publish screen
    if (localVideoTrack) {
      await client.unpublish(localVideoTrack);
    }
    await client.publish(localScreenTrack);
    return localScreenTrack;
  } catch (e) {
    console.error('[Agora] Failed to start screen share:', e);
    return null;
  }
}

export async function stopScreenShare() {
  if (localScreenTrack) {
    try { await client.unpublish(localScreenTrack); } catch (e) {}
    localScreenTrack.close();
    localScreenTrack = null;
  }
  // Republish camera if it exists
  if (localVideoTrack) {
    try { await client.publish(localVideoTrack); } catch (e) {}
  }
}

export function playScreenShare(domElement) {
  if (localScreenTrack && domElement) {
    localScreenTrack.play(domElement);
  }
}

// ============================================
// REMOTE USER HELPERS
// ============================================

export function playRemoteVideo(user, domElement) {
  if (user.videoTrack && domElement) {
    user.videoTrack.play(domElement);
  }
}

export function getRemoteUsers() {
  return client ? client.remoteUsers : [];
}

// ============================================
// LEAVE / CLEANUP
// ============================================

export async function leaveAgoraRoom() {
  try {
    // Stop screen share first
    if (localScreenTrack) {
      localScreenTrack.close();
      localScreenTrack = null;
    }

    // Unpublish local tracks
    if (localAudioTrack) {
      localAudioTrack.close();
      localAudioTrack = null;
    }
    if (localVideoTrack) {
      localVideoTrack.close();
      localVideoTrack = null;
    }

    // Leave channel
    if (client) {
      await client.leave();
      client = null;
    }
  } catch (e) {
    console.warn('[Agora] Error during leave:', e);
  }

  // Reset callbacks
  onRemoteUserPublished = null;
  onRemoteUserUnpublished = null;
  onRemoteUserLeft = null;
  onConnectionStateChange = null;
  onUserJoined = null;
}

// ============================================
// AGORA CONNECTION STATE
// ============================================

export function isAgoraConnected() {
  return client && client.connectionState === 'CONNECTED';
}
