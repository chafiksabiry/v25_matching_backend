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

/**
 * Persist any activity notification into dash_rep_back (triggers WS broadcast on create).
 * @param {{
 *   repId: unknown,
 *   kind: string,
 *   notificationKey: string,
 *   title: string,
 *   message: string,
 *   gigId?: unknown,
 *   journeyId?: unknown,
 *   actionPath?: string,
 *   status?: string,
 * }} input
 */
export async function persistActivityNotification(input) {
  const repId = resolveId(input.repId);
  const notificationKey = String(input.notificationKey || '').trim();
  const kind = String(input.kind || 'general').trim();
  if (!repId || !notificationKey || !kind) return null;

  const gigId = resolveId(input.gigId);
  const journeyId = resolveId(input.journeyId);
  const url = `${DASH_REP_API}/notifications/upsert`;

  try {
    const res = await axios.post(
      url,
      {
        notificationKey,
        kind,
        status: input.status || kind,
        title: String(input.title || '').trim(),
        message: String(input.message || '').trim(),
        ...(gigId ? { gigId } : {}),
        ...(journeyId ? { journeyId } : {}),
        ...(input.actionPath ? { actionPath: String(input.actionPath) } : {}),
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
        '[RepNotification] activity upsert failed',
        kind,
        res.status,
        typeof res.data === 'object' ? res.data : String(res.data || '')
      );
      return null;
    }
    return res.data?.data || res.data || null;
  } catch (err) {
    console.error('[RepNotification] activity upsert error', err?.message || err);
    return null;
  }
}

function scorePercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

/**
 * Notify agents with match score ≥ 50% for a gig (fire-and-forget, idempotent keys).
 * @param {{ gigId: unknown, gigTitle?: string, matches: Array<{ agentId?: unknown, totalMatchingScore?: unknown, score?: unknown }> }} input
 */
export async function notifyMatchingOpportunities({ gigId, gigTitle, matches }) {
  const gId = resolveId(gigId);
  if (!gId || !Array.isArray(matches) || !matches.length) return;

  let enrolledIds = new Set();
  try {
    const GigAgent = (await import('../models/GigAgent.js')).default;
    const enrolled = await GigAgent.find({
      gigId: gId,
      enrollmentStatus: { $in: ['enrolled', 'accepted', 'active', 'approved'] },
    })
      .select('agentId')
      .lean();
    enrolledIds = new Set(enrolled.map((row) => resolveId(row.agentId)).filter(Boolean));
  } catch (err) {
    console.error('[RepNotification] enrolled lookup failed', err?.message || err);
  }

  const title = gigTitle ? String(gigTitle) : 'Gig';
  const jobs = [];

  for (const row of matches) {
    const agentId = resolveId(row?.agentId?._id || row?.agentId || row?.agent?._id || row?.agent);
    if (!agentId || enrolledIds.has(agentId)) continue;
    const pct = scorePercent(row?.totalMatchingScore ?? row?.overallScore ?? row?.score ?? row?.matchScore);
    if (!Number.isFinite(pct) || pct < 50) continue;

    jobs.push(
      persistActivityNotification({
        repId: agentId,
        kind: 'matching',
        status: 'matching',
        notificationKey: `match:${gId}`,
        gigId: gId,
        actionPath: `/marketplace?gigId=${encodeURIComponent(gId)}`,
        title: 'Nouveau projet correspondant',
        message: `« ${title} » matche à ${pct} % avec votre profil.`,
      })
    );
  }

  if (jobs.length) {
    await Promise.allSettled(jobs);
  }
}

/**
 * Notify other enrolled REPs that a new teammate joined the gig.
 */
export async function notifyTeammatesOfNewRep({ gigId, newRepId, newRepName, gigTitle }) {
  const gId = resolveId(gigId);
  const joinerId = resolveId(newRepId);
  if (!gId || !joinerId) return;

  try {
    const GigAgent = (await import('../models/GigAgent.js')).default;
    const peers = await GigAgent.find({
      gigId: gId,
      enrollmentStatus: { $in: ['enrolled', 'accepted', 'active', 'approved'] },
      agentId: { $ne: joinerId },
    })
      .select('agentId')
      .lean();

    const name = String(newRepName || 'REP').trim() || 'REP';
    const title = gigTitle ? String(gigTitle) : 'votre GIG';
    const jobs = peers
      .map((row) => resolveId(row.agentId))
      .filter(Boolean)
      .map((peerId) =>
        persistActivityNotification({
          repId: peerId,
          kind: 'teammate',
          status: 'teammate',
          notificationKey: `teammate:${gId}:${joinerId}`,
          gigId: gId,
          actionPath: `/workspace?gigId=${encodeURIComponent(gId)}`,
          title: 'Nouveau REP sur votre GIG',
          message: `${name} a rejoint « ${title} ».`,
        })
      );

    if (jobs.length) await Promise.allSettled(jobs);
  } catch (err) {
    console.error('[RepNotification] teammate notify failed', err?.message || err);
  }
}

function agentDisplayName(agent) {
  if (!agent) return 'REP';
  if (typeof agent === 'string') return 'REP';
  return (
    agent.personalInfo?.name ||
    [agent.personalInfo?.firstName, agent.personalInfo?.lastName].filter(Boolean).join(' ') ||
    agent.firstName ||
    agent.name ||
    'REP'
  );
}

/** Convenience: resolve gig title + agent name then notify teammates (non-blocking). */
export function fireTeammateNotifications({ gigId, newRepId, agentDoc, gigDoc }) {
  const gigTitle =
    (gigDoc && (gigDoc.title || gigDoc.name)) ||
    (typeof gigDoc === 'object' && gigDoc?.title) ||
    undefined;
  const newRepName = agentDisplayName(agentDoc);
  void notifyTeammatesOfNewRep({
    gigId,
    newRepId,
    newRepName,
    gigTitle,
  }).catch((err) => console.error('[RepNotification] fireTeammate', err?.message || err));
}
