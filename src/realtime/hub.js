import { Server } from 'socket.io';

/**
 * Unified real-time hub (Socket.IO).
 *
 * Replaces the previous broadcast-to-all raw WebSocket. Every client joins
 * targeted "rooms" based on who they are, and the server emits only to the
 * relevant room instead of blasting every event to every connected client.
 *
 * Rooms:
 *   - `rep:<agentId>`      → a specific rep / agent
 *   - `company:<companyId>`→ a specific company
 *   - `gig:<gigId>`        → everyone watching a given gig (optional)
 *
 * Event envelope (single Socket.IO event name `realtime`):
 *   { type: string, payload: object, ts: number }
 *
 * To scale beyond a single Railway instance later, plug in the Redis adapter
 * (`@socket.io/redis-adapter`) inside `setupRealtime` — no controller changes
 * required because everything emits through `emitToRoom`.
 */

let io = null;

const ALLOWED_ORIGINS = [
  'https://harx25pageslinks.netlify.app',
  'https://harxv25matchingfrontend.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5181'
];

export function setupRealtime(server) {
  io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    const { role, userId } = socket.handshake.auth || {};

    joinRooms(socket, role, userId);

    // Allow a client to (re)subscribe explicitly, e.g. after switching context.
    socket.on('subscribe', (payload = {}) => {
      joinRooms(socket, payload.role, payload.userId);
      if (payload.gigId) socket.join(`gig:${payload.gigId}`);
    });

    socket.on('unsubscribe', (payload = {}) => {
      if (payload.gigId) socket.leave(`gig:${payload.gigId}`);
    });

    socket.emit('realtime', { type: 'connected', payload: {}, ts: Date.now() });
  });

  console.log('✅ [Realtime] Socket.IO hub ready (default path /socket.io)');
  return io;
}

function joinRooms(socket, role, userId) {
  if (!userId) return;
  if (role === 'rep' || role === 'agent') socket.join(`rep:${userId}`);
  else if (role === 'company') socket.join(`company:${userId}`);
}

/** Emit a typed event to a single room. The single low-level entry point. */
export function emitToRoom(room, type, payload = {}) {
  if (!io) {
    console.warn('⚠️ [Realtime] hub not initialized; dropping', type);
    return;
  }
  if (!room) return;
  io.to(room).emit('realtime', { type, payload, ts: Date.now() });
}

export function emitToRep(repId, type, payload = {}) {
  if (!repId) return;
  emitToRoom(`rep:${repId}`, type, { repId: String(repId), ...payload });
}

export function emitToCompany(companyId, type, payload = {}) {
  if (!companyId) return;
  emitToRoom(`company:${companyId}`, type, { companyId: String(companyId), ...payload });
}

export function emitToGig(gigId, type, payload = {}) {
  if (!gigId) return;
  emitToRoom(`gig:${gigId}`, type, { gigId: String(gigId), ...payload });
}
