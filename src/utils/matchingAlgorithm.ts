import { Rep, Gig, Match, MatchingWeights, Skill, Industry, Language, Availability } from '../types';
import { parseISO, isWithinInterval, areIntervalsOverlapping, format } from 'date-fns';

/**
 * Calculate the matching score between a rep and a gig
 */
export function calculateMatchScore(rep: Rep, gig: Gig, weights) {
  // ... function body ...
}

export function formatScore(score: number): string {
  // Format the score - adjust the implementation as needed for your application
  if (typeof score !== 'number' || isNaN(score)) {
    return 'N/A';
  }
  return `${(score * 100).toFixed(1)}%`;
}