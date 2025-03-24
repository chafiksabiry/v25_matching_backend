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
    
    // Calculer tous les matches
    const allMatches = gigs.map(gig => {
      // Récupérer les scores détaillés
      const matchResult = calculateMatchScore(rep, gig, weights);
      
      // Calculer notre propre score global
      const details = matchResult.matchDetails;
      
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
        ((details.experienceScore || 0) * finalWeights.experienceWeight) +
        ((details.skillsScore || 0) * finalWeights.skillsWeight) +
        ((details.industryScore || 0) * finalWeights.industryWeight) +
        ((details.languageScore || 0) * finalWeights.languageWeight) +
        ((details.availabilityScore || 0) * finalWeights.availabilityWeight) +
        ((details.timezoneScore || 0) * finalWeights.timezoneWeight) +
        ((details.performanceScore || 0) * finalWeights.performanceWeight) +
        ((details.regionScore || 0) * finalWeights.regionWeight)
      ) / Object.values(finalWeights).reduce((sum, w) => sum + w, 0);
      
      return {
        repId: rep._id,
        gigId: gig._id,
        score: calculatedScore,
        matchDetails: details
      };
    });
    
    // Filtrer les matches avec un score minimum
    const qualifyingMatches = allMatches.filter(match => match.score >= minimumScore);
    
    // Trier par score décroissant
    const sortedMatches = qualifyingMatches.sort((a, b) => b.score - a.score);
    
    // Limiter le nombre de résultats
    const limitedMatches = sortedMatches.slice(0, limit);
    
    // Préparer les top scores (triés par score, limités au nombre spécifié)
    const sortedTopScores = allMatches.sort((a, b) => b.score - a.score).slice(0, topScoreCount);
    
    // Réponse avec informations détaillées
    res.status(StatusCodes.OK).json({
      matches: limitedMatches,
      totalGigs: gigs.length,
      qualifyingGigs: qualifyingMatches.length,
      matchCount: limitedMatches.length,
      totalMatches: sortedMatches.length,
      minimumScoreApplied: minimumScore,
      topScores: showAllScores ? sortedTopScores : null,
      topScoresCount: showAllScores ? sortedTopScores.length : 0,  // Nombre de top scores retournés
      totalTopScoresAvailable: allMatches.length  // Nombre total de scores disponibles
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
  // Si le gig demande une expérience spécifique
  if (gig.requiredExperience) {
    // Si le rep a exactement l'expérience demandée
    if (rep.experience === gig.requiredExperience) {
      return 1.0;
    }
    // Si le rep a plus d'expérience que demandé
    else if (rep.experience > gig.requiredExperience) {
      return 0.8 + (0.2 * Math.min(1, (gig.requiredExperience / rep.experience)));
    }
    // Si le rep a moins d'expérience que demandé
    else {
      return Math.max(0.1, rep.experience / gig.requiredExperience);
    }
  }
  // Valeur par défaut si aucune expérience requise
  return 0.5;
}

function calculateSkillsScore(rep, gig) {
  // Implémentation de la fonction calculateSkillsScore
  return 0.3 + (Math.random() * 0.7); // Simulation
}

function calculateIndustryScore(rep, gig) {
  // Implémentation de la fonction calculateIndustryScore
  return 0.3 + (Math.random() * 0.7); // Simulation
}

function calculateLanguageScore(rep, gig) {
  // Implémentation de la fonction calculateLanguageScore
  return 0.3 + (Math.random() * 0.7); // Simulation
}

function calculateAvailabilityScore(rep, gig) {
  // Implémentation de la fonction calculateAvailabilityScore
  return 0.2 + (0.8 * (rep.availability.length / 7)) // Basé sur le nombre de jours disponibles
}

function calculateTimezoneScore(rep, gig) {
  // Implémentation de la fonction calculateTimezoneScore
  return 0.5;
}

function calculatePerformanceScore(rep, gig) {
  // Implémentation de la fonction calculatePerformanceScore
  return rep.rating ? (rep.rating / 5) : 0.5; // Basé sur la note
}

function calculateRegionScore(rep, gig) {
  // Implémentation de la fonction calculateRegionScore
  return rep.region === gig.targetRegion ? 1.0 : 0.0; // Match exact ou rien
}