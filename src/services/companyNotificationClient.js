import axios from 'axios';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import CompanyMatchSeen from '../models/CompanyMatchSeen.js';

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

/**
 * Id of a value that may be a string, an ObjectId or a populated document. An ObjectId must be read with
 * toHexString(): Mongoose gives it an `_id` getter that returns itself, so following `_id` never ends.
 */
const resolveId = (value, depth = 0) => {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  if (typeof value.toHexString === 'function') return value.toHexString();
  if (value.$oid) return String(value.$oid);
  const inner = value._id ?? value.id;
  return inner && inner !== value && depth < 3 ? resolveId(inner, depth + 1) : '';
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
    if (!companyId || !build || !token) {
      console.warn(`[CompanyNotification] ${type} skipped (companyId=${companyId || 'none'}, token=${token ? 'ok' : 'missing JWT_SECRET'})`);
      return null;
    }
    const copy = build(repDisplayName(agent), gig?.title || 'votre gig');
    const response = await axios.post(
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
    if (response.status !== 201) {
      console.error(`[CompanyNotification] ${type} rejected by the orchestrator: HTTP ${response.status}`);
      return null;
    }
    return true;
  } catch (err) {
    console.error('[CompanyNotification] push failed', err?.message || err);
    return null;
  }
}

const MIN_COMPANY_MATCH_PERCENT = Number(process.env.COMPANY_MATCH_MIN_PERCENT || 60);

const percentOf = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return NaN;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
};

/**
 * Tells the company about REP profiles that match one of its gigs and that it has not been told about yet
 * (a profile that just registered, or whose profile now fits). One summary notification per call.
 * @param {{ gig: object, matches: Array<object> }} input
 */
export async function notifyCompanyOfNewMatches({ gig, matches }) {
  try {
    const companyId = resolveId(gig?.companyId);
    const gigId = resolveId(gig?._id || gig?.id);
    const token = signServiceToken();
    if (!companyId || !gigId || !token || !Array.isArray(matches) || !matches.length) return null;

    const candidates = matches
      .map((m) => ({
        agentId: resolveId(m?.agentId?._id || m?.agentId || m?.agent?._id || m?.agent),
        pct: percentOf(m?.totalMatchingScore ?? m?.overallScore ?? m?.score ?? m?.matchScore),
        name: repDisplayName(m?.agentInfo || m?.agent || {}),
        invited: Boolean(m?.isInvited),
      }))
      .filter((c) => c.agentId && mongoose.Types.ObjectId.isValid(c.agentId) && c.pct >= MIN_COMPANY_MATCH_PERCENT && !c.invited);
    if (!candidates.length) return null;

    // Register as seen; only the rows that were actually inserted are "new".
    const known = new Set(
      (await CompanyMatchSeen.find({ gigId, agentId: { $in: candidates.map((c) => c.agentId) } }).select('agentId').lean()).map((r) =>
        String(r.agentId)
      )
    );
    const fresh = candidates.filter((c) => !known.has(c.agentId)).sort((a, b) => b.pct - a.pct);
    if (!fresh.length) return null;
    await CompanyMatchSeen.insertMany(
      fresh.map((c) => ({ gigId, agentId: c.agentId })),
      { ordered: false }
    ).catch(() => undefined);

    const best = fresh[0];
    const title = fresh.length === 1 ? 'Nouveau profil correspondant' : `${fresh.length} nouveaux profils correspondants`;
    const message =
      fresh.length === 1
        ? `${best.name} correspond à ${best.pct} % à « ${gig?.title || 'votre gig'} ».`
        : `Pour « ${gig?.title || 'votre gig'} » : ${best.name} (${best.pct} %)${fresh.length > 1 ? ` et ${fresh.length - 1} autre(s) profil(s) à plus de ${MIN_COMPANY_MATCH_PERCENT} %.` : ''}`;

    // The profiles were registered as seen above: if the push does not go through, unregister them so that the
    // next scan tells the company about them instead of losing them.
    const unregister = () => CompanyMatchSeen.deleteMany({ gigId, agentId: { $in: fresh.map((c) => c.agentId) } }).catch(() => undefined);
    let response;
    try {
      response = await axios.post(
        `${COMPORCHESTRATOR_API_URL}/internal/company-notifications`,
        {
          companyId,
          key: `match-${gigId}-${Date.now()}`,
          kind: 'matching',
          title,
          message,
          gigId,
          actionPath: '/dashboard/rep-matching',
        },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000, validateStatus: () => true }
      );
    } catch (err) {
      await unregister();
      throw err;
    }
    if (response.status !== 201) {
      await unregister();
      console.error(`[CompanyNotification] new matches rejected by the orchestrator: HTTP ${response.status}`);
      return null;
    }
    return fresh.length;
  } catch (err) {
    console.error('[CompanyNotification] new matches push failed', err?.message || err);
    return null;
  }
}
