import Match from '../models/Match.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import GigAgent from '../models/GigAgent.js';
import { StatusCodes } from 'http-status-codes';
import { findMatches } from '../utils/matchingUtils.js';
import { findLanguageMatches, getLanguageLevelScore } from '../utils/matchingAlgorithm.js';
import { sendMatchingNotification } from '../services/emailService.js';
import mongoose from 'mongoose';

// Skill models (pour récupérer les noms des skills)
const TechnicalSkill = mongoose.model('TechnicalSkill', new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  isActive: Boolean
}));

const ProfessionalSkill = mongoose.model('ProfessionalSkill', new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  isActive: Boolean
}));

const SoftSkill = mongoose.model('SoftSkill', new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  isActive: Boolean
}));

// Timezone model (pour récupérer les données de timezone)
const Timezone = mongoose.model('Timezone', new mongoose.Schema({
  countryCode: String,
  countryName: String,
  zoneName: String,
  gmtOffset: Number
}));

// Language model (pour récupérer les noms des langues)
const Language = mongoose.model('Language', new mongoose.Schema({
  name: String,
  iso639_1: String,
  iso639_2: String,
  nativeName: String,
  isActive: Boolean
}));

// Industry model (pour récupérer les noms des industries)
const Industry = mongoose.model('Industry', new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  isActive: Boolean
}));

// Activity model (pour récupérer les noms des activités)
const Activity = mongoose.model('Activity', new mongoose.Schema({
  name: String,
  description: String,
  category: String,
  isActive: Boolean
}));

// Function to get language names from IDs
const getLanguageNames = async (languageIds) => {
  try {
    if (!languageIds || languageIds.length === 0) return [];
    
    const languages = await Language.find({ _id: { $in: languageIds } });
    const languageMap = {};
    
    languages.forEach(language => {
      languageMap[language._id.toString()] = language.name;
    });
    
    return languageIds.map(id => ({
      id: id,
      name: languageMap[id.toString()] || 'Unknown Language'
    }));
  } catch (error) {
    console.error('Error getting language names:', error);
    return languageIds.map(id => ({ id, name: 'Unknown Language' }));
  }
};

// Function to get industry names from IDs
const getIndustryNames = async (industryIds) => {
  try {
    if (!industryIds || industryIds.length === 0) return [];
    
    const industries = await Industry.find({ _id: { $in: industryIds } });
    const industryMap = {};
    
    industries.forEach(industry => {
      industryMap[industry._id.toString()] = industry.name;
    });
    
    return industryIds.map(id => ({
      id: id,
      name: industryMap[id.toString()] || 'Unknown Industry'
    }));
  } catch (error) {
    console.error('Error getting industry names:', error);
    return industryIds.map(id => ({ id, name: 'Unknown Industry' }));
  }
};

// Function to get activity names from IDs
const getActivityNames = async (activityIds) => {
  try {
    if (!activityIds || activityIds.length === 0) return [];
    
    const activities = await Activity.find({ _id: { $in: activityIds } });
    const activityMap = {};
    
    activities.forEach(activity => {
      activityMap[activity._id.toString()] = activity.name;
    });
    
    return activityIds.map(id => ({
      id: id,
      name: activityMap[id.toString()] || 'Unknown Activity'
    }));
  } catch (error) {
    console.error('Error getting activity names:', error);
    return activityIds.map(id => ({ id, name: 'Unknown Activity' }));
  }
};

// Language normalization function
const normalizeLanguage = (language) => {
  if (!language) return '';
  const languageMap = {
    'french': 'french',
    'français': 'french',
    'frensh': 'french', // Correction de la faute de frappe
    'english': 'english',
    'anglais': 'english',
    'spanish': 'spanish',
    'espagnol': 'spanish',
    'arabic': 'arabic',
    'arabe': 'arabic',
    'natif': 'native',
    'native': 'native',
    'fluent': 'fluent',
    'avancé': 'advanced',
    'advanced': 'advanced',
    'intermediate': 'intermediate',
    'intermédiaire': 'intermediate',
    'beginner': 'beginner',
    'débutant': 'beginner'
  };
  return languageMap[language.toLowerCase()] || language.toLowerCase();
};

// Function to get skill names from IDs
const getSkillNames = async (skillIds, skillType) => {
  try {
    if (!skillIds || skillIds.length === 0) return [];
    
    let SkillModel;
    switch (skillType) {
      case 'technical':
        SkillModel = TechnicalSkill;
        break;
      case 'professional':
        SkillModel = ProfessionalSkill;
        break;
      case 'soft':
        SkillModel = SoftSkill;
        break;
      default:
        return skillIds.map(id => ({ id, name: 'Unknown Skill' }));
    }
    
    const skills = await SkillModel.find({ _id: { $in: skillIds } });
    const skillMap = {};
    
    skills.forEach(skill => {
      skillMap[skill._id.toString()] = skill.name;
    });
    
    return skillIds.map(id => ({
      id: id,
      name: skillMap[id.toString()] || 'Unknown Skill'
    }));
  } catch (error) {
    console.error(`Error getting ${skillType} skill names:`, error);
    return skillIds.map(id => ({ id, name: 'Unknown Skill' }));
  }
};

// Function to calculate experience score
const calculateExperienceScore = (agent, gig) => {
  if (
    !gig.seniority?.yearsExperience ||
    !agent.professionalSummary?.yearsOfExperience
  ) {
    console.log("Missing experience data:", {
      agent: agent._id,
      gig: gig._id,
      gigExperience: gig.seniority?.yearsExperience,
      agentExperience: agent.professionalSummary?.yearsOfExperience,
    });
    return {
      score: 0.5,
      status: "partial_match",
      details: {
        agentExperience: agent.professionalSummary?.yearsOfExperience || 0,
        gigExperience: gig.seniority?.yearsExperience || 0,
        reason: "Missing experience data - using neutral score"
      }
    };
  }

  // Extraire les années d'expérience
  const agentExperience = parseInt(agent.professionalSummary.yearsOfExperience) || 0;
  const gigExperience = parseInt(gig.seniority.yearsExperience) || 0;

  console.log("Experience comparison:", {
    agentId: agent._id,
    gigId: gig._id,
    agentExperience,
    gigExperience,
    isExactMatch: agentExperience === gigExperience,
    isSufficient: agentExperience >= gigExperience,
  });

  let score = 0;
  let status = "no_match";
  let reason = "";

  // Logique de scoring basée sur la correspondance des années d'expérience
  if (agentExperience >= gigExperience) {
    // L'agent a suffisamment d'expérience
    if (agentExperience === gigExperience) {
      score = 1.0;
      status = "perfect_match";
      reason = "Exact experience match";
    } else if (agentExperience <= gigExperience * 1.5) {
      score = 0.9;
      status = "perfect_match";
      reason = "Slightly more experience (good)";
    } else if (agentExperience <= gigExperience * 2) {
      score = 0.8;
      status = "partial_match";
      reason = "More experience but acceptable";
    } else {
      score = 0.7;
      status = "partial_match";
      reason = "Much more experience (may be overqualified)";
    }
  } else {
    // L'agent n'a pas assez d'expérience
    if (agentExperience >= gigExperience * 0.8) {
      score = 0.6;
      status = "partial_match";
      reason = "Almost sufficient experience";
    } else if (agentExperience >= gigExperience * 0.6) {
      score = 0.4;
      status = "partial_match";
      reason = "Partially sufficient experience";
    } else if (agentExperience >= gigExperience * 0.4) {
      score = 0.2;
      status = "no_match";
      reason = "Insufficient experience";
    } else {
      score = 0.0;
      status = "no_match";
      reason = "Completely insufficient experience";
    }
  }

  return {
    score,
    status,
    details: {
      agentExperience,
      gigExperience,
      difference: agentExperience - gigExperience,
      reason
    }
  };
};

// Get all matches
export const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('agentId')
      .populate('gigId');
    res.status(StatusCodes.OK).json(matches);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get a specific match by ID with language matching
export const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('agentId')
      .populate('gigId');
    
    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Match not found' });
    }

    // Calculer le score de matching des langues
    const languageMatches = findLanguageMatches(match.gigId, [match.agentId]);
    const languageMatch = languageMatches[0] || {
      score: 0,
      details: {
        matchingLanguages: [],
        missingLanguages: match.gigId.skills?.languages || [],
        insufficientLanguages: [],
        matchStatus: "no_match"
      }
    };

    // Calculer les correspondances de timezone et région
    const gigTimezoneId = match.gigId.availability?.time_zone || match.gigId.availability?.timeZone;
    const agentTimezoneId = match.agentId.availability?.timeZone;
    
    const timezoneMatch = await compareTimezones(gigTimezoneId, agentTimezoneId);
    const regionMatch = await compareRegions(match.gigId.destination_zone, agentTimezoneId);

    // Ajouter les détails du matching à la réponse
    const response = {
      ...match.toObject(),
      languageMatch: {
        score: languageMatch.score,
        details: languageMatch.details
      },
      timezoneMatch: {
        score: timezoneMatch.score,
        details: timezoneMatch.details,
        matchStatus: timezoneMatch.status
      },
      regionMatch: {
        score: regionMatch.score,
        details: regionMatch.details,
        matchStatus: regionMatch.status
      }
    };

    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get matches for a specific agent
export const getMatchesForAgent = async (req, res) => {
  try {
    const matches = await Match.find({ agentId: req.params.agentId })
      .populate('gigId');
    res.status(StatusCodes.OK).json(matches);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get matches for a specific gig
export const getMatchesForGig = async (req, res) => {
  try {
    const matches = await Match.find({ gigId: req.params.gigId })
      .populate('agentId');
    res.status(StatusCodes.OK).json(matches);
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

    // Add timezone comparison function
const compareTimezones = async (gigTimezoneId, agentTimezoneId) => {
  try {

    // Gestion des différents formats de timezone
    let gigTimezone = null;
    let agentTimezone = null;

    // Pour le gig
    if (gigTimezoneId) {
      try {
        if (typeof gigTimezoneId === 'object' && gigTimezoneId.$oid) {
          // C'est un ObjectId MongoDB
          gigTimezone = await Timezone.findById(gigTimezoneId.$oid);
        } else if (typeof gigTimezoneId === 'string' && gigTimezoneId.match(/^[0-9a-fA-F]{24}$/)) {
          // C'est un ObjectId valide
          gigTimezone = await Timezone.findById(gigTimezoneId);
        } else if (typeof gigTimezoneId === 'string') {
          // C'est une chaîne de timezone (ex: "America/Chicago")
          gigTimezone = await Timezone.findOne({ zoneName: gigTimezoneId });
        }
      } catch (error) {
        // Error finding gig timezone in compareTimezones
      }
    }

    // Pour l'agent
    if (agentTimezoneId) {
      try {
        if (typeof agentTimezoneId === 'object' && agentTimezoneId.$oid) {
          // C'est un ObjectId MongoDB
          agentTimezone = await Timezone.findById(agentTimezoneId.$oid);
        } else if (typeof agentTimezoneId === 'string' && agentTimezoneId.match(/^[0-9a-fA-F]{24}$/)) {
          // C'est un ObjectId valide
          agentTimezone = await Timezone.findById(agentTimezoneId);
        } else if (typeof agentTimezoneId === 'string') {
          // C'est une chaîne de timezone
          agentTimezone = await Timezone.findOne({ zoneName: agentTimezoneId });
        }
      } catch (error) {
        // Error finding agent timezone in compareTimezones
      }
    }
    
    if (!gigTimezone || !agentTimezone) {
      
      // Si aucune timezone n'est trouvée, retourner un score neutre au lieu d'un no_match
      return {
        score: 0.5, // Score neutre
        status: "partial_match", // Permettre le matching
        details: {
          gigTimezone: gigTimezone?.zoneName || 'Unknown',
          agentTimezone: agentTimezone?.zoneName || 'Unknown',
          gigGmtOffset: gigTimezone?.gmtOffset || null,
          agentGmtOffset: agentTimezone?.gmtOffset || null,
          gigGmtDisplay: gigTimezone?.gmtOffset ? `GMT ${gigTimezone.gmtOffset >= 0 ? '+' : ''}${Math.round(gigTimezone.gmtOffset / 3600)}` : 'Unknown',
          agentGmtDisplay: agentTimezone?.gmtOffset ? `GMT ${agentTimezone.gmtOffset >= 0 ? '+' : ''}${Math.round(agentTimezone.gmtOffset / 3600)}` : 'Unknown',
          gmtOffsetDifference: null,
          reason: 'Timezone data not found - using neutral score'
        }
      };
    }

    const gmtOffsetDifference = Math.abs(gigTimezone.gmtOffset - agentTimezone.gmtOffset);
    
    // Formater les décalages GMT pour l'affichage
    const formatGmtOffset = (offset) => {
      const hours = Math.round(offset / 3600);
      return `GMT ${hours >= 0 ? '+' : ''}${hours}`;
    };
    


    // Définir les seuils de compatibilité
    let score = 0;
    let status = "no_match";
    let reason = "";

    if (gmtOffsetDifference === 0) {
      // Même timezone - match parfait
      score = 1.0;
      status = "perfect_match";
      reason = "Same timezone";
    } else if (gmtOffsetDifference <= 3600) {
      // Différence de 1 heure ou moins - compatible
      score = 0.7;
      status = "partial_match";
      reason = "Compatible timezone (≤1 hour difference)";
    } else if (gmtOffsetDifference <= 7200) {
      // Différence de 2 heures - partiellement compatible
      score = 0.5;
      status = "partial_match";
      reason = "Partially compatible timezone (≤2 hours difference)";
    } else if (gmtOffsetDifference <= 10800) {
      // Différence de 3 heures - difficile mais possible
      score = 0.3;
      status = "partial_match";
      reason = "Difficult but possible timezone (≤3 hours difference)";
    } else if (gmtOffsetDifference <= 14400) {
      // Différence de 4 heures - très difficile
      score = 0.1;
      status = "partial_match";
      reason = "Very difficult timezone (≤4 hours difference)";
    } else {
      // Différence de plus de 4 heures - pas compatible
      score = 0.0;
      status = "no_match";
      reason = "Incompatible timezone (>4 hours difference)";
    }

    return {
      score,
      status,
      details: {
        gigTimezone: gigTimezone.zoneName,
        agentTimezone: agentTimezone.zoneName,
        gigGmtOffset: gigTimezone.gmtOffset,
        agentGmtOffset: agentTimezone.gmtOffset,
        gigGmtDisplay: formatGmtOffset(gigTimezone.gmtOffset),
        agentGmtDisplay: formatGmtOffset(agentTimezone.gmtOffset),
        gmtOffsetDifference,
        reason
      }
    };
  } catch (error) {
    return {
      score: 0,
      status: "no_match",
      details: {
        gigTimezone: 'Unknown',
        agentTimezone: 'Unknown',
        gigGmtOffset: null,
        agentGmtOffset: null,
        gigGmtDisplay: 'Unknown',
        agentGmtDisplay: 'Unknown',
        gmtOffsetDifference: null,
        reason: 'Error comparing timezones'
      }
    };
  }
};

// Add region comparison function
const compareRegions = async (gigDestinationZone, agentTimezoneId) => {
  try {

    // Si le gig n'a pas de destination_zone, retourner un score neutre
    if (!gigDestinationZone) {
      return {
        score: 0.5, // Score neutre
        status: "partial_match",
        details: {
          gigDestinationZone: 'Unknown',
          agentCountryCode: 'Unknown',
          agentCountryName: 'Unknown',
          reason: 'Gig destination zone not found - using neutral score'
        }
      };
    }

    // Récupérer le countryCode de l'agent à partir de son timezone
    let agentTimezone = null;
    let agentCountryCode = null;
    let agentCountryName = null;

    if (agentTimezoneId) {
      try {
        if (typeof agentTimezoneId === 'object' && agentTimezoneId.$oid) {
          // C'est un ObjectId MongoDB
          agentTimezone = await Timezone.findById(agentTimezoneId.$oid);
        } else if (typeof agentTimezoneId === 'string' && agentTimezoneId.match(/^[0-9a-fA-F]{24}$/)) {
          // C'est un ObjectId valide
          agentTimezone = await Timezone.findById(agentTimezoneId);
        } else if (typeof agentTimezoneId === 'string') {
          // C'est une chaîne de timezone
          agentTimezone = await Timezone.findOne({ zoneName: agentTimezoneId });
        }
      } catch (error) {
        // Error finding agent timezone in compareRegions
      }
    }

    if (agentTimezone) {
      agentCountryCode = agentTimezone.countryCode;
      agentCountryName = agentTimezone.countryName;
    }



    // Si on ne peut pas récupérer le countryCode de l'agent, retourner un score neutre
    if (!agentCountryCode) {
      return {
        score: 0.5, // Score neutre
        status: "partial_match",
        details: {
          gigDestinationZone,
          agentCountryCode: 'Unknown',
          agentCountryName: 'Unknown',
          reason: 'Agent country code not found - using neutral score'
        }
      };
    }

    // Comparer les codes de pays
    const isSameRegion = gigDestinationZone.toUpperCase() === agentCountryCode.toUpperCase();
    


    let score = 0;
    let status = "no_match";
    let reason = "";

    if (isSameRegion) {
      // Même région - match parfait
      score = 1.0;
      status = "perfect_match";
      reason = "Same region/country";
    } else {
      // Régions différentes - pas de match
      score = 0.0;
      status = "no_match";
      reason = "Different regions/countries";
    }

    return {
      score,
      status,
      details: {
        gigDestinationZone,
        agentCountryCode,
        agentCountryName,
        reason
      }
    };
  } catch (error) {
    return {
      score: 0,
      status: "no_match",
      details: {
        gigDestinationZone: 'Unknown',
        agentCountryCode: 'Unknown',
        agentCountryName: 'Unknown',
        reason: 'Error comparing regions'
      }
    };
  }
};

// Add schedule comparison function
const compareSchedules = (gigSchedule, agentAvailability) => {
  // Si l'agent n'a pas de disponibilité, on considère qu'il n'est pas disponible
  if (!agentAvailability) {
    return {
      score: 0,
      status: "no_match",
      details: {
        matchingDays: [],
        missingDays: gigSchedule.map(day => day.day),
        insufficientHours: []
      }
    };
  }

  // Normaliser la structure de disponibilité de l'agent
  let normalizedAgentSchedule = [];
  
  if (agentAvailability.schedule && Array.isArray(agentAvailability.schedule)) {
    // Utiliser la structure détaillée si elle existe
    normalizedAgentSchedule = agentAvailability.schedule;
  } else if (agentAvailability.days && Array.isArray(agentAvailability.days) && agentAvailability.hours) {
    // Convertir la structure simple en structure détaillée
    normalizedAgentSchedule = agentAvailability.days.map(day => ({
      day: day,
      hours: {
        start: agentAvailability.hours.start,
        end: agentAvailability.hours.end
      }
    }));
  } else {
    // Aucune disponibilité valide
    return {
      score: 0,
      status: "no_match",
      details: {
        matchingDays: [],
        missingDays: gigSchedule.map(day => day.day),
        insufficientHours: []
      }
    };
  }

  let matchingDays = 0;
  let totalDays = gigSchedule.length;
  let scheduleDetails = {
    matchingDays: [],
    missingDays: [],
    insufficientHours: []
  };

  // Vérifier si l'agent a des flexibilités
  const hasFlexibility = agentAvailability.flexibility && agentAvailability.flexibility.length > 0;
  const isFlexible = hasFlexibility && (
    agentAvailability.flexibility.includes('Flexible Hours') ||
    agentAvailability.flexibility.includes('Split Shifts')
  );

  // Vérifier si tous les jours du gig sont couverts par l'agent
  const agentDays = normalizedAgentSchedule.map(day => day.day);
  const missingDays = gigSchedule
    .filter(gigDay => !agentDays.includes(gigDay.day))
    .map(gigDay => gigDay.day);

  if (missingDays.length > 0) {
    return {
      score: 0,
      status: "no_match",
      details: {
        matchingDays: [],
        missingDays: missingDays,
        insufficientHours: []
      }
    };
  }

  gigSchedule.forEach(gigDay => {
    if (!gigDay || !gigDay.day || !gigDay.hours) {
      return;
    }

    const agentDay = normalizedAgentSchedule.find(day => day && day.day === gigDay.day);
    
    if (!agentDay || !agentDay.hours) {
      scheduleDetails.missingDays.push(gigDay.day);
      return;
    }

    const convertToMinutes = (timeStr) => {
      if (!timeStr) return 0;
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const gigStart = convertToMinutes(gigDay.hours.start);
    const gigEnd = convertToMinutes(gigDay.hours.end);
    const agentStart = convertToMinutes(agentDay.hours.start);
    const agentEnd = convertToMinutes(agentDay.hours.end);

    // Vérifier si l'agent couvre complètement les heures du gig
    if (agentStart <= gigStart && agentEnd >= gigEnd) {
      matchingDays++;
      scheduleDetails.matchingDays.push({
        day: gigDay.day,
        gigHours: gigDay.hours,
        agentHours: agentDay.hours
      });
    } else {
      scheduleDetails.insufficientHours.push({
        day: gigDay.day,
        gigHours: gigDay.hours,
        agentHours: agentDay.hours
      });
    }
  });

  const scheduleScore = matchingDays / totalDays;
  const scheduleStatus = scheduleScore === 1 ? "perfect_match" :
                       scheduleScore > 0 ? "partial_match" : "no_match";

  return {
    score: scheduleScore,
    status: scheduleStatus,
    details: scheduleDetails
  };
};

/**
 * Trouve les correspondances linguistiques pour un gig spécifique
 * Cette fonction recherche les agents dont les compétences linguistiques correspondent aux exigences du gig
 * @param {Object} req - La requête HTTP contenant l'ID du gig dans req.params.id
 * @param {Object} res - L'objet de réponse HTTP
 * @returns {Object} Liste des agents correspondants avec leurs scores et détails de correspondance
 */
export const findMatchesForGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }

    console.log('🔍 Gig found:', {
      id: gig._id,
      title: gig.title,
      industries: gig.industries,
      industriesType: typeof gig.industries,
      industriesLength: gig.industries?.length
    });



    // Get weights from request body or use defaults
    const weights = req.body.weights || { 
      skills: 0.20, 
      languages: 0.15, 
      experience: 0.20, 
      region: 0.15,
      schedule: 0.10, 
      timezone: 0.10, 
      industry: 0.10,
      weight: 0.10,
      activity: 0.10
    };

    // Normaliser les poids pour supporter les deux noms (industry et weight)
    if (weights.weight !== undefined && weights.industry === undefined) {
      weights.industry = weights.weight;
    } else if (weights.industry !== undefined && weights.weight === undefined) {
      weights.weight = weights.industry;
    }



    const agents = await Agent.find({})
      .select('personalInfo skills availability professionalSummary');

    console.log('🔍 Agents found:', agents.map(agent => ({
      name: agent.personalInfo?.name,
      hasActivities: !!agent.professionalSummary?.activities,
      activitiesCount: agent.professionalSummary?.activities?.length || 0,
      activities: agent.professionalSummary?.activities
    })));


    


    // Filtrer les agents qui ont des langues seulement si le poids des langues > 0
    let agentsWithLanguages = agents;
    if (weights.languages > 0) {
      agentsWithLanguages = agents.filter(agent => {
        const hasLanguages = agent.personalInfo?.languages && agent.personalInfo.languages.length > 0;
        return hasLanguages;
      });
    } else {
      agentsWithLanguages = agents;
    }

    // Filtrer les agents qui ont des industries seulement si le poids des industries > 0
    let agentsWithIndustries = agentsWithLanguages;
    if (weights.industry > 0 || weights.weight > 0) {
      agentsWithIndustries = agentsWithLanguages.filter(agent => {
        const hasIndustries = agent.professionalSummary?.industries && agent.professionalSummary.industries.length > 0;
        return hasIndustries;
      });
    } else {
      agentsWithIndustries = agentsWithLanguages;
    }

    // Filtrer les agents qui ont des activités seulement si le poids des activités > 0
    let agentsWithActivities = agentsWithIndustries;
    if (weights.activity > 0) {
      agentsWithActivities = agentsWithIndustries.filter(agent => {
        const hasActivities = agent.professionalSummary?.activities && agent.professionalSummary.activities.length > 0;
        return hasActivities;
      });
    } else {
      agentsWithActivities = agentsWithIndustries;
    }



    const matches = await Promise.all(agentsWithActivities.map(async agent => {


      // Language matching - utiliser les IDs et récupérer les noms
      const requiredLanguages = gig.skills?.languages || [];
      const agentLanguages = agent.personalInfo?.languages || [];
      
      // Récupérer les noms des langues
      const gigLanguageIds = requiredLanguages.map(lang => lang.language);
      const agentLanguageIds = agentLanguages.map(lang => lang.language);
      
      const [gigLanguageNames, agentLanguageNames] = await Promise.all([
        getLanguageNames(gigLanguageIds),
        getLanguageNames(agentLanguageIds)
      ]);
      
      // Créer les mappings pour les langues
      const gigLanguageMap = {};
      const agentLanguageMap = {};
      
      gigLanguageNames.forEach(lang => {
        gigLanguageMap[lang.id.toString()] = lang.name;
      });
      
      agentLanguageNames.forEach(lang => {
        agentLanguageMap[lang.id.toString()] = lang.name;
      });
      


      let matchingLanguages = [];
      let missingLanguages = [];
      let insufficientLanguages = [];

      requiredLanguages.forEach(reqLang => {
        if (!reqLang?.language) return;
        
        const reqLangId = reqLang.language?.toString();
        const reqLangName = gigLanguageMap[reqLangId] || 'Unknown Language';
        


        const agentLang = agentLanguages.find(
          lang => lang?.language && lang.language.toString() === reqLangId
        );

        if (agentLang) {
          const agentLangName = agentLanguageMap[reqLangId] || 'Unknown Language';

          
          // Normalize proficiency levels for comparison
          const normalizedReqLevel = normalizeLanguage(reqLang.proficiency);
          const normalizedAgentLevel = normalizeLanguage(agentLang.proficiency);
          
          // Check if the required level is native or C2
          const isNativeRequired = ['native', 'natif', 'c2'].includes(normalizedReqLevel);
          
          // For native/C2 level, only accept native, natif or C2 proficiency
          let isLevelMatch = isNativeRequired 
            ? ['native', 'natif', 'c2'].includes(normalizedAgentLevel)
            : getLanguageLevelScore(normalizedAgentLevel) >= getLanguageLevelScore(normalizedReqLevel);

          // Vérification de sécurité : forcer la logique correcte
          const agentScore = getLanguageLevelScore(normalizedAgentLevel);
          const requiredScore = getLanguageLevelScore(normalizedReqLevel);
          

          
          // Si l'agent a un niveau inférieur, c'est forcément un no_match
          if (agentScore < requiredScore) {
            isLevelMatch = false;

          } else {
            // Si l'agent a un niveau suffisant, confirmer le match
            isLevelMatch = true;

          }



          if (isLevelMatch) {

            matchingLanguages.push({
              language: reqLang.language,
              languageName: reqLangName,
              requiredLevel: reqLang.proficiency,
              agentLevel: agentLang.proficiency
            });
          } else {

            insufficientLanguages.push({
              language: reqLang.language,
              languageName: reqLangName,
              requiredLevel: reqLang.proficiency,
              agentLevel: agentLang.proficiency
            });
          }
        } else {
          missingLanguages.push({
            language: reqLang.language,
            languageName: reqLangName,
            requiredLevel: reqLang.proficiency
          });
        }
      });

      // Industry matching - comparer les IDs des industries
      // Extraire les IDs des industries (gérer les formats $oid et ObjectId)
      const gigIndustryIds = (gig.industries || []).map(industry => {
        if (typeof industry === 'object' && industry.$oid) {
          return industry.$oid;
        } else if (typeof industry === 'object' && industry._id) {
          return industry._id;
        } else {
          return industry;
        }
      });
      
      const agentIndustryIds = (agent.professionalSummary?.industries || []).map(industry => {
        if (typeof industry === 'object' && industry.$oid) {
          return industry.$oid;
        } else if (typeof industry === 'object' && industry._id) {
          return industry._id;
        } else {
          return industry;
        }
      });
      
      console.log('🏭 Industry comparison for', agent.personalInfo?.name, ':', {
        gigIndustries: gigIndustryIds,
        agentIndustries: agentIndustryIds,
        industryWeight: weights.industry,
        weightWeight: weights.weight,
        gigRaw: gig.industries,
        agentRaw: agent.professionalSummary?.industries
      });

      // Récupérer les noms des industries pour l'affichage
      const [gigIndustryNames, agentIndustryNames] = await Promise.all([
        getIndustryNames(gigIndustryIds),
        getIndustryNames(agentIndustryIds)
      ]);
      
      // Créer les mappings pour les industries
      const gigIndustryMap = {};
      const agentIndustryMap = {};
      
      gigIndustryNames.forEach(industry => {
        gigIndustryMap[industry.id.toString()] = industry.name;
      });
      
      agentIndustryNames.forEach(industry => {
        agentIndustryMap[industry.id.toString()] = industry.name;
      });

      let matchingIndustries = [];
      let missingIndustries = [];
      let industryMatchStatus;

      // Gérer le cas où le gig n'a pas d'industries définies
      if (gigIndustryIds.length === 0) {
        // Si le gig n'a pas d'industries, considérer comme un match neutre
        // car on ne peut pas évaluer la correspondance
        industryMatchStatus = "neutral_match";
        
        console.log('✅ Industry match result (no gig industries):', {
          agent: agent.personalInfo?.name,
          status: industryMatchStatus,
          reason: 'Gig has no industries defined - using neutral match'
        });
      } else {
        // Vérifier si l'agent a au moins une des industries requises par le gig
        gigIndustryIds.forEach(gigIndustryId => {
          if (!gigIndustryId) return;
          
          const gigIndustryIdStr = gigIndustryId.toString();
          const gigIndustryName = gigIndustryMap[gigIndustryIdStr] || 'Unknown Industry';
          
          const agentHasIndustry = agentIndustryIds.some(
            agentIndustryId => agentIndustryId && agentIndustryId.toString() === gigIndustryIdStr
          );

          if (agentHasIndustry) {
            const agentIndustryName = agentIndustryMap[gigIndustryIdStr] || 'Unknown Industry';
            matchingIndustries.push({
              industry: gigIndustryId,
              industryName: gigIndustryName,
              agentIndustryName: agentIndustryName
            });
          } else {
            missingIndustries.push({
              industry: gigIndustryId,
              industryName: gigIndustryName
            });
          }
        });

        // Déterminer le statut du matching des industries
        industryMatchStatus = matchingIndustries.length === gigIndustryIds.length ? "perfect_match" : 
                             matchingIndustries.length > 0 ? "partial_match" : "no_match";

        console.log('✅ Industry match result:', {
          agent: agent.personalInfo?.name,
          matchingIndustries: matchingIndustries.length,
          missingIndustries: missingIndustries.length,
          status: industryMatchStatus,
          gigIndustryIds,
          agentIndustryIds,
          matchingIndustriesDetails: matchingIndustries
        });
      }

      // Activity matching - comparer les IDs des activités
      // Extraire les IDs des activités (gérer les formats $oid et ObjectId)
      const gigActivityIds = (gig.activities || []).map(activity => {
        if (typeof activity === 'object' && activity.$oid) {
          return activity.$oid;
        } else if (typeof activity === 'object' && activity._id) {
          return activity._id;
        } else {
          return activity;
        }
      });
      
      const agentActivityIds = (agent.professionalSummary?.activities || []).map(activity => {
        if (typeof activity === 'object' && activity.$oid) {
          return activity.$oid;
        } else if (typeof activity === 'object' && activity._id) {
          return activity._id;
        } else {
          return activity;
        }
      });
      
      console.log('🎯 Activity comparison for', agent.personalInfo?.name, ':', {
        gigActivities: gigActivityIds,
        agentActivities: agentActivityIds,
        activityWeight: weights.activity,
        gigRaw: gig.activities,
        agentRaw: agent.professionalSummary?.activities
      });

      // Récupérer les noms des activités pour l'affichage
      const [gigActivityNames, agentActivityNames] = await Promise.all([
        getActivityNames(gigActivityIds),
        getActivityNames(agentActivityIds)
      ]);
      
      // Créer les mappings pour les activités
      const gigActivityMap = {};
      const agentActivityMap = {};
      
      gigActivityNames.forEach(activity => {
        gigActivityMap[activity.id.toString()] = activity.name;
      });
      
      agentActivityNames.forEach(activity => {
        agentActivityMap[activity.id.toString()] = activity.name;
      });

      let matchingActivities = [];
      let missingActivities = [];
      let activityMatchStatus;

      // Gérer le cas où le gig n'a pas d'activités définies
      if (gigActivityIds.length === 0) {
        // Si le gig n'a pas d'activités, considérer comme un match neutre
        activityMatchStatus = "neutral_match";
        
        console.log('✅ Activity match result (no gig activities):', {
          agent: agent.personalInfo?.name,
          status: activityMatchStatus,
          reason: 'Gig has no activities defined - using neutral match'
        });
      } else {
        // Vérifier si l'agent a au moins une des activités requises par le gig
        gigActivityIds.forEach(gigActivityId => {
          if (!gigActivityId) return;
          
          const gigActivityIdStr = gigActivityId.toString();
          const gigActivityName = gigActivityMap[gigActivityIdStr] || 'Unknown Activity';
          
          const agentHasActivity = agentActivityIds.some(
            agentActivityId => agentActivityId && agentActivityId.toString() === gigActivityIdStr
          );

          if (agentHasActivity) {
            const agentActivityName = agentActivityMap[gigActivityIdStr] || 'Unknown Activity';
            matchingActivities.push({
              activity: gigActivityId,
              activityName: gigActivityName,
              agentActivityName: agentActivityName
            });
          } else {
            missingActivities.push({
              activity: gigActivityId,
              activityName: gigActivityName
            });
          }
        });

        // Déterminer le statut du matching des activités
        activityMatchStatus = matchingActivities.length === gigActivityIds.length ? "perfect_match" : 
                             matchingActivities.length > 0 ? "partial_match" : "no_match";

        console.log('✅ Activity match result:', {
          agent: agent.personalInfo?.name,
          matchingActivities: matchingActivities.length,
          missingActivities: missingActivities.length,
          status: activityMatchStatus,
          gigActivityIds,
          agentActivityIds,
          matchingActivitiesDetails: matchingActivities
        });
      }

      // Skills matching - utiliser les IDs directement
      const gigTechnicalSkillIds = (gig.skills?.technical || []).map(s => s.skill);
      const gigProfessionalSkillIds = (gig.skills?.professional || []).map(s => s.skill);
      const gigSoftSkillIds = (gig.skills?.soft || []).map(s => s.skill);
      
      const agentTechnicalSkillIds = (agent.skills?.technical || []).map(s => s.skill);
      const agentProfessionalSkillIds = (agent.skills?.professional || []).map(s => s.skill);
      const agentSoftSkillIds = (agent.skills?.soft || []).map(s => s.skill);
      
      // Récupérer les noms des skills pour l'affichage
      const [gigTechnicalSkills, gigProfessionalSkills, gigSoftSkills, 
             agentTechnicalSkills, agentProfessionalSkills, agentSoftSkills] = await Promise.all([
        getSkillNames(gigTechnicalSkillIds, 'technical'),
        getSkillNames(gigProfessionalSkillIds, 'professional'),
        getSkillNames(gigSoftSkillIds, 'soft'),
        getSkillNames(agentTechnicalSkillIds, 'technical'),
        getSkillNames(agentProfessionalSkillIds, 'professional'),
        getSkillNames(agentSoftSkillIds, 'soft')
      ]);

      // Experience matching
      const gigRequiredExperience = parseInt(gig.seniority?.yearsExperience) || 0;
      const agentExperience = parseInt(agent.professionalSummary?.yearsOfExperience) || 0;
      
      console.log('📊 Experience comparison for', agent.personalInfo?.name, ':', {
        gigRequired: gigRequiredExperience,
        agentExperience: agentExperience,
        gigSeniority: gig.seniority,
        agentProfessionalSummary: agent.professionalSummary
      });

      let experienceMatch = {
        score: 0,
        details: {
          gigRequiredExperience,
          agentExperience,
          difference: agentExperience - gigRequiredExperience,
          reason: ''
        },
        status: 'no_match'
      };

      if (agentExperience >= gigRequiredExperience) {
        if (agentExperience === gigRequiredExperience) {
          experienceMatch = {
            score: 1,
            details: {
              gigRequiredExperience,
              agentExperience,
              difference: 0,
              reason: 'Perfect match - agent has exactly the required experience'
            },
            status: 'perfect_match'
          };
        } else {
          // Bonus pour l'expérience supplémentaire, mais pas plus de 1.2
          const bonusScore = Math.min(1.2, 1 + (agentExperience - gigRequiredExperience) * 0.1);
          experienceMatch = {
            score: bonusScore,
            details: {
              gigRequiredExperience,
              agentExperience,
              difference: agentExperience - gigRequiredExperience,
              reason: `Agent has ${agentExperience - gigRequiredExperience} more years of experience than required`
            },
            status: 'perfect_match'
          };
        }
      } else {
        experienceMatch = {
          score: Math.max(0, 1 - (gigRequiredExperience - agentExperience) * 0.2),
          details: {
            gigRequiredExperience,
            agentExperience,
            difference: agentExperience - gigRequiredExperience,
            reason: `Agent has ${gigRequiredExperience - agentExperience} fewer years of experience than required`
          },
          status: 'partial_match'
        };
      }

      console.log('✅ Experience match result:', {
        agent: agent.personalInfo?.name,
        score: experienceMatch.score,
        status: experienceMatch.status,
        reason: experienceMatch.details.reason
      });
      
      // Créer les mappings pour faciliter la recherche (GIG)
      const gigTechnicalSkillMap = {};
      const gigProfessionalSkillMap = {};
      const gigSoftSkillMap = {};
      
      gig.skills?.technical?.forEach((s, index) => {
        if (gigTechnicalSkills[index]) {
          gigTechnicalSkillMap[s.skill.toString()] = {
            ...s,
            name: gigTechnicalSkills[index].name
          };
        }
      });
      
      gig.skills?.professional?.forEach((s, index) => {
        if (gigProfessionalSkills[index]) {
          gigProfessionalSkillMap[s.skill.toString()] = {
            ...s,
            name: gigProfessionalSkills[index].name
          };
        }
      });
      
      gig.skills?.soft?.forEach((s, index) => {
        if (gigSoftSkills[index]) {
          gigSoftSkillMap[s.skill.toString()] = {
            ...s,
            name: gigSoftSkills[index].name
          };
        }
      });

      // Créer les mappings pour faciliter la recherche (AGENT)
      const agentTechnicalSkillMap = {};
      const agentProfessionalSkillMap = {};
      const agentSoftSkillMap = {};
      
      agent.skills?.technical?.forEach((s, index) => {
        if (agentTechnicalSkills[index]) {
          agentTechnicalSkillMap[s.skill.toString()] = {
            ...s,
            name: agentTechnicalSkills[index].name
          };
        }
      });
      
      agent.skills?.professional?.forEach((s, index) => {
        if (agentProfessionalSkills[index]) {
          agentProfessionalSkillMap[s.skill.toString()] = {
            ...s,
            name: agentProfessionalSkills[index].name
          };
        }
      });
      
      agent.skills?.soft?.forEach((s, index) => {
        if (agentSoftSkills[index]) {
          agentSoftSkillMap[s.skill.toString()] = {
            ...s,
            name: agentSoftSkills[index].name
          };
        }
      });
      
      // Pour la réponse frontend, injecte le champ 'name' dans chaque skill du gig
      const gigSkillsWithNames = {
        technical: (gig.skills?.technical || []).map(s => ({
          ...s,
          name: gigTechnicalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        })),
        professional: (gig.skills?.professional || []).map(s => ({
          ...s,
          name: gigProfessionalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        })),
        soft: (gig.skills?.soft || []).map(s => ({
          ...s,
          name: gigSoftSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        })),
        languages: gig.skills?.languages || []
      };

      const requiredSkills = [
        ...(gig.skills?.technical || []).map(s => ({ 
          skill: s.skill, 
          level: s.level, 
          type: 'technical',
          name: gigTechnicalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        })),
        ...(gig.skills?.professional || []).map(s => ({ 
          skill: s.skill, 
          level: s.level, 
          type: 'professional',
          name: gigProfessionalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        })),
        ...(gig.skills?.soft || []).map(s => ({ 
          skill: s.skill, 
          level: s.level, 
          type: 'soft',
          name: gigSoftSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        }))
      ];

      const agentSkills = [
        ...(agent.skills?.technical || []).map(s => ({ 
          skill: s.skill, 
          level: s.level, 
          type: 'technical',
          name: agentTechnicalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        })),
        ...(agent.skills?.professional || []).map(s => ({ 
          skill: s.skill, 
          level: s.level, 
          type: 'professional',
          name: agentProfessionalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        })),
        ...(agent.skills?.soft || []).map(s => ({ 
          skill: s.skill, 
          level: s.level, 
          type: 'soft',
          name: agentSoftSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
        }))
      ];



      let matchingSkills = [];
      let missingSkills = [];
      let insufficientSkills = [];

      // Check if agent has all required skills by ID
      const hasAllRequiredSkills = requiredSkills.every(reqSkill => {
        if (!reqSkill?.skill) return true;
        
        // Comparer uniquement les IDs des skills
        const agentSkill = agentSkills.find(
          skill => skill?.skill && skill.skill.toString() === reqSkill.skill.toString() && skill.type === reqSkill.type
        );

        if (agentSkill) {


          // Si l'agent a la skill (même ID), c'est un match, peu importe le niveau
          matchingSkills.push({
            skill: reqSkill.skill,
            skillName: reqSkill.name,
            requiredLevel: reqSkill.level,
            agentLevel: agentSkill.level,
            type: reqSkill.type,
            agentSkillName: agentSkill.name
          });
          return true;
        } else {

          missingSkills.push({
            skill: reqSkill.skill,
            skillName: reqSkill.name,
            type: reqSkill.type,
            requiredLevel: reqSkill.level
          });
          return false;
        }
      });

          // Timezone matching
    const gigTimezoneId = gig.availability?.time_zone || gig.availability?.timeZone;
    const agentTimezoneId = agent.availability?.timeZone;
    
    // Récupérer les données de timezone avec gestion d'erreur
    let gigTimezoneData = null;
    let agentTimezoneData = null;
    
    try {
      if (gigTimezoneId) {
        if (typeof gigTimezoneId === 'object' && gigTimezoneId.$oid) {
          gigTimezoneData = await Timezone.findById(gigTimezoneId.$oid);
        } else if (typeof gigTimezoneId === 'string' && gigTimezoneId.match(/^[0-9a-fA-F]{24}$/)) {
          gigTimezoneData = await Timezone.findById(gigTimezoneId);
        } else if (typeof gigTimezoneId === 'string') {
          gigTimezoneData = await Timezone.findOne({ zoneName: gigTimezoneId });
        }
      }
    } catch (error) {
      // Error finding gig timezone
    }
    
    try {
      if (agentTimezoneId) {
        if (typeof agentTimezoneId === 'object' && agentTimezoneId.$oid) {
          agentTimezoneData = await Timezone.findById(agentTimezoneId.$oid);
        } else if (typeof agentTimezoneId === 'string' && agentTimezoneId.match(/^[0-9a-fA-F]{24}$/)) {
          agentTimezoneData = await Timezone.findById(agentTimezoneId);
        } else if (typeof agentTimezoneId === 'string') {
          agentTimezoneData = await Timezone.findOne({ zoneName: agentTimezoneId });
        }
      }
    } catch (error) {
      // Error finding agent timezone
    }
    

    
    const timezoneMatch = await compareTimezones(gigTimezoneId, agentTimezoneId);

    // Region matching
    const regionMatch = await compareRegions(gig.destination_zone, agentTimezoneId);

    // Schedule matching
    const scheduleMatch = compareSchedules(gig.availability?.schedule, agent.availability);

      // Determine match status based on direct matches
      const languageMatchStatus = matchingLanguages.length === requiredLanguages.length ? "perfect_match" : 
                                 matchingLanguages.length > 0 ? "partial_match" : "no_match";
      
      // Skills match status - être plus flexible si l'agent n'a pas de compétences définies
      let skillsMatchStatus;
      const agentSkillsData = agent.skills || {};
      const hasNoSkills = (!agentSkillsData.technical || agentSkillsData.technical.length === 0) &&
                         (!agentSkillsData.professional || agentSkillsData.professional.length === 0) &&
                         (!agentSkillsData.soft || agentSkillsData.soft.length === 0);
      
      if (hasNoSkills) {
        // Si l'agent n'a pas de compétences définies, on considère que c'est un no_match
        skillsMatchStatus = "no_match";
      } else {
        // Sinon, on utilise la logique normale
        skillsMatchStatus = hasAllRequiredSkills ? "perfect_match" : "no_match";
      }



      // Overall match status - être moins strict et permettre des correspondances partielles
      const overallMatchStatus = (languageMatchStatus === "perfect_match" && 
                                skillsMatchStatus === "perfect_match" && 
                                industryMatchStatus === "perfect_match" &&
                                activityMatchStatus === "perfect_match" &&
                                experienceMatch.status === "perfect_match" &&
                                timezoneMatch.status === "perfect_match" &&
                                regionMatch.status === "perfect_match" &&
                                scheduleMatch.status === "perfect_match") ? "perfect_match" :
                                (languageMatchStatus === "no_match" && 
                                 skillsMatchStatus === "no_match" && 
                                 industryMatchStatus === "no_match" &&
                                 activityMatchStatus === "no_match" &&
                                 experienceMatch.status === "no_match" &&
                                 timezoneMatch.status === "no_match" &&
                                 regionMatch.status === "no_match" &&
                                 scheduleMatch.status === "no_match") ? "no_match" :
                                "partial_match";

      return {
        agentId: agent._id,
        agentInfo: {
          name: agent.personalInfo?.name || 'Unknown',
          email: agent.personalInfo?.email || 'Unknown',
          photo: agent.personalInfo?.photo || null,
          location: agent.personalInfo?.location || '',
          phone: agent.personalInfo?.phone || '',
          languages: agent.personalInfo?.languages?.map(lang => ({
            _id: lang._id,
            language: lang.language,
            languageName: agentLanguageMap[lang.language.toString()] || 'Unknown Language',
            proficiency: lang.proficiency,
            iso639_1: lang.iso639_1
          })) || [],
          professionalSummary: {
            ...agent.professionalSummary,
            yearsOfExperience: agent.professionalSummary?.yearsOfExperience || 0
          },
          skills: {
            technical: agent.skills?.technical?.map(s => ({
              _id: s._id,
              skill: s.skill,
              level: s.level,
              details: s.details,
              name: agentTechnicalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
            })) || [],
            professional: agent.skills?.professional?.map(s => ({
              _id: s._id,
              skill: s.skill,
              level: s.level,
              details: s.details,
              name: agentProfessionalSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
            })) || [],
            soft: agent.skills?.soft?.map(s => ({
              _id: s._id,
              skill: s.skill,
              level: s.level,
              details: s.details,
              name: agentSoftSkillMap[s.skill.toString()]?.name || 'Unknown Skill'
            })) || [],
            contactCenter: agent.skills?.contactCenter || []
          },
          experience: agent.experience || [],
          timezone: {
            timezoneId: agent.availability?.timeZone,
            timezoneName: agentTimezoneData?.zoneName || 'Unknown',
            gmtOffset: agentTimezoneData?.gmtOffset || null,
            gmtDisplay: agentTimezoneData?.gmtOffset ? `GMT ${agentTimezoneData.gmtOffset >= 0 ? '+' : ''}${Math.round(agentTimezoneData.gmtOffset / 3600)}` : 'Unknown',
            countryCode: agentTimezoneData?.countryCode || 'Unknown',
            countryName: agentTimezoneData?.countryName || 'Unknown'
          }
        },
        languageMatch: {
          details: {
            matchingLanguages,
            missingLanguages,
            insufficientLanguages,
            matchStatus: languageMatchStatus
          }
        },
        skillsMatch: {
          details: {
            matchingSkills,
            missingSkills,
            insufficientSkills,
            matchStatus: skillsMatchStatus
          }
        },
        industryMatch: {
          details: {
            matchingIndustries,
            missingIndustries,
            matchStatus: industryMatchStatus
          }
        },
        activityMatch: {
          details: {
            matchingActivities,
            missingActivities,
            matchStatus: activityMatchStatus
          }
        },
        experienceMatch: {
          score: experienceMatch.score,
          details: experienceMatch.details,
          matchStatus: experienceMatch.status
        },
        timezoneMatch: {
          score: timezoneMatch.score,
          details: timezoneMatch.details,
          matchStatus: timezoneMatch.status
        },
        regionMatch: {
          score: regionMatch.score,
          details: regionMatch.details,
          matchStatus: regionMatch.status
        },
        scheduleMatch: {
          score: scheduleMatch.score,
          details: scheduleMatch.details,
          matchStatus: scheduleMatch.status
        },
        matchStatus: overallMatchStatus
      };
    }));

    // Trouver le critère avec le poids le plus élevé
    const sortedWeights = Object.entries(weights)
      .filter(([, weight]) => weight > 0) // Ignorer les critères avec poids 0
      .sort(([, a], [, b]) => b - a);

    let filteredMatches = matches;

    console.log('🔍 Starting filtering with weights:', weights);
    console.log('🔍 Total agents before filtering:', matches.length);
    console.log('🔍 Agents with activities:', matches.filter(m => m.activityMatch).map(m => ({
      name: m.agentInfo.name,
      activityMatch: m.activityMatch.details.matchStatus
    })));
    
    // Appliquer le filtrage séquentiel basé sur les poids
    for (const [criterion, weight] of sortedWeights) {
      
      // Ignorer les critères avec un poids de 0
      if (weight === 0) {
        continue;
      }
      
      if (criterion === 'languages') {
        // Pour les langues, accepter uniquement les perfect_match
        filteredMatches = filteredMatches.filter(
          match => match.languageMatch.details.matchStatus === "perfect_match"
        );
      } else if (criterion === 'skills') {
        // Pour les compétences, accepter uniquement les perfect_match
        filteredMatches = filteredMatches.filter(match => {
          return match.skillsMatch.details.matchStatus === "perfect_match";
        });
      } else if (criterion === 'industry' || criterion === 'weight') {
        // Pour les industries, accepter les perfect_match et neutral_match
        const beforeCount = filteredMatches.length;
        filteredMatches = filteredMatches.filter(
          match => match.industryMatch.details.matchStatus === "perfect_match" || 
                   match.industryMatch.details.matchStatus === "neutral_match"
        );
        const afterCount = filteredMatches.length;
        console.log(`🔍 Industry filtering: ${beforeCount} -> ${afterCount} agents (criterion: ${criterion}, weight: ${weight})`);
        console.log('🔍 Industry match statuses:', filteredMatches.map(m => ({
          agent: m.agentInfo.name,
          status: m.industryMatch.details.matchStatus
        })));
      } else if (criterion === 'activity') {
        // Pour les activités, accepter les perfect_match et neutral_match
        const beforeCount = filteredMatches.length;
        filteredMatches = filteredMatches.filter(
          match => match.activityMatch.details.matchStatus === "perfect_match" || 
                   match.activityMatch.details.matchStatus === "neutral_match"
        );
        const afterCount = filteredMatches.length;
        console.log(`🔍 Activity filtering: ${beforeCount} -> ${afterCount} agents (criterion: ${criterion}, weight: ${weight})`);
        console.log('🔍 Activity match statuses:', filteredMatches.map(m => ({
          agent: m.agentInfo.name,
          status: m.activityMatch.details.matchStatus
        })));
      } else if (criterion === 'experience') {
        // Pour l'expérience, accepter uniquement les perfect_match
        filteredMatches = filteredMatches.filter(
          match => match.experienceMatch.matchStatus === "perfect_match"
        );
      } else if (criterion === 'timezone') {
        // Pour les timezones, accepter uniquement les perfect_match
        filteredMatches = filteredMatches.filter(
          match => match.timezoneMatch.matchStatus === "perfect_match"
        );
      } else if (criterion === 'region') {
        // Pour les régions, accepter uniquement les perfect_match
        filteredMatches = filteredMatches.filter(
          match => match.regionMatch.matchStatus === "perfect_match"
        );
      } else if (criterion === 'schedule' || criterion === 'availability') {
        // Pour les horaires, accepter uniquement les perfect_match
        filteredMatches = filteredMatches.filter(
          match => match.scheduleMatch.matchStatus === "perfect_match"
        );
      }


    }



    // Filtrage global obligatoire - ignorer les critères avec un poids de 0
    const finalFilteredMatches = filteredMatches.filter(match => {
      // Vérifier quels critères ont un poids > 0
      const hasLanguageWeight = weights.languages > 0;
      const hasSkillsWeight = weights.skills > 0;
      const hasIndustryWeight = (weights.industry > 0 || weights.weight > 0);
      const hasActivityWeight = weights.activity > 0;
      const hasExperienceWeight = weights.experience > 0;
      const hasTimezoneWeight = weights.timezone > 0;
      const hasRegionWeight = weights.region > 0;
      const hasScheduleWeight = (weights.schedule > 0 || weights.availability > 0);
      
      // Vérifier les matches pour les critères avec un poids > 0
      const hasLanguageMatch = !hasLanguageWeight || match.languageMatch.details.matchStatus === "perfect_match";
      const hasSkillsMatch = !hasSkillsWeight || match.skillsMatch.details.matchStatus === "perfect_match";
      const hasIndustryMatch = !hasIndustryWeight || match.industryMatch.details.matchStatus === "perfect_match" || match.industryMatch.details.matchStatus === "neutral_match";
      const hasActivityMatch = !hasActivityWeight || match.activityMatch.details.matchStatus === "perfect_match" || match.activityMatch.details.matchStatus === "neutral_match";
      const hasExperienceMatch = !hasExperienceWeight || match.experienceMatch.matchStatus === "perfect_match";
      const hasTimezoneMatch = !hasTimezoneWeight || match.timezoneMatch.matchStatus === "perfect_match";
      const hasRegionMatch = !hasRegionWeight || match.regionMatch.matchStatus === "perfect_match";
      const hasScheduleMatch = !hasScheduleWeight || match.scheduleMatch.matchStatus === "perfect_match";
      
      // Un agent doit avoir au moins un perfect_match pour les critères avec un poids > 0
      const activeCriteria = [hasLanguageWeight, hasSkillsWeight, hasIndustryWeight, hasActivityWeight, hasExperienceWeight, hasTimezoneWeight, hasRegionWeight, hasScheduleWeight];
      const activeMatches = [hasLanguageMatch, hasSkillsMatch, hasIndustryMatch, hasActivityMatch, hasExperienceMatch, hasTimezoneMatch, hasRegionMatch, hasScheduleMatch];
      
      // Si aucun critère n'est actif (tous les poids à 0), accepter tous les agents
      if (!activeCriteria.some(c => c)) {
        return true;
      }
      
      // Sinon, accepter si au moins un critère actif a un perfect_match
      return activeCriteria.some((isActive, index) => isActive && activeMatches[index]);
    });

    console.log('🔍 Final filtering result:', {
      beforeGlobalFilter: filteredMatches.length,
      afterGlobalFilter: finalFilteredMatches.length,
      finalAgents: finalFilteredMatches.map(m => m.agentInfo.name)
    });



    // Calculer les statistiques après le filtrage global
    const stats = {
      totalMatches: finalFilteredMatches.length,
      perfectMatches: finalFilteredMatches.filter(m => m.matchStatus === "perfect_match").length,
      partialMatches: finalFilteredMatches.filter(m => m.matchStatus === "partial_match").length,
      noMatches: finalFilteredMatches.filter(m => m.matchStatus === "no_match").length,
      languageStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.languageMatch.details.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.languageMatch.details.matchStatus === "partial_match").length,
        noMatches: finalFilteredMatches.filter(m => m.languageMatch.details.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length
      },
      skillsStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length,
        partialMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length,
        noMatches: finalFilteredMatches.length - finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length
      },
      experienceStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.experienceMatch.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.experienceMatch.matchStatus === "partial_match").length,
        noMatches: finalFilteredMatches.filter(m => m.experienceMatch.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length
      },
      industryStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.industryMatch.details.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.industryMatch.details.matchStatus === "partial_match").length,
        neutralMatches: finalFilteredMatches.filter(m => m.industryMatch.details.matchStatus === "neutral_match").length,
        noMatches: finalFilteredMatches.filter(m => m.industryMatch.details.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length
      },
      activityStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.activityMatch.details.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.activityMatch.details.matchStatus === "partial_match").length,
        neutralMatches: finalFilteredMatches.filter(m => m.activityMatch.details.matchStatus === "neutral_match").length,
        noMatches: finalFilteredMatches.filter(m => m.activityMatch.details.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length
      },
      professional: {
        perfectMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'professional')).length,
        partialMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'professional')).length,
        noMatches: finalFilteredMatches.length - finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'professional')).length
      },
      soft: {
        perfectMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'soft')).length,
        partialMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'soft')).length,
        noMatches: finalFilteredMatches.length - finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'soft')).length
      }
    };


    
    // Retourner la réponse finale
    res.json({
      preferedmatches: finalFilteredMatches,
      totalMatches: finalFilteredMatches.length,
      perfectMatches: finalFilteredMatches.filter(m => m.matchStatus === "perfect_match").length,
      partialMatches: finalFilteredMatches.filter(m => m.matchStatus === "partial_match").length,
      noMatches: finalFilteredMatches.filter(m => m.matchStatus === "no_match").length,
      languageStats: stats.languageStats,
      skillsStats: stats.skillsStats,
      experienceStats: stats.experienceStats,
      industryStats: stats.industryStats,
      activityStats: stats.activityStats,
      timezoneStats: stats.timezoneStats,
      regionStats: stats.regionStats,
      scheduleStats: stats.scheduleStats
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Find matches for a specific agent
export const findMatchesForAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }



    const gigs = await Gig.find();
    if (!gigs || gigs.length === 0) {
      return res.status(StatusCodes.OK).json({
        matches: [],
        totalGigs: 0,
        qualifyingGigs: 0,
        matchCount: 0,
        totalMatches: 0,
        minimumScoreApplied: 0.4,
        scoreStats: {
          highest: 0,
          average: 0,
          qualifying: 0
        }
      });
    }



    // Poids par défaut pour le matching
    const defaultWeights = {
      industry: 0.20,
      experience: 0.20,
      skills: 0.20,
      language: 0.15,
      region: 0.15,
      availability: 0.10
    };

    const weights = req.body.weights || defaultWeights;



    const result = await findMatches(agent, gigs, weights);

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Generate optimal matches
export const generateOptimalMatches = async (req, res) => {
  try {
    const { weights } = req.body;
    
    // Poids par défaut incluant l'expérience
    const defaultWeights = {
      industry: 0.20,
      experience: 0.20,
      skills: 0.20,
      language: 0.15,
      region: 0.15,
      availability: 0.10
    };

    const finalWeights = { ...defaultWeights, ...weights };
    
    const agents = await Agent.find();
    const gigs = await Gig.find();
    
    const gigMatches = await Promise.all(
      gigs.map(async gig => {
        const result = await findMatches(gig, agents, finalWeights);
        return {
          gigId: gig._id,
          matches: result.matches
        };
      })
    );
    
    res.status(StatusCodes.OK).json({
      gigMatches,
      totalGigs: gigs.length,
      totalAgents: agents.length,
      weights: finalWeights
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Find language matches for a specific gig
export const findLanguageMatchesForGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }



    const agents = await Agent.find();
    if (!agents || agents.length === 0) {
      return res.status(StatusCodes.OK).json({
        matches: [],
        totalAgents: 0,
        qualifyingAgents: 0,
        matchCount: 0
      });
    }

    const result = await findLanguageMatches(gig, agents);

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

/**
 * Trouve les correspondances de compétences pour un gig spécifique
 * @param {Object} req - La requête HTTP contenant l'ID du gig dans req.params.id
 * @param {Object} res - L'objet de réponse HTTP
 * @returns {Object} Liste des agents correspondants avec leurs scores et détails de correspondance
 */
export const findSkillsMatchesForGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }

    const agents = await Agent.find({
      'skills.technical': { $exists: true, $ne: [] }
    });

    if (!agents || agents.length === 0) {
      return res.status(StatusCodes.OK).json([]);
    }

    /**
     * Normalise le nom de la compétence pour la comparaison
     * @param {string} skill - Le nom de la compétence
     * @returns {string} Nom normalisé
     */
    const normalizeSkill = (skill) => {
      const skillMap = {
        'javascript': 'javascript',
        'js': 'javascript',
        'python': 'python',
        'py': 'python',
        'java': 'java',
        'c++': 'cpp',
        'cpp': 'cpp',
        'c#': 'csharp',
        'csharp': 'csharp',
        'react': 'react',
        'reactjs': 'react',
        'node': 'nodejs',
        'node.js': 'nodejs',
        'nodejs': 'nodejs',
        'angular': 'angular',
        'vue': 'vue',
        'vue.js': 'vue',
        'vuejs': 'vue',
        'sql': 'sql',
        'mysql': 'sql',
        'postgresql': 'sql',
        'mongodb': 'nosql',
        'nosql': 'nosql'
      };
      return skillMap[skill.toLowerCase()] || skill.toLowerCase();
    };

    /**
     * Calcule le score numérique pour un niveau de compétence donné
     * @param {string} level - Le niveau de maîtrise de la compétence
     * @returns {number} Score entre 0 et 1 représentant le niveau de maîtrise
     */
    const getSkillLevelScore = (level) => {
      const levels = {
        'native': 1.0,
        'natif': 1.0,
        'native or bilingual': 1.0,
        'c2': 1.0,
        'c1': 0.8,
        'b2': 0.6,
        'b1': 0.4,
        'a2': 0.2,
        'a1': 0.1,
        'langue maternelle': 1.0,
        'bonne maîtrise': 0.8,
        'maîtrise professionnelle': 0.6,
        'maîtrise limitée': 0.4,
        'maîtrise élémentaire': 0.2,
        'conversational': 0.5,
        'professional': 0.8
      };
      const normalized = (level || '').toLowerCase().trim();
      const score = levels[normalized] || 0;
      return score;
    };

    /**
     * Trouve les correspondances de compétences entre un gig et une liste d'agents
     * @param {Object} gig - Le gig avec ses exigences de compétences
     * @param {Array} agents - Liste des agents à évaluer
     * @returns {Array} Liste des correspondances triées par score
     */
    const findSkillsMatches = (gig, agents) => {
      const requiredSkills = gig.skills?.technical || [];
      const matches = [];

      agents.forEach(agent => {
        const agentSkills = agent.skills?.technical || [];
        let totalScore = 0;
        let matchingSkills = [];
        let missingSkills = [];
        let insufficientSkills = [];

        requiredSkills.forEach(reqSkill => {
          // Comparer par ID au lieu du nom
          const agentSkill = agentSkills.find(
            skill => skill.skill.toString() === reqSkill.skill.toString()
          );

          if (agentSkill) {
            const skillScore = getSkillLevelScore(agentSkill.level);
            const requiredScore = getSkillLevelScore(reqSkill.level);
            
            if (skillScore >= requiredScore) {
              matchingSkills.push({
                skill: reqSkill.skill,
                requiredLevel: reqSkill.level,
                agentLevel: agentSkill.level,
                score: skillScore
              });
              totalScore += skillScore;
            } else {
              insufficientSkills.push({
                skill: reqSkill.skill,
                requiredLevel: reqSkill.level,
                agentLevel: agentSkill.level,
                score: skillScore
              });
            }
          } else {
            missingSkills.push(reqSkill.skill);
          }
        });

        const matchStatus = matchingSkills.length === requiredSkills.length
          ? "perfect_match"
          : matchingSkills.length > 0
            ? "partial_match"
            : "no_match";

        matches.push({
          agent,
          score: totalScore / requiredSkills.length,
          details: {
            matchingSkills,
            missingSkills,
            insufficientSkills,
            matchStatus
          }
        });
      });

      return matches.sort((a, b) => b.score - a.score);
    };

    const skillsMatches = findSkillsMatches(gig, agents);

    // Récupérer les noms des skills pour les agents
    const agentSkillIds = skillsMatches.flatMap(match => 
      match.agent.skills?.technical?.map(s => s.skill) || []
    );
    const agentSkillNames = await getSkillNames([...new Set(agentSkillIds)], 'technical');
    const agentSkillMap = {};
    agentSkillNames.forEach(skill => {
      agentSkillMap[skill.id.toString()] = skill.name;
    });

    const matches = skillsMatches.map(match => ({
      agentId: match.agent._id,
      agentSkills: match.agent.skills?.technical?.map(skill => ({
        skill: skill.skill,
        skillName: agentSkillMap[skill.skill.toString()] || 'Unknown Skill',
        level: skill.level,
        score: getSkillLevelScore(skill.level)
      })) || [],
      score: match.score,
      matchDetails: match.details
    }));

    res.json({
      matches,
      totalMatches: matches.length,
      perfectMatches: matches.filter(m => m.matchDetails.matchStatus === "perfect_match").length,
      partialMatches: matches.filter(m => m.matchDetails.matchStatus === "partial_match").length,
      noMatches: matches.filter(m => m.matchDetails.matchStatus === "no_match").length
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Create a new GigAgent from matching results
export const createGigAgentFromMatch = async (req, res) => {
  try {
    const { gigId, agentId, matchDetails, notes } = req.body;
    
    // Vérifier que le gig et l'agent existent
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }

    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }

    // Vérifier si une assignation existe déjà
    const existingAssignment = await GigAgent.findOne({ agentId, gigId });
    if (existingAssignment) {
      return res.status(StatusCodes.CONFLICT).json({ 
        message: 'Une assignation existe déjà pour cet agent et ce gig' 
      });
    }

    // Calculer le score global de matching
    const languageScore = matchDetails.languageMatch?.score || 0;
    const skillsScore = matchDetails.skillsMatch?.details?.matchStatus === 'perfect_match' ? 1 : 0;
    const timezoneScore = matchDetails.timezoneMatch?.score || 0;
    const regionScore = matchDetails.regionMatch?.score || 0;
    const scheduleScore = matchDetails.scheduleMatch?.score || 0;
    
    const matchScore = (languageScore + skillsScore + timezoneScore + regionScore + scheduleScore) / 5;

    // Créer la nouvelle assignation
    const gigAgent = new GigAgent({
      agentId,
      gigId,
      matchScore,
      matchDetails,
      notes,
      status: 'pending'
    });

    const savedGigAgent = await gigAgent.save();

    // Envoyer l'email de notification
    try {
      const emailResult = await sendMatchingNotification(agent, gig, matchDetails);
      
      // Marquer l'email comme envoyé
      await savedGigAgent.markEmailSent();
      
      // Email de notification envoyé avec succès
    } catch (emailError) {
      // Erreur lors de l'envoi de l'email
      // Ne pas échouer la création si l'email échoue
    }

    // Retourner la réponse avec les détails
    const populatedGigAgent = await GigAgent.findById(savedGigAgent._id)
      .populate('agentId')
      .populate('gigId');

    res.status(StatusCodes.CREATED).json({
      message: 'Assignation créée avec succès',
      gigAgent: populatedGigAgent,
      emailSent: true,
      matchScore: matchScore
    });

  } catch (error) {
    
    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({ 
        message: 'Une assignation existe déjà pour cet agent et ce gig' 
      });
    }
    
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};