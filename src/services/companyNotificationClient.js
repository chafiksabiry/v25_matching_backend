import axios from 'axios';
import crypto from 'node:crypto';

/**
 * Pushes company-side notifications (REP applied / accepted / declined…) to comporchestrator_back, which stores
 * them for the company header bell. Fire-and-forget: a notification must never break an enrollment.
 */
const COMPORCHESTRATOR_API_URL = String(
  process.env.COMPORCHESTRATOR_API_URL || 'https://v25comporchestratorback-production.up.railway.app/api'
).replace(/\/$/, '');

const b64url = (input) => Buffer.from(input).toString('base64url');

/** Short-lived HS256 JWT (scope `company-notify`) signed with the secret shared by all services. */
export function signServiceToken(secret = process.env.JWT_SECRET) {
  if (!secret) return null;
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ scope: 'company-notify', iss: 'matching-backend', iat: now, exp: now + 120 }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

const resolveId = (value) => {
  if (value == null) return '';
  if (typeof value === 'object') return resolveId(value._id || value.id || value.$oid);
  return String(value);
};

export function repDisplayName(agent) {
  const full = agent?.personalInfo?.name || [agent?.firstName, agent?.lastName].filter(Boolean).join(' ');
  return String(full || '').trim() || 'Un REP';
}

const COPY = {
  requested: (rep, gig) => ({
    kind: 'enrollment_request',
    title: "Nouvelle demande d'inscription",
    message: `${rep} souhaite rejoindre « ${gig} ».`,
  }),
  accepted: (rep, gig) => ({
    kind: 'enrollment_accepted',
    title: 'Invitation acceptée',
    message: `${rep} a accepté votre invitation sur « ${gig} ».`,
  }),
  rejected: (rep, gig) => ({
    kind: 'enrollment_rejected',
    title: 'Invitation refusée',
    message: `${rep} a refusé votre invitation sur « ${gig} ».`,
  }),
};

/**
 * @param {{ type: 'requested'|'accepted'|'rejected', agent: object, gig: object, enrollmentId?: unknown }} input
 */
export async function notifyCompanyOfEnrollment({ type, agent, gig, enrollmentId }) {
  try {
    const companyId = resolveId(gig?.companyId);
    const gigId = resolveId(gig?._id || gig?.id);
    const build = COPY[type];
    const token = signServiceToken();
    if (!companyId || !build || !token) return null;
    const copy = build(repDisplayName(agent), gig?.title || 'votre gig');
    await axios.post(
      `${COMPORCHESTRATOR_API_URL}/internal/company-notifications`,
      {
        companyId,
        key: `enrollment-${type}-${resolveId(enrollmentId) || resolveId(agent?._id)}-${Date.now()}`,
        ...copy,
        gigId: gigId || undefined,
        actionPath: '/dashboard/rep-matching',
      },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 8000, validateStatus: () => true }
    );
    return true;
  } catch (err) {
    console.error('[CompanyNotification] push failed', err?.message || err);
    return null;
  }
}
