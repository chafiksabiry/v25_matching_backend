import axios from 'axios';
import crypto from 'node:crypto';

const COMPORCHESTRATOR_API_URL = String(
  process.env.COMPORCHESTRATOR_API_URL ||
    'https://v25comporchestratorback-production.up.railway.app/api'
).replace(/\/$/, '');

const b64url = (input) => Buffer.from(input).toString('base64url');

/**
 * L'orchestrateur exige une session sur GET /subscriptions/current/:companyId : ce service s'y présente avec un JWT de
 * service (HS256, secret partagé, 1 minute) limité à l'entreprise lue. Sans JWT_SECRET : aucun en-tête.
 */
export function subscriptionReadHeaders(companyId, secret = process.env.JWT_SECRET) {
  if (!secret) return {};
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(
    JSON.stringify({ service: 'matching', companyId: String(companyId), iat: now, exp: now + 60 })
  )}`;
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return { Authorization: `Bearer ${body}.${signature}` };
}

/**
 * Fetch the company's active plan REP cap (maxReps) from
 * comporchestrator_back. Fails open (null = unlimited) so an outage there
 * never blocks a legitimate enrollment.
 */
export async function getCompanyMaxReps(companyId) {
  try {
    const res = await axios.get(`${COMPORCHESTRATOR_API_URL}/subscriptions/current/${companyId}`, {
      timeout: 5000,
      headers: subscriptionReadHeaders(companyId),
      validateStatus: () => true,
    });
    if (res.status >= 400 || !res.data?.success) {
      return null;
    }
    const maxReps = res.data?.data?.planId?.maxReps;
    return typeof maxReps === 'number' ? maxReps : null;
  } catch (err) {
    console.error('[companyPlanLimitsClient] getCompanyMaxReps error', err?.message || err);
    return null;
  }
}
