import Gig from '../models/Gig.js';
import { findMatchesForGigById } from '../controllers/matchController.js';

/**
 * Re-runs the matching of the most recent active gigs so that a REP who just registered (or whose profile now
 * fits) shows up in the company's notifications without anyone opening the matching page.
 * The matching handler already notifies the companies about NEW matches only (see notifyCompanyOfNewMatches).
 */
export async function scanActiveGigsForNewMatches({ maxGigs = 20 } = {}) {
  const gigs = await Gig.find({ status: 'active', companyId: { $ne: null } })
    .sort({ updatedAt: -1 })
    .limit(maxGigs)
    .select('_id')
    .lean();

  let scanned = 0;
  for (const gig of gigs) {
    // The handler answers an HTTP response; give it a no-op one.
    const res = { status: () => res, json: () => res };
    try {
      await findMatchesForGigById({ params: { id: String(gig._id) }, body: {}, query: {} }, res);
      scanned += 1;
    } catch (err) {
      console.error('[companyMatchScanner] gig', String(gig._id), 'failed:', err?.message || err);
    }
  }
  return { scanned };
}

/** Off unless COMPANY_MATCH_SCAN_ENABLED=true (the scan is heavy on large databases). */
export function startCompanyMatchScanner() {
  if (process.env.COMPANY_MATCH_SCAN_ENABLED !== 'true') return null;
  const everyMinutes = Math.max(10, Number(process.env.COMPANY_MATCH_SCAN_MINUTES || 60));
  const run = () =>
    scanActiveGigsForNewMatches({ maxGigs: Number(process.env.COMPANY_MATCH_SCAN_MAX_GIGS || 20) })
      .then((r) => console.log(`[companyMatchScanner] scanned ${r.scanned} gig(s)`))
      .catch((err) => console.error('[companyMatchScanner] failed:', err?.message || err));
  setTimeout(run, 2 * 60 * 1000);
  console.log(`[companyMatchScanner] enabled, every ${everyMinutes} min`);
  return setInterval(run, everyMinutes * 60 * 1000);
}
