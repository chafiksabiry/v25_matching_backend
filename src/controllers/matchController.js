import Match from '../models/Match.js';
import Rep from '../models/Rep.js';
import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';
import { calculateMatchScore, findMatchesForGig, findGigsForRep, optimizeMatches } from '../utils/matchingAlgorithm.js';

// Get all matches
export const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('repId')
      .populate('gigId');
    res.status(StatusCodes.OK).json(matches);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get a single match
export const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('repId')
      .populate('gigId');
    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Match not found' });
    }
    res.status(StatusCodes.OK).json(match);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Create a new match
export const createMatch = async (req, res) => {
  try {
    const match = new Match(req.body);
    const savedMatch = await match.save();
    res.status(StatusCodes.CREATED).json(savedMatch);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Update a match
export const updateMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Match not found' });
    }
    res.status(StatusCodes.OK).json(match);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Delete a match
export const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Match not found' });
    }
    res.status(StatusCodes.OK).json({ message: 'Match deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Find matches for a specific gig
export const findMatchesForGigById = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      weights = {}, 
      limit = 10, 
      minimumScore = 0.4, 
      showAllScores = false, 
      topScoreCount = 5 
    } = req.body;
    
    const gig = await Gig.findById(id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }
    
    const reps = await Rep.find();
    
    // Calculer tous les matches
    const allMatches = reps.map(rep => {
      const matchDetails = {
        experienceScore: calculateExperienceScore(rep, gig),
        skillsScore: calculateSkillsScore(rep, gig),
        industryScore: calculateIndustryScore(rep, gig),
        languageScore: calculateLanguageScore(rep, gig),
        availabilityScore: calculateAvailabilityScore(rep, gig),
        timezoneScore: calculateTimezoneScore(rep, gig),
        performanceScore: calculatePerformanceScore(rep, gig),
        regionScore: calculateRegionScore(rep, gig)
      };
      
      // Calculer le score global
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
      
      let scoreSum = 0;
      let weightSum = 0;
      
      Object.entries(matchDetails).forEach(([key, score]) => {
        const weightKey = key.replace('Score', 'Weight');
        if (score !== null && finalWeights[weightKey]) {
          scoreSum += score * finalWeights[weightKey];
          weightSum += finalWeights[weightKey];
        }
      });
      
      const calculatedScore = weightSum > 0 ? scoreSum / weightSum : 0;
      
      return {
        repId: rep._id,
        gigId: gig._id,
        score: calculatedScore,
        matchDetails
      };
    });
    
    // Filtrer d'abord par score minimum
    const qualifyingMatches = allMatches.filter(match => match.score >= minimumScore);
    
    // Trier par score décroissant
    const sortedMatches = qualifyingMatches.sort((a, b) => b.score - a.score);
    
    // Sélectionner uniquement les meilleurs matches dans la limite spécifiée
    const bestMatches = sortedMatches.slice(0, limit);
    
    // Préparer les top scores (différent des matches)
    const topScores = showAllScores ? 
      allMatches
        .sort((a, b) => b.score - a.score)
        .slice(0, topScoreCount) 
      : null;
    
    // Réponse avec séparation claire entre matches et topScores
    res.status(StatusCodes.OK).json({
      matches: bestMatches,  // Uniquement les meilleurs matches qui dépassent le seuil
      totalReps: reps.length,
      qualifyingReps: qualifyingMatches.length,
      matchCount: bestMatches.length,
      totalMatches: sortedMatches.length,
      minimumScoreApplied: minimumScore,
      topScores: topScores,  // Les meilleurs scores globaux
      topScoresCount: topScores ? topScores.length : 0,
      scoreStats: {
        highest: Math.max(...allMatches.map(m => m.score)),
        average: allMatches.reduce((sum, m) => sum + m.score, 0) / allMatches.length,
        qualifying: qualifyingMatches.length
      }
    });
    
  } catch (error) {
    console.error("Error in findMatchesForGigById:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Find gigs for a specific rep
export const findGigsForRepById = async (req, res) => {
  try {
    const { id } = req.params;
    const { weights = {}, limit = 10, minimumScore = 0.4, showAllScores = false, topScoreCount = 5 } = req.body;
    
    const rep = await Rep.findById(id);
    if (!rep) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Rep not found' });
    }
    
    const gigs = await Gig.find();
    
    // Log des données pour déboguer
    console.log('Rep data:', {
      id: rep._id,
      experience: rep.experience,
      skills: rep.skills,
      industries: rep.industries,
      languages: rep.languages,
      availability: rep.availability,
      timezone: rep.timezone,
      performance: rep.performance,
      region: rep.region
    });
    
    // Calculer tous les matches
    const allMatches = gigs.map(gig => {
      // Log des données du gig pour déboguer
      console.log('Gig data:', {
        id: gig._id,
        requiredExperience: gig.requiredExperience,
        requiredSkills: gig.requiredSkills,
        industry: gig.industry,
        preferredLanguages: gig.preferredLanguages,
        duration: gig.duration,
        timezone: gig.timezone,
        expectedConversionRate: gig.expectedConversionRate,
        targetRegion: gig.targetRegion
      });

      // Calculer les scores individuels
      const experienceScore = calculateExperienceScore(rep, gig);
      const skillsScore = calculateSkillsScore(rep, gig);
      const industryScore = calculateIndustryScore(rep, gig);
      const languageScore = calculateLanguageScore(rep, gig);
      const availabilityScore = calculateAvailabilityScore(rep, gig);
      const timezoneScore = calculateTimezoneScore(rep, gig);
      const performanceScore = calculatePerformanceScore(rep, gig);
      const regionScore = calculateRegionScore(rep, gig);

      // Log des scores calculés
      console.log('Calculated scores:', {
        experienceScore,
        skillsScore,
        industryScore,
        languageScore,
        availabilityScore,
        timezoneScore,
        performanceScore,
        regionScore
      });
      
      // Définir les poids
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
      
      // Calculer le score avec notre propre formule
      const calculatedScore = (
        (experienceScore * finalWeights.experienceWeight) +
        (skillsScore * finalWeights.skillsWeight) +
        (industryScore * finalWeights.industryWeight) +
        (languageScore * finalWeights.languageWeight) +
        (availabilityScore * finalWeights.availabilityWeight) +
        (timezoneScore * finalWeights.timezoneWeight) +
        (performanceScore * finalWeights.performanceWeight) +
        (regionScore * finalWeights.regionWeight)
      ) / Object.values(finalWeights).reduce((sum, w) => sum + w, 0);
      
      return {
        repId: rep._id,
        gigId: gig._id,
        score: calculatedScore,
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
    });
    
    // Filtrer les matches avec un score minimum
    const qualifyingMatches = allMatches.filter(match => match.score >= minimumScore);
    
    // Trier par score décroissant
    const sortedMatches = qualifyingMatches.sort((a, b) => b.score - a.score);
    
    // Limiter le nombre de résultats
    const limitedMatches = sortedMatches.slice(0, limit);
    
    // Calculer les top scores si demandé
    const topScores = showAllScores ? sortedMatches.slice(0, topScoreCount) : null;
    
    res.status(StatusCodes.OK).json({
      matches: limitedMatches,
      totalGigs: gigs.length,
      qualifyingGigs: qualifyingMatches.length,
      matchCount: limitedMatches.length,
      totalMatches: allMatches.length,
      minimumScoreApplied: minimumScore,
      topScores: topScores,
      topScoresCount: topScores ? topScores.length : 0,
      totalTopScoresAvailable: qualifyingMatches.length,
      scoreStats: {
        highest: Math.max(...allMatches.map(m => m.score)),
        average: allMatches.reduce((sum, m) => sum + m.score, 0) / allMatches.length,
        qualifying: qualifyingMatches.length
      }
    });
  } catch (error) {
    console.error("Error in findGigsForRepById:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Generate optimal matches
export const generateOptimalMatches = async (req, res) => {
  try {
    const { weights } = req.body;
    
    const reps = await Rep.find();
    const gigs = await Gig.find();
    
    const optimalMatches = optimizeMatches(reps, gigs, weights);
    
    res.status(StatusCodes.OK).json(optimalMatches);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Fonction de calcul d'expérience plus précise
function calculateExperienceScore(rep, gig) {
  if (!gig.requiredExperience || !rep.experience || !Array.isArray(rep.experience)) {
    console.log('Missing experience data:', { rep: rep._id, gig: gig._id });
    return 0.5;
  }

  const repExperience = rep.experience.reduce((total, exp) => {
    if (!exp.startDate) return total;
    const startDate = new Date(exp.startDate);
    const endDate = exp.current ? new Date() : new Date(exp.endDate);
    const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
    return total + years;
  }, 0);

  console.log('Experience calculation:', {
    repId: rep._id,
    gigId: gig._id,
    repExperience,
    requiredExperience: gig.requiredExperience
  });

  if (repExperience >= gig.requiredExperience) {
    return 0.8 + (0.2 * Math.min(1, (gig.requiredExperience / repExperience)));
  } else {
    return Math.max(0.1, repExperience / gig.requiredExperience);
  }
}

function calculateSkillsScore(rep, gig) {
  if (!gig.requiredSkills || !rep.skills || gig.requiredSkills.length === 0) {
    console.log('Missing skills data:', { rep: rep._id, gig: gig._id });
    return 0.5;
  }

  // Combiner toutes les compétences de toutes les catégories
  const allSkills = [
    ...(rep.skills.technical || []),
    ...(rep.skills.professional || []),
    ...(rep.skills.soft || [])
  ];

  const matchingSkills = gig.requiredSkills.filter(requiredSkill => 
    allSkills.some(repSkill => 
      repSkill.name === requiredSkill && 
      ['Advanced', 'Expert'].includes(repSkill.level)
    )
  );

  console.log('Skills calculation:', {
    repId: rep._id,
    gigId: gig._id,
    matchingSkills,
    requiredSkills: gig.requiredSkills,
    allSkills
  });

  return matchingSkills.length / gig.requiredSkills.length;
}

function calculateIndustryScore(rep, gig) {
  if (!gig.industry || !rep.industries || !Array.isArray(rep.industries) || rep.industries.length === 0) {
    return 0.5;
  }

  return rep.industries.includes(gig.industry) ? 1.0 : 0.0;
}

function calculateLanguageScore(rep, gig) {
  if (!gig.preferredLanguages || !rep.languages || !Array.isArray(rep.languages) || gig.preferredLanguages.length === 0) {
    return 0.5;
  }

  const matchingLanguages = gig.preferredLanguages.filter(preferredLang =>
    rep.languages.some(repLang => 
      repLang.name === preferredLang && 
      ['Advanced', 'Native'].includes(repLang.proficiency)
    )
  );

  return matchingLanguages.length / gig.preferredLanguages.length;
}

function calculateAvailabilityScore(rep, gig) {
  if (!rep.availability || !gig.duration || !Array.isArray(rep.availability)) {
    return 0.2;
  }

  const gigStart = new Date(gig.duration.startDate);
  const gigEnd = new Date(gig.duration.endDate);
  
  const availableDays = rep.availability.filter(day => {
    const dayDate = new Date(day);
    return dayDate >= gigStart && dayDate <= gigEnd;
  });

  return 0.2 + (0.8 * (availableDays.length / 7));
}

function calculateTimezoneScore(rep, gig) {
  if (!rep.timezone || !gig.timezone) {
    return 0.5;
  }

  return rep.timezone === gig.timezone ? 1.0 : 0.5;
}

function calculatePerformanceScore(rep, gig) {
  if (!rep.performance || !gig.expectedConversionRate) {
    return 0.5;
  }

  const conversionRateScore = Math.min(1, rep.performance.conversionRate / gig.expectedConversionRate);
  const reliabilityScore = rep.performance.reliability / 10;
  const ratingScore = rep.performance.rating / 5;

  return (conversionRateScore * 0.4) + (reliabilityScore * 0.3) + (ratingScore * 0.3);
}

function calculateRegionScore(rep, gig) {
  if (!rep.region || !gig.targetRegion) {
    return 0.5;
  }

  // Convertir les régions en minuscules pour la comparaison
  const repRegion = rep.region.toLowerCase();
  const targetRegion = gig.targetRegion.toLowerCase();

  // Mapping des régions similaires
  const regionMapping = {
    'middle east': ['middle east', 'europe', 'asia'],
    'europe': ['europe', 'middle east', 'north america'],
    'north america': ['north america', 'europe'],
    'asia': ['asia', 'asia pacific', 'middle east'],
    'asia pacific': ['asia pacific', 'asia']
  };

  if (repRegion === targetRegion) {
    return 1.0;
  }

  // Vérifier si les régions sont similaires
  if (regionMapping[repRegion] && regionMapping[repRegion].includes(targetRegion)) {
    return 0.7; // Score partiel pour les régions similaires
  }

  return 0.0;
}