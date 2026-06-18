// ============================================
// HTTP-Polling Signaling — replaces Supabase Realtime WebSocket
// This works from China (no WebSocket needed)
// Uses video_signaling table (or family_accounts as fallback)
// ============================================

const SUPABASE_URL = 'https://uzvciccesilmalluxime.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6dmNpY2Nlc2lsbWFsbHV4aW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzY5NTQsImV4cCI6MjA5NTA1Mjk1NH0.2-cMuQC64Z36WpgK73Ly8A982KZBGmAEmh9bHCtsl3w';
const SIGNAL_TTL_MS = 60000;
const POLL_INTERVAL_MS = 800;

let activePoller = null;
let lastSignalSeq = 0;

function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
}

async function sendSignal(roomId, userId, userName, signal) {
  try {
    const payload = { ...signal, fromUserId: userId, fromUserName: userName };
    // Reuse family_accounts table — insert a record with room_id=roomId, parent_name=payload, phone=seq
    const resp = await apiFetch('family_accounts', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        id: `${roomId}_${userId}_${Date.now()}`,
        parent_name: JSON.stringify(payload), // serialize payload as parent_name
        parent_email: roomId, // room_id in parent_email
        phone: String(Date.now()), // timestamp as phone
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function pollSignals(roomId, userId) {
  try {
    const cutoff = new Date(Date.now() - SIGNAL_TTL_MS).toISOString();
    // Read family_accounts where parent_email=roomId and phone > lastSignalSeq and from different user
    const url = `family_accounts?parent_email=eq.${encodeURIComponent(roomId)}&phone=gt.${lastSignalSeq}&select=id,parent_name,phone,parent_email&limit=30&order=phone.asc`;
    const resp = await apiFetch(url);
    if (!resp.ok) return [];
    const rows = await resp.json();
    if (!Array.isArray(rows) || rows.length === 0) return [];

    // Update lastSignalSeq to the latest phone value
    lastSignalSeq = parseInt(rows[rows.length - 1].phone) || 0;

    return rows
      .filter(r => {
        try {
          const payload = JSON.parse(r.parent_name);
          // Skip if this is our own signal (same userId in payload)
          return payload.fromUserId !== userId;
        } catch { return false; }
      })
      .map(r => {
        try { return JSON.parse(r.parent_name); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function joinSignalingRoom(roomId, userId, userName, role, callbacks) {
  if (activePoller) {
    clearInterval(activePoller);
    activePoller = null;
  }
  lastSignalSeq = 0;

  // Announce ourselves
  sendSignal(roomId, userId, userName, { type: 'peer-joined', role });

  // Tell ourselves we joined
  setTimeout(() => {
    callbacks.onmessage?.({ data: JSON.stringify({ type: 'room-joined', roomId, peers: [] }) });
  }, 50);

  let stopped = false;

  activePoller = setInterval(async () => {
    if (stopped) return;
    const signals = await pollSignals(roomId, userId);
    for (const signal of signals) {
      callbacks.onmessage?.({ data: JSON.stringify(signal) });
    }
  }, POLL_INTERVAL_MS);

  return {
    send(msgObj) {
      if (stopped) return;
      const payload = typeof msgObj === 'string' ? JSON.parse(msgObj) : msgObj;
      sendSignal(roomId, userId, userName, payload);
    },
    close() {
      stopped = true;
      if (activePoller) { clearInterval(activePoller); activePoller = null; }
      sendSignal(roomId, userId, userName, { type: 'peer-left' });
      callbacks.onclose?.();
    },
    get readyState() { return stopped ? 3 : 1; }
  };
}
