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

function invitationStamp(value) {
  if (value == null || value === '') return Date.now();
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : Date.now();
}

/**
 * One notification per invite wave — re-invite after reject must not reuse the same key.
 */
function enrollmentNotificationKey({ gigId, status, enrollmentId, invitationSentAt }) {
  const g = gigId || 'general';
  const s = String(status || '').trim() || 'update';
  if (s === 'invited') {
    const enroll = enrollmentId || 'x';
    const at = invitationStamp(invitationSentAt);
    return `enrollment-${g}-invited-${enroll}-${at}`;
  }
  return `enrollment-${g}-${s}`;
}

function enrollmentCopy(status, gigTitle) {
  const titleSuffix = gigTitle ? ` (${gigTitle})` : '';
  if (status === 'invited') {
    return {
      title: 'Nouvelle invitation',
      message: gigTitle
        ? `Une entreprise vous invite sur « ${gigTitle} ».`
        : 'Une entreprise vous invite à rejoindre un gig.',
    };
  }
  if (status === 'enrolled') {
    return {
      title: 'Candidature approuvée',
      message: `Votre candidature a été approuvée — vous êtes inscrit !${titleSuffix}`,
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
 * @param {{
 *   repId: unknown,
 *   gigId?: unknown,
 *   status: string,
 *   actionPath?: string,
 *   gigTitle?: string,
 *   enrollmentId?: unknown,
 *   invitationSentAt?: unknown,
 * }} input
 */
export async function persistEnrollmentNotification(input) {
  const repId = resolveId(input.repId);
  const gigId = resolveId(input.gigId);
  const status = String(input.status || '').trim();
  if (!repId || !status) return null;

  const enrollmentId = resolveId(input.enrollmentId);
  const { title, message } = enrollmentCopy(status, input.gigTitle);
  const notificationKey = enrollmentNotificationKey({
    gigId,
    status,
    enrollmentId,
    invitationSentAt: input.invitationSentAt,
  });
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
        actionPath:
          input.actionPath ||
          (status === 'invited'
            ? '/marketplace?tab=invited'
            : gigId
              ? `/gig/${gigId}`
              : '/marketplace'),
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
export function notifyRepEnrollment({ repId, gigId, companyId, status, enrollmentId }) {
  const payload = {
    type: 'enrollment_update',
    repId: resolveId(repId),
    gigId: resolveId(gigId),
    companyId: companyId ? resolveId(companyId) : undefined,
    status: String(status || ''),
    enrollmentId: enrollmentId ? resolveId(enrollmentId) : undefined,
  };

  return {
    payload,
    persist: () =>
      persistEnrollmentNotification({
        repId: payload.repId,
        gigId: payload.gigId,
        status: payload.status,
        enrollmentId: payload.enrollmentId,
        actionPath: payload.gigId ? `/gig/${payload.gigId}` : '/marketplace',
      }),
  };
}

/** Notify REP in realtime (WS) + durable DB notification after a company invite. */
export async function notifyRepInvitation({
  repId,
  gigId,
  companyId,
  gigTitle,
  enrollmentId,
  invitationSentAt,
}) {
  const enroll = resolveId(enrollmentId);
  const inviteAt = invitationStamp(invitationSentAt);
  const payload = {
    type: 'enrollment_update',
    repId: resolveId(repId),
    gigId: resolveId(gigId),
    companyId: companyId ? resolveId(companyId) : undefined,
    status: 'invited',
    gigTitle: gigTitle ? String(gigTitle) : undefined,
    enrollmentId: enroll || undefined,
    invitationSentAt: inviteAt,
  };

  return {
    payload,
    persist: () =>
      persistEnrollmentNotification({
        repId: payload.repId,
        gigId: payload.gigId,
        status: 'invited',
        gigTitle: payload.gigTitle,
        enrollmentId: enroll,
        invitationSentAt: inviteAt,
        actionPath: '/marketplace?tab=invited',
      }),
  };
}
