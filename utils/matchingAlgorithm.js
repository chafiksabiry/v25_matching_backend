/**
 * Calculate the matching score between a rep and a gig
 */
export const calculateMatchScore = (rep, gig, weights = {}) => {
  // Scores individuels (utiliser les fonctions existantes)
  // Si ces fonctions existent déjà, conservez-les
  const experienceScore = calculateExperienceScore(rep, gig) || 0.5;
  const skillsScore = calculateSkillsScore(rep, gig) || 0.5;
  const industryScore = calculateIndustryScore(rep, gig) || 0.5;
  const languageScore = calculateLanguageScore(rep, gig) || 0.5;
  const availabilityScore = calculateAvailabilityScore(rep, gig) || 0.2;
  const timezoneScore = calculateTimezoneScore(rep, gig) || 0.5;
  const performanceScore = calculatePerformanceScore(rep, gig) || 0.5;
  const regionScore = calculateRegionScore(rep, gig) || 0.5;
  
  // Poids par défaut
  const finalWeights = {
    experienceWeight: 1,
    skillsWeight: 1,
    industryWeight: 1,
    languageWeight: 1,
    availabilityWeight: 1,
    timezoneWeight: 1,
    performanceWeight: 1,
    regionWeight: 1,
    ...weights
  };
  
  // Calculer la moyenne pondérée
  const totalWeight = Object.values(finalWeights).reduce((sum, w) => sum + w, 0);
  const finalScore = (
    (finalWeights.experienceWeight * (experienceScore || 0)) +
    (finalWeights.skillsWeight * (skillsScore || 0)) +
    (finalWeights.industryWeight * (industryScore || 0)) +
    (finalWeights.languageWeight * (languageScore || 0)) +
    (finalWeights.availabilityWeight * (availabilityScore || 0)) +
    (finalWeights.timezoneWeight * (timezoneScore || 0)) +
    (finalWeights.performanceWeight * (performanceScore || 0)) +
    (finalWeights.regionWeight * (regionScore || 0))
  ) / (totalWeight || 1);
  
  return {
    score: finalScore,
    matchDetails: {
      experienceScore,
      skillsScore,
      industryScore,
      languageScore,
      availabilityScore,
      timezoneScore,
      performanceScore,
      regionScore
    }
  };
};

/**
 * Calculate experience score based on rep's experience vs. gig's required experience
 */
function calculateExperienceScore(repExperience, requiredExperience) {
  if (repExperience >= requiredExperience) {
    // Bonus for exceeding required experience, but with diminishing returns
    return Math.min(1, 0.8 + (repExperience - requiredExperience) * 0.04);
  } else {
    // Penalty for not meeting required experience
    return Math.max(0, repExperience / requiredExperience * 0.8);
  }
}

/**
 * Calculate skills score based on overlap between rep's skills and gig's required skills
 */
export const calculateSkillsScore = (rep, gig) => {
  // Vérifier si rep.skills et gig.requiredSkills existent et sont des tableaux
  const repSkills = Array.isArray(rep?.skills) ? rep.skills : [];
  const requiredSkills = Array.isArray(gig?.requiredSkills) ? gig.requiredSkills : [];
  
  // Si aucune compétence n'est requise, retourner un score neutre
  if (requiredSkills.length === 0) {
    return 0.5; // Score neutre
  }
  
  // Compter combien de compétences requises le rep possède
  let matchingSkills = 0;
  for (const skill of requiredSkills) {
    if (repSkills.includes(skill)) {
      matchingSkills++;
    }
  }
  
  // Calculer le score basé sur le pourcentage de compétences correspondantes
  return requiredSkills.length > 0 ? matchingSkills / requiredSkills.length : 0;
};

/**
 * Calculate industry score based on rep's industry experience vs. gig's industry
 */
export const calculateIndustryScore = (rep, gig) => {
  const repIndustries = Array.isArray(rep?.industries) ? rep.industries : [];
  const gigIndustries = Array.isArray(gig?.industries) ? gig.industries : [];
  
  if (gigIndustries.length === 0) {
    return 0.5; // Score neutre si aucune industrie n'est spécifiée
  }
  
  // Vérifier les correspondances
  for (const industry of repIndustries) {
    if (gigIndustries.includes(industry)) {
      return 1; // Match parfait si au moins une industrie correspond
    }
  }
  
  return 0; // Pas de correspondance
};

/**
 * Calculate language score based on overlap between rep's languages and gig's preferred languages
 */
export const calculateLanguageScore = (rep, gig) => {
  const repLanguages = Array.isArray(rep?.languages) ? rep.languages : [];
  const requiredLanguages = Array.isArray(gig?.requiredLanguages) ? gig.requiredLanguages : [];
  
  if (requiredLanguages.length === 0) {
    return 0.5; // Score neutre si aucune langue n'est requise
  }
  
  // Vérifier les correspondances
  let matchingLanguages = 0;
  for (const language of requiredLanguages) {
    if (repLanguages.includes(language)) {
      matchingLanguages++;
    }
  }
  
  return requiredLanguages.length > 0 ? matchingLanguages / requiredLanguages.length : 0;
};

/**
 * Calculate availability score based on rep's availability vs. gig's duration
 */
export const calculateAvailabilityScore = (rep, gig) => {
  // Vérifier si les disponibilités existent et sont des tableaux
  const repAvailability = Array.isArray(rep?.availability) ? rep.availability : [];
  const gigSchedule = Array.isArray(gig?.schedule) ? gig.schedule : [];
  
  // Si aucune disponibilité n'est spécifiée, retourner un score neutre
  if (repAvailability.length === 0 || gigSchedule.length === 0) {
    return 0.2; // Score par défaut faible mais non nul
  }
  
  // Créer une carte des disponibilités du représentant par jour
  const repAvailabilityByDay = {};
  repAvailability.forEach(slot => {
    if (slot && slot.day) {
      if (!repAvailabilityByDay[slot.day]) {
        repAvailabilityByDay[slot.day] = [];
      }
      if (slot.startTime && slot.endTime) {
        repAvailabilityByDay[slot.day].push({
          start: slot.startTime,
          end: slot.endTime
        });
      }
    }
  });
  
  // Vérifier les chevauchements avec l'horaire du gig
  let totalOverlap = 0;
  let totalGigHours = 0;
  
  gigSchedule.forEach(slot => {
    if (slot && slot.day && slot.startTime && slot.endTime) {
      // Convertir les heures en minutes pour faciliter les calculs
      const gigStart = timeToMinutes(slot.startTime);
      const gigEnd = timeToMinutes(slot.endTime);
      const gigDuration = gigEnd - gigStart;
      totalGigHours += gigDuration;
      
      // Vérifier les disponibilités du rep pour ce jour
      const dayAvailability = repAvailabilityByDay[slot.day] || [];
      
      dayAvailability.forEach(repSlot => {
        const repStart = timeToMinutes(repSlot.start);
        const repEnd = timeToMinutes(repSlot.end);
        
        // Calculer le chevauchement
        const overlapStart = Math.max(gigStart, repStart);
        const overlapEnd = Math.min(gigEnd, repEnd);
        const overlap = Math.max(0, overlapEnd - overlapStart);
        
        totalOverlap += overlap;
      });
    }
  });
  
  // Calculer le score basé sur le pourcentage de chevauchement
  return totalGigHours > 0 ? Math.min(1, totalOverlap / totalGigHours) : 0.2;
};

// Fonction utilitaire pour convertir les heures en minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

/**
 * Calculate timezone score based on rep's timezone vs. gig's timezone
 */
function calculateTimezoneScore(repTimezone, gigTimezone) {
  // For simplicity, exact match = 1, otherwise 0.5
  // In a real implementation, this would calculate actual time differences
  return repTimezone === gigTimezone ? 1 : 0.5;
}

/**
 * Calculate performance score based on rep's historical performance metrics
 */
function calculatePerformanceScore(
  repConversionRate, 
  repReliability, 
  repRating, 
  expectedConversionRate
) {
  // Conversion rate comparison (0-0.4)
  const conversionScore = repConversionRate >= expectedConversionRate 
    ? 0.4 
    : 0.4 * (repConversionRate / expectedConversionRate);
  
  // Reliability score (0-0.3)
  const reliabilityScore = repReliability / 10 * 0.3;
  
  // Rating score (0-0.3)
  const ratingScore = repRating / 5 * 0.3;
  
  return conversionScore + reliabilityScore + ratingScore;
}

/**
 * Calculate region score based on rep's region vs. gig's target region
 */
function calculateRegionScore(repRegion, targetRegion) {
  return repRegion === targetRegion ? 1 : 0;
}

/**
 * Find the best matches for a specific gig
 */
export function findMatchesForGig(gig, reps, weights, limit = 10) {
  const matches = [];
  
  for (const rep of reps) {
    const match = calculateMatchScore(rep, gig, weights);
    matches.push(match);
  }
  
  // Sort matches by score in descending order and limit results
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Find the best gigs for a specific rep
 */
export const findGigsForRep = (rep, gigs, weights = {}, limit = 10, minimumScore = 0.4) => {
  // Calculer les scores pour tous les gigs
  const allMatches = gigs.map(gig => {
    const matchResult = calculateMatchScore(rep, gig, weights);
    
    // Calculer manuellement le score global si matchResult.score est null
    let score = matchResult.score;
    if (score === null) {
      const details = matchResult.matchDetails;
      let sum = 0;
      let count = 0;
      
      // Utiliser les scores individuels non-nuls pour calculer une moyenne
      if (details.experienceScore !== null) { sum += details.experienceScore; count++; }
      if (details.skillsScore !== null) { sum += details.skillsScore; count++; }
      if (details.industryScore !== null) { sum += details.industryScore; count++; }
      if (details.languageScore !== null) { sum += details.languageScore; count++; }
      if (details.availabilityScore !== null) { sum += details.availabilityScore; count++; }
      if (details.timezoneScore !== null) { sum += details.timezoneScore; count++; }
      if (details.performanceScore !== null) { sum += details.performanceScore; count++; }
      if (details.regionScore !== null) { sum += details.regionScore; count++; }
      
      score = count > 0 ? sum / count : 0;
    }
    
    return {
      repId: rep._id,
      gigId: gig._id,
      score: score,
      matchDetails: matchResult.matchDetails
    };
  });
  
  // Filtrer les matches avec un score minimum
  const qualifyingMatches = allMatches.filter(match => match.score >= minimumScore);
  
  // Trier par score décroissant
  const sortedMatches = qualifyingMatches.sort((a, b) => b.score - a.score);
  
  // Limiter le nombre de résultats
  return sortedMatches.slice(0, limit);
};

/**
 * Generate all possible matches between reps and gigs
 */
export function generateAllMatches(reps, gigs, weights) {
  const allMatches = [];
  
  for (const rep of reps) {
    for (const gig of gigs) {
      const match = calculateMatchScore(rep, gig, weights);
      allMatches.push(match);
    }
  }
  
  return allMatches.sort((a, b) => b.score - a.score);
}

/**
 * Optimize matches to ensure best overall allocation
 * This is a simplified version of the Hungarian algorithm for optimal assignment
 */
export function optimizeMatches(reps, gigs, weights) {
  // Generate all possible matches
  const allMatches = generateAllMatches(reps, gigs, weights);
  
  // Track assigned reps and gigs
  const assignedReps = new Set();
  const assignedGigs = new Set();
  const optimalMatches = [];
  
  // Greedy assignment (not truly optimal, but simpler for demonstration)
  for (const match of allMatches) {
    if (!assignedReps.has(match.repId.toString()) && !assignedGigs.has(match.gigId.toString())) {
      optimalMatches.push(match);
      assignedReps.add(match.repId.toString());
      assignedGigs.add(match.gigId.toString());
      
      // Stop when all reps or all gigs are assigned
      if (assignedReps.size === reps.length || assignedGigs.size === gigs.length) {
        break;
      }
    }
  }
  
  return optimalMatches;
}

/**
 * Format match score as percentage
 */
export function formatScore(score) {
  return `${Math.round(score * 100)}%`;
}