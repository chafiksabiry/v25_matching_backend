import axios from 'axios';

/**
 * Persist REP notifications into v25_dash_rep_back (Mongo `rep_notifications`).
 * Matching broadcasts WebSocket for realtime; this makes them durable when the REP is offline.
 */
const DASH_REP_API = String(
  process.env.DASH_REP_API_URL ||
    process.env.REP_DASH_API_URL ||
    'https://v25dashrepback-production.up.railway.app/api'
).replace(/\/$/, '');

function resolveId(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (value._id) return resolveId(value._id);
    if (value.$oid) return String(value.$oid);
    if (value.id) return String(value.id);
  }
  return String(value);
}

function enrollmentCopy(status) {
  if (status === 'enrolled') {
    return {
      title: 'Candidature approuvée',
      message: 'Votre candidature a été approuvée — vous êtes inscrit !',
    };
  }
  if (status === 'rejected') {
    return {
      title: 'Candidature non retenue',
      message: "Votre candidature n'a pas été retenue. Vous pouvez re-postuler.",
    };
  }
  return {
    title: 'Mise à jour candidature',
    message: 'Le statut de votre candidature a changé.',
  };
}

/**
 * @param {{ repId: unknown, gigId?: unknown, status: string, actionPath?: string }} input
 */
export async function persistEnrollmentNotification(input) {
  const repId = resolveId(input.repId);
  const gigId = resolveId(input.gigId);
  const status = String(input.status || '').trim();
  if (!repId || !status) return null;

  const { title, message } = enrollmentCopy(status);
  const notificationKey = `enrollment-${gigId || 'general'}-${status}`;
  const url = `${DASH_REP_API}/notifications/upsert`;

  try {
    const res = await axios.post(
      url,
      {
        notificationKey,
        kind: 'enrollment',
        status,
        title,
        message,
        ...(gigId ? { gigId } : {}),
        actionPath: input.actionPath || '/gigs',
        read: false,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-agent-id': repId,
        },
        timeout: 8000,
        validateStatus: () => true,
      }
    );

    if (res.status >= 400) {
      console.error(
        '[RepNotification] upsert failed',
        res.status,
        typeof res.data === 'object' ? res.data : String(res.data || '')
      );
      return null;
    }

    return res.data?.data || res.data || null;
  } catch (err) {
    console.error('[RepNotification] upsert error', err?.message || err);
    return null;
  }
}

/**
 * Fire-and-forget helper: WS realtime + DB persistence.
 */
export function notifyRepEnrollment({ repId, gigId, companyId, status }) {
  const payload = {
    type: 'enrollment_update',
    repId: resolveId(repId),
    gigId: resolveId(gigId),
    companyId: companyId ? resolveId(companyId) : undefined,
    status: String(status || ''),
  };

  return {
    payload,
    persist: () =>
      persistEnrollmentNotification({
        repId: payload.repId,
        gigId: payload.gigId,
        status: payload.status,
      }),
  };
}
