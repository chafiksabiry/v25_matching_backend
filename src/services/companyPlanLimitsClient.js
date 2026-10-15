import axios from 'axios';

const COMPORCHESTRATOR_API_URL = String(
  process.env.COMPORCHESTRATOR_API_URL ||
    'https://v25comporchestratorback-production.up.railway.app/api'
).replace(/\/$/, '');

/**
 * Fetch the company's active plan REP cap (maxReps) from
 * comporchestrator_back. Fails open (null = unlimited) so an outage there
 * never blocks a legitimate enrollment.
 */
export async function getCompanyMaxReps(companyId) {
  try {
    const res = await axios.get(`${COMPORCHESTRATOR_API_URL}/subscriptions/current/${companyId}`, {
      timeout: 5000,
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
