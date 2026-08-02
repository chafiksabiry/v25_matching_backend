import { WebSocketServer } from 'ws';

let wss;

/**
 * Attach a WebSocket server (path: /enrollment-updates) used to push live
 * enrollment status changes to reps. When a company approves / rejects an
 * enrollment request, the controller calls `broadcastEnrollmentUpdate` so the
 * rep's marketplace flips from "PENDING" to "Enrolled" without a page reload.
 */
export function setupEnrollmentWebSocket(server) {
  wss = new WebSocketServer({
    server,
    path: '/enrollment-updates'
  });

  wss.on('connection', (ws) => {
    console.log('✅ [Enrollment WS] Client connected');

    ws.on('close', () => {
      console.log('🔌 [Enrollment WS] Client disconnected');
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'Ready for enrollment updates' }));
  });
}

/**
 * Broadcast an enrollment update to all connected clients. Clients filter by
 * `repId` so each rep only reacts to its own events.
 *
 * @param {Object} data
 * @param {string} data.type   e.g. 'enrollment_update'
 * @param {string} data.repId  the agent/rep id concerned
 * @param {string} [data.gigId]
 * @param {string} [data.status] 'enrolled' | 'rejected' | ...
 */
export function broadcastEnrollmentUpdate(data) {
  if (!wss) {
    console.warn('⚠️ [Enrollment WS] WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}
