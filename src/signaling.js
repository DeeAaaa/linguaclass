// Signaling via Supabase Realtime channels — no separate WebSocket server needed
import { supabase } from './supabase';

let activeChannel = null;

/**
 * Join a video room via Supabase Realtime broadcast channel.
 * Returns a signaling object with the same interface as a WebSocket:
 *   { send(msgObj), close(), onmessage, onclose, onerror, readyState }
 */
export function joinSignalingRoom(roomId, userId, userName, role, callbacks) {
  // Leave any previous room first
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  const channelName = `videoroom:${roomId}`;
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } } // Don't receive own messages
  });

  // Listen for broadcast signals (offer, answer, ice-candidate, chat, etc.)
  channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
    if (payload.fromUserId === userId) return; // safety: ignore self
    if (callbacks.onmessage) {
      callbacks.onmessage({ data: JSON.stringify(payload) });
    }
  });

  // Subscribe to the channel
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Announce ourselves to the room
      await channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'peer-joined',
          userId,
          userName,
          role
        }
      });

      // Also tell ourselves we joined (to trigger local state setup)
      if (callbacks.onmessage) {
        callbacks.onmessage({
          data: JSON.stringify({
            type: 'room-joined',
            roomId,
            peers: [] // peers will announce themselves via peer-joined
          })
        });
      }
    }

    if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
      if (callbacks.onclose) callbacks.onclose();
    }
  });

  activeChannel = channel;

  // Return a WebSocket-like interface
  return {
    send(msgObj) {
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: typeof msgObj === 'string' ? JSON.parse(msgObj) : msgObj
        }).catch(e => console.warn('Signal send error:', e.message));
      }
    },
    close() {
      // Broadcast departure before leaving
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: { type: 'peer-left', userId }
        }).catch(() => {});
        supabase.removeChannel(channel);
      }
      activeChannel = null;
      if (callbacks.onclose) callbacks.onclose();
    },
    get readyState() { return 1; } // WebSocket.OPEN = 1
  };
}
