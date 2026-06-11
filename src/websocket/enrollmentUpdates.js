import { emitToRep } from '../realtime/hub.js';

/**
 * Backward-compatible enrollment broadcaster.
 *
 * The live enrollment channel now rides on the unified Socket.IO hub
 * (`src/realtime/hub.js`). This module is kept so existing controllers can keep
 * importing `broadcastEnrollmentUpdate`, but instead of broadcasting to *every*
 * connected client it now targets only the concerned rep's room.
 *
 * @deprecated Prefer importing { emitToRep } from '../realtime/hub.js' directly.
 */
export function broadcastEnrollmentUpdate(data = {}) {
  const { repId, ...rest } = data;
  if (!repId) {
    console.warn('⚠️ [Enrollment] broadcastEnrollmentUpdate called without repId');
    return;
  }
  emitToRep(repId, rest.type || 'enrollment_update', rest);
}
