const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });
console.log(`Signaling server running on port ${PORT}`);

// Room structure: { roomId -> { userId -> { ws, userName, role } } }
const rooms = {};

wss.on('connection', (ws) => {
  let clientInfo = null; // { roomId, userId, userName, role }

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'join-room': {
        clientInfo = {
          roomId: msg.roomId,
          userId: msg.userId,
          userName: msg.userName,
          role: msg.role || 'Student'
        };

        if (!rooms[clientInfo.roomId]) {
          rooms[clientInfo.roomId] = {};
        }

        // Notify existing peers about the new joiner
        const existingPeers = Object.entries(rooms[clientInfo.roomId]);
        for (const [peerId, peer] of existingPeers) {
          // Tell existing peer about the new peer
          peer.ws.send(JSON.stringify({
            type: 'peer-joined',
            userId: clientInfo.userId,
            userName: clientInfo.userName,
            role: clientInfo.role
          }));
        }

        // Add to room
        rooms[clientInfo.roomId][clientInfo.userId] = { ws, userName: clientInfo.userName, role: clientInfo.role };

        // Send existing peers to the new joiner
        const peerList = existingPeers.map(([peerId, peer]) => ({
          userId: peerId,
          userName: peer.userName,
          role: peer.role
        }));

        ws.send(JSON.stringify({
          type: 'room-joined',
          roomId: clientInfo.roomId,
          peers: peerList
        }));

        console.log(`${clientInfo.userName} (${clientInfo.role}) joined room ${clientInfo.roomId}. Peers: ${peerList.length}`);
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice-candidate': {
        if (!clientInfo || !msg.targetUserId) return;
        const target = rooms[clientInfo.roomId]?.[msg.targetUserId];
        if (target) {
          target.ws.send(JSON.stringify({
            type: msg.type,
            fromUserId: clientInfo.userId,
            fromUserName: clientInfo.userName,
            ...(msg.sdp ? { sdp: msg.sdp } : {}),
            ...(msg.candidate ? { candidate: msg.candidate } : {})
          }));
        }
        break;
      }

      case 'chat-message': {
        if (!clientInfo) return;
        const room = rooms[clientInfo.roomId];
        if (!room) return;
        // Broadcast chat to all in room
        for (const [peerId, peer] of Object.entries(room)) {
          peer.ws.send(JSON.stringify({
            type: 'chat-message',
            fromUserId: clientInfo.userId,
            fromUserName: clientInfo.userName,
            text: msg.text,
            time: msg.time
          }));
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (!clientInfo) return;
    const room = rooms[clientInfo.roomId];
    if (!room) return;
    delete room[clientInfo.userId];

    // Notify remaining peers
    for (const [peerId, peer] of Object.entries(room)) {
      peer.ws.send(JSON.stringify({
        type: 'peer-left',
        userId: clientInfo.userId
      }));
    }

    // Clean up empty room
    if (Object.keys(room).length === 0) {
      delete rooms[clientInfo.roomId];
    }

    console.log(`${clientInfo.userName} left room ${clientInfo.roomId}`);
  });
});

process.on('SIGINT', () => {
  wss.close();
  process.exit();
});
