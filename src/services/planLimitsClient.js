import axios from 'axios';

const REP_WIZARD_API = String(
  process.env.REPSCREATIONWIZARD_API_URL ||
    'https://v25repscreationwizardbackend-production.up.railway.app/api'
).replace(/\/$/, '');

/**
 * Fetch the agent's current plan limits (maxActiveGigs, maxMonthlyEarnings)
 * from repscreationwizard_backend, the service of record for REP plans.
 * Fails open (returns unlimited) on network/config errors so an outage in
 * that service never blocks legitimate enrollment requests.
 */
export async function getAgentPlanLimits(agentId) {
  try {
    const res = await axios.get(`${REP_WIZARD_API}/internal/agents/${agentId}/plan-limits`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    if (res.status >= 400 || !res.data?.success) {
      console.error('[planLimitsClient] plan-limits lookup failed', res.status, res.data);
      return { maxActiveGigs: null, maxMonthlyEarnings: null, planName: null };
    }
    return {
      maxActiveGigs: res.data.maxActiveGigs ?? null,
      maxMonthlyEarnings: res.data.maxMonthlyEarnings ?? null,
      planName: res.data.planName ?? null,
    };
  } catch (err) {
    console.error('[planLimitsClient] plan-limits lookup error', err?.message || err);
    return { maxActiveGigs: null, maxMonthlyEarnings: null, planName: null };
  }
}
