import Match from '../models/Match.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import GigAgent from '../models/GigAgent.js';
import Timezone from '../models/Timezone.js';
import Country from '../models/Country.js';
import Currency from '../models/Currency.js';
import TechnicalSkill from '../models/TechnicalSkill.js';
import ProfessionalSkill from '../models/ProfessionalSkill.js';
import SoftSkill from '../models/SoftSkill.js';
import Language from '../models/Language.js';
import Industry from '../models/Industry.js';
import Activity from '../models/Activity.js';
import { StatusCodes } from 'http-status-codes';
import { findMatches } from '../utils/matchingUtils.js';
import { findLanguageMatches, getLanguageLevelScore } from '../utils/matchingAlgorithm.js';
import { sendMatchingNotification } from '../services/emailService.js';
import mongoose from 'mongoose';

// 🆕 Fonction helper pour extraire les données propres d'un objet MongoDB
const extractCleanData = (obj) => {
  if (!obj) return null;

  // Si c'est un ObjectId, retourner en string
  if (typeof obj === 'object' && obj._bsontype === 'ObjectId') {
    return obj.toString();
  }

  // Si c'est un objet Mongoose avec _id, extraire les données pertinentes
  if (typeof obj === 'object' && obj._id) {
    const clean = {
      _id: obj._id.toString()
    };

    // Ajouter les propriétés utiles si elles existent
    if (obj.name) clean.name = obj.name;
    if (obj.title) clean.title = obj.title;
    if (obj.code) clean.code = obj.code;
    if (obj.description) clean.description = obj.description;
    if (obj.category) clean.category = obj.category;
    if (obj.nativeName) clean.nativeName = obj.nativeName;

    return clean;
  }

  // Sinon retourner tel quel
  return obj;
};

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

  // Handle populated Language object case (has name property)
  if (typeof language === 'object' && language.name) {
    language = language.name;
  }
  // Handle ObjectId case (non-populated references)
  else if (typeof language === 'object' && language.toString) {
    language = language.toString();
  }

  // Ensure language is a string before calling toLowerCase
  if (typeof language !== 'string') {
    return '';
  }

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
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });
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
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });

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
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });
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
const compareTimezones = async (gigTimezone, agentTimezone) => {
  try {
    // Formater les décalages GMT pour l'affichage
    const formatGmtOffset = (offset) => {
      const hours = Math.round(offset / 3600);
      return `GMT ${hours >= 0 ? '+' : ''}${hours}`;
    };

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
          gigGmtDisplay: gigTimezone?.gmtOffset ? formatGmtOffset(gigTimezone.gmtOffset) : 'Unknown',
          agentGmtDisplay: agentTimezone?.gmtOffset ? formatGmtOffset(agentTimezone.gmtOffset) : 'Unknown',
          gmtOffsetDifference: null,
          reason: 'Timezone data not found - using neutral score'
        }
      };
    }

    const gmtOffsetDifference = Math.abs(gigTimezone.gmtOffset - agentTimezone.gmtOffset);

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
const compareRegions = async (gigDestinationZone, agentCountryCode) => {
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
        agentCountryName: agentCountryCode, // Utiliser le code comme nom pour l'instant
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

  // NOUVELLE LOGIQUE: On ne retourne plus 0 immédiatement. 
  // On calcule le score proportionnel au nombre de jours qui matchent.

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

  const scheduleScore = totalDays > 0 ? matchingDays / totalDays : 0;
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
    const gig = await Gig.findById(req.params.id)
      .populate('skills.languages.language', 'name nativeName code')
      .populate('skills.technical.skill', 'name description category')
      .populate('skills.professional.skill', 'name description category')
      .populate('skills.soft.skill', 'name description category')
      .populate('industries', 'name description category')
      .populate('activities', 'name description category')
      .populate('availability.time_zone', 'zoneName countryCode countryName gmtOffset');

    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }


    // Get weights from request body or use defaults
    const weights = req.body.weights || {
      skills: 0,
      languages: 0,
      experience: 0,
      region: 0,
      timezone: 0,
      industry: 0,
      activity: 0
    };

    console.log('🔍 Received weights from frontend:', weights);
    console.log('🔍 Weight keys:', Object.keys(weights));

    // Validate weights
    const validWeightKeys = ['skills', 'languages', 'experience', 'region', 'timezone', 'industry', 'activity', 'activities', 'availability'];
    const invalidKeys = Object.keys(weights).filter(key => !validWeightKeys.includes(key));

    console.log('🔍 Valid weight keys:', validWeightKeys);
    console.log('🔍 Invalid keys found:', invalidKeys);

    if (invalidKeys.length > 0) {
      console.error('❌ Invalid weight keys detected:', invalidKeys);
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: `Invalid weight keys: ${invalidKeys.join(', ')}. Valid keys are: ${validWeightKeys.join(', ')}`
      });
    }

    // Validate weight values (should be between 0 and 1)
    const invalidWeights = Object.entries(weights).filter(([key, value]) =>
      typeof value !== 'number' || value < 0 || value > 1
    );

    console.log('🔍 Invalid weight values found:', invalidWeights);

    if (invalidWeights.length > 0) {
      console.error('❌ Invalid weight values detected:', invalidWeights);
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: `Invalid weight values. All weights must be numbers between 0 and 1. Invalid: ${invalidWeights.map(([key, value]) => `${key}=${value}`).join(', ')}`
      });
    }

    // Normaliser les poids pour supporter les deux noms (industry et weight)
    if (weights.weight !== undefined && weights.industry === undefined) {
      weights.industry = weights.weight;
    } else if (weights.industry !== undefined && weights.weight === undefined) {
      weights.weight = weights.industry;
    } else if (weights.weight !== undefined && weights.industry !== undefined) {
      // Si les deux sont définis, utiliser la valeur de industry pour weight
      weights.weight = weights.industry;
    }

    // Normaliser activities/activity
    if (weights.activities !== undefined && weights.activity === undefined) {
      weights.activity = weights.activities;
    } else if (weights.activity !== undefined && weights.activities === undefined) {
      weights.activities = weights.activity;
    } else if (weights.activities !== undefined && weights.activity !== undefined) {
      // Si les deux sont définis, utiliser la valeur de activities pour activity
      weights.activity = weights.activities;
    }



    const agents = await Agent.find({})
      .populate('personalInfo.languages.language', 'name nativeName code')
      .populate('personalInfo.country', 'name code')
      .populate('availability.timeZone', 'zoneName countryCode countryName gmtOffset')
      .populate('professionalSummary.industries', 'name description category')
      .populate('professionalSummary.activities', 'name description category')
      .populate('skills.technical.skill', 'name description category')
      .populate('skills.professional.skill', 'name description category')
      .populate('skills.soft.skill', 'name description category')
      .populate('favoriteGigs', 'title description');

    // ⚠️ NOUVEAU: Pas de pré-filtrage - évaluer tous les agents
    // Le filtrage se fera uniquement dans la phase séquentielle selon les poids
    console.log(`📊 Évaluation de ${agents.length} agents sans pré-filtrage`);

    // Validate agents data
    if (!agents || agents.length === 0) {
      return res.status(StatusCodes.OK).json({
        preferedmatches: [],
        totalMatches: 0,
        perfectMatches: 0,
        partialMatches: 0,
        noMatches: 0,
        message: 'No agents available for matching'
      });
    }

    // Garder tous les agents pour l'évaluation complète
    const agentsWithActivities = agents;



    const matches = await Promise.all(agentsWithActivities.map(async agent => {
      try {
        // Validate agent data
        if (!agent || !agent._id) {
          console.warn('⚠️ Skipping invalid agent:', agent);
          return null;
        }

        // Language matching - utiliser les données populées
        const requiredLanguages = gig.skills?.languages || [];
        const agentLanguages = agent.personalInfo?.languages || [];



        let matchingLanguages = [];
        let missingLanguages = [];
        let insufficientLanguages = [];

        requiredLanguages.forEach(reqLang => {
          if (!reqLang?.language) return;

          // Utiliser les données populées directement
          const reqLangId = reqLang.language?._id?.toString() || reqLang.language?.toString();
          const reqLangName = reqLang.language?.name || 'Unknown Language';



          const agentLang = agentLanguages.find(
            lang => {
              const agentLangId = lang?.language?._id?.toString() || lang?.language?.toString();
              return agentLangId === reqLangId;
            }
          );

          if (agentLang) {
            const agentLangName = agentLang.language?.name || 'Unknown Language';


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
                language: extractCleanData(reqLang.language),
                languageName: reqLangName,
                requiredLevel: reqLang.proficiency,
                agentLevel: agentLang.proficiency
              });
            } else {

              insufficientLanguages.push({
                language: extractCleanData(reqLang.language),
                languageName: reqLangName,
                requiredLevel: reqLang.proficiency,
                agentLevel: agentLang.proficiency
              });
            }
          } else {
            missingLanguages.push({
              language: extractCleanData(reqLang.language),
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
        let industryScore;
        if (gigIndustryIds.length === 0) {
          // Si le gig n'a pas d'industries, considérer comme un match neutre
          industryScore = 1; // Score parfait si pas d'industries requises
          industryMatchStatus = "neutral_match";

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

          // Calculer le score des industries (proportionnel)
          industryScore = matchingIndustries.length / gigIndustryIds.length;

          // Nouvelle logique : accepter au moins une industrie commune
          if (matchingIndustries.length === 0) {
            // Aucune industrie ne matche
            industryMatchStatus = "no_match";
          } else if (matchingIndustries.length === gigIndustryIds.length) {
            // Toutes les industries matchent
            industryMatchStatus = "perfect_match";
          } else {
            // Au moins une industrie matche, mais pas toutes
            industryMatchStatus = "partial_match";
          }

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
        let activityScore;
        if (gigActivityIds.length === 0) {
          // Si le gig n'a pas d'activités, considérer comme un match neutre
          activityScore = 1; // Score parfait si pas d'activités requises
          activityMatchStatus = "neutral_match";
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

          // Calculer le score des activités (proportionnel)
          activityScore = matchingActivities.length / gigActivityIds.length;

          // Nouvelle logique : accepter au moins une activité commune
          if (matchingActivities.length === 0) {
            // Aucune activité ne matche
            activityMatchStatus = "no_match";
          } else if (matchingActivities.length === gigActivityIds.length) {
            // Toutes les activités matchent
            activityMatchStatus = "perfect_match";
          } else {
            // Au moins une activité matche, mais pas toutes
            activityMatchStatus = "partial_match";
          }
        }

        // Skills matching - utiliser les données populées directement
        const gigTechnicalSkills = gig.skills?.technical || [];
        const gigProfessionalSkills = gig.skills?.professional || [];
        const gigSoftSkills = gig.skills?.soft || [];

        const agentTechnicalSkills = agent.skills?.technical || [];
        const agentProfessionalSkills = agent.skills?.professional || [];
        const agentSoftSkills = agent.skills?.soft || [];

        // Experience matching
        const gigRequiredExperience = parseInt(gig.seniority?.yearsExperience) || 0;
        const agentExperience = parseInt(agent.professionalSummary?.yearsOfExperience) || 0;

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
            // Score parfait pour expérience supérieure, limité à 1.0
            experienceMatch = {
              score: 1.0,
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

        // Créer les listes de compétences requises et de l'agent avec les données populées
        const requiredSkills = [
          ...gigTechnicalSkills.map(s => ({
            skill: s.skill,
            level: s.level,
            type: 'technical',
            name: s.skill?.name || 'Unknown Skill'
          })),
          ...gigProfessionalSkills.map(s => ({
            skill: s.skill,
            level: s.level,
            type: 'professional',
            name: s.skill?.name || 'Unknown Skill'
          })),
          ...gigSoftSkills.map(s => ({
            skill: s.skill,
            level: s.level,
            type: 'soft',
            name: s.skill?.name || 'Unknown Skill'
          }))
        ];

        const agentSkills = [
          ...agentTechnicalSkills.map(s => ({
            skill: s.skill,
            level: s.level,
            type: 'technical',
            name: s.skill?.name || 'Unknown Skill'
          })),
          ...agentProfessionalSkills.map(s => ({
            skill: s.skill,
            level: s.level,
            type: 'professional',
            name: s.skill?.name || 'Unknown Skill'
          })),
          ...agentSoftSkills.map(s => ({
            skill: s.skill,
            level: s.level,
            type: 'soft',
            name: s.skill?.name || 'Unknown Skill'
          }))
        ];



        let matchingSkills = [];
        let missingSkills = [];
        let insufficientSkills = [];

        // Check if agent has all required skills by ID
        const hasAllRequiredSkills = requiredSkills.every(reqSkill => {
          if (!reqSkill?.skill) return true;

          // Comparer les IDs des skills (avec gestion des objets populés)
          const reqSkillId = reqSkill.skill?._id?.toString() || reqSkill.skill?.toString();
          const agentSkill = agentSkills.find(
            skill => {
              const agentSkillId = skill?.skill?._id?.toString() || skill?.skill?.toString();
              return agentSkillId === reqSkillId && skill.type === reqSkill.type;
            }
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
        const gigTimezoneId = gig.availability?.time_zone;
        const agentTimezoneId = agent.availability?.timeZone;

        // Utiliser les données de timezone populées directement
        const gigTimezoneData = gig.availability?.time_zone;
        const agentTimezoneData = agent.availability?.timeZone;

        const timezoneMatch = await compareTimezones(gigTimezoneData, agentTimezoneData);

        // Region matching - utiliser les données de timezone populées
        const agentCountryCode = agent.availability?.timeZone?.countryCode;
        const regionMatch = await compareRegions(gig.destination_zone, agentCountryCode);

        // Schedule matching
        console.log(`🗓️ Debugging availability for agent ${agent._id}:`);
        console.log(`   Gig schedule:`, JSON.stringify(gig.availability?.schedule, null, 2));
        console.log(`   Agent availability:`, JSON.stringify(agent.availability, null, 2));
        const scheduleMatch = compareSchedules(gig.availability?.schedule, agent.availability);
        console.log(`   Schedule match result:`, JSON.stringify(scheduleMatch, null, 2));

        // Calculer le score des langues (proportionnel)
        const languageScore = requiredLanguages.length > 0 ?
          matchingLanguages.length / requiredLanguages.length :
          1; // Si aucune langue requise, score parfait

        // Determine match status based on direct matches - accepter partial_match
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

        // ⭐ CALCUL DU SCORE TOTAL SELON LE CAS
        let normalizedTotalScore = 0;

        // Vérifier si tous les weights sont à 0
        const allWeightsZero = Object.values(weights).every(weight => weight === 0);

        if (allWeightsZero) {
          // CAS SPÉCIAL: Tous weights = 0 → Diviser par 8 (tous les critères)
          const allScores = [
            languageScore,
            industryScore,
            activityScore,
            experienceMatch.score || (experienceMatch.status === "perfect_match" ? 1 : 0),
            timezoneMatch.score || (timezoneMatch.status === "perfect_match" ? 1 : 0),
            regionMatch.score || (regionMatch.status === "perfect_match" ? 1 : 0),
            scheduleMatch.score,
            // 8ème critère (skills) - utiliser le ratio réel
            requiredSkills.length > 0 ? matchingSkills.length / requiredSkills.length : 1
          ];

          const totalScore = allScores.reduce((a, b) => a + b, 0);
          normalizedTotalScore = totalScore / 8; // Diviser par 8 critères

          console.log(`🧮 Score total pour agent ${agent._id}: (${allScores.map(s => s.toFixed(2)).join(' + ')}) ÷ 8 = ${normalizedTotalScore.toFixed(3)}`);
        } else {
          // CAS NORMAL: Score pondéré - IGNORER les weights = 0
          let totalScore = 0;
          let totalWeights = 0;

          // Ajouter seulement les critères avec weight > 0
          if (weights.languages > 0) {
            totalScore += languageScore * weights.languages;
            totalWeights += weights.languages;
          }

          if ((weights.industry || weights.weight || 0) > 0) {
            const industryWeight = weights.industry || weights.weight || 0;
            totalScore += industryScore * industryWeight;
            totalWeights += industryWeight;
          }

          if (weights.activity > 0) {
            totalScore += activityScore * weights.activity;
            totalWeights += weights.activity;
          }

          if (weights.experience > 0) {
            totalScore += experienceMatch.score * weights.experience;
            totalWeights += weights.experience;
          }

          if (weights.timezone > 0) {
            totalScore += timezoneMatch.score * weights.timezone;
            totalWeights += weights.timezone;
          }

          if (weights.region > 0) {
            totalScore += regionMatch.score * weights.region;
            totalWeights += weights.region;
          }

          if ((weights.availability || weights.schedule || 0) > 0) {
            const availabilityWeight = weights.availability || weights.schedule || 0;
            totalScore += scheduleMatch.score * availabilityWeight;
            totalWeights += availabilityWeight;
          }

          if (weights.skills > 0) {
            const skillsScore = requiredSkills.length > 0 ? matchingSkills.length / requiredSkills.length : 1;
            totalScore += skillsScore * weights.skills;
            totalWeights += weights.skills;
          }

          normalizedTotalScore = totalWeights > 0 ? totalScore / totalWeights : 0;

          console.log(`🧮 Score pondéré pour agent ${agent._id}: totalScore=${totalScore.toFixed(3)}, totalWeights=${totalWeights}, final=${normalizedTotalScore.toFixed(3)}`);
        }

        return {
          agentId: agent._id,
          // ⭐ NOUVEAU: Score total de matching
          totalMatchingScore: parseFloat(normalizedTotalScore.toFixed(3)),
          agentInfo: {
            // Données de base
            _id: agent._id,
            userId: agent.userId,
            plan: agent.plan,
            status: agent.status,
            isBasicProfileCompleted: agent.isBasicProfileCompleted,

            // Personal Info complet
            personalInfo: {
              name: agent.personalInfo?.name || '',
              country: agent.personalInfo?.country || (agent.availability?.timeZone ? {
                _id: agent.availability.timeZone._id,
                name: agent.availability.timeZone.countryName,
                code: agent.availability.timeZone.countryCode
              } : null),
              email: agent.personalInfo?.email || '',
              phone: agent.personalInfo?.phone || '',
              languages: agent.personalInfo?.languages?.map(lang => ({
                _id: lang._id,
                language: extractCleanData(lang.language),
                languageName: lang.language?.name || 'Unknown Language',
                proficiency: lang.proficiency,
                iso639_1: lang.iso639_1
              })) || [],
              presentationVideo: agent.personalInfo?.presentationVideo
            },

            // Availability complet
            availability: {
              schedule: agent.availability?.schedule || [],
              timeZone: agent.availability?.timeZone,
              flexibility: agent.availability?.flexibility || []
            },

            // Professional Summary complet
            professionalSummary: {
              yearsOfExperience: agent.professionalSummary?.yearsOfExperience || 0,
              currentRole: agent.professionalSummary?.currentRole || '',
              industries: agent.professionalSummary?.industries?.map(industry => ({
                _id: industry._id,
                name: industry.name,
                description: industry.description
              })) || [],
              activities: agent.professionalSummary?.activities?.map(activity => ({
                _id: activity._id,
                name: activity.name,
                description: activity.description
              })) || [],
              keyExpertise: agent.professionalSummary?.keyExpertise || [],
              notableCompanies: agent.professionalSummary?.notableCompanies || [],
              profileDescription: agent.professionalSummary?.profileDescription || ''
            },

            // Skills complet
            skills: {
              technical: agent.skills?.technical?.map(s => ({
                _id: s._id,
                skill: s.skill,
                level: s.level,
                details: s.details,
                name: s.skill?.name || 'Unknown Skill'
              })) || [],
              professional: agent.skills?.professional?.map(s => ({
                _id: s._id,
                skill: s.skill,
                level: s.level,
                details: s.details,
                name: s.skill?.name || 'Unknown Skill'
              })) || [],
              soft: agent.skills?.soft?.map(s => ({
                _id: s._id,
                skill: s.skill,
                level: s.level,
                details: s.details,
                name: s.skill?.name || 'Unknown Skill'
              })) || [],
              contactCenter: agent.skills?.contactCenter || []
            },

            // Experience complet
            experience: agent.experience || [],

            // Favorite gigs
            favoriteGigs: agent.favoriteGigs || [],

            // Achievements
            achievements: agent.achievements || [],

            // Onboarding progress
            onboardingProgress: agent.onboardingProgress,

            // Timestamps
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
            lastUpdated: agent.lastUpdated,

            // Données de compatibilité (pour l'ancien format)
            name: agent.personalInfo?.name || '',
            email: agent.personalInfo?.email || '',
            photo: agent.personalInfo?.photo || null,
            location: agent.personalInfo?.location || '',
            phone: agent.personalInfo?.phone || '',
            languages: agent.personalInfo?.languages?.map(lang => ({
              _id: lang._id,
              language: extractCleanData(lang.language),
              languageName: lang.language?.name || 'Unknown Language',
              proficiency: lang.proficiency,
              iso639_1: lang.iso639_1
            })) || [],
            timezone: {
              timezoneId: agent.availability?.timeZone,
              timezoneName: agent.availability?.timeZone?.zoneName || 'Unknown',
              gmtOffset: agent.availability?.timeZone?.gmtOffset || null,
              gmtDisplay: agent.availability?.timeZone?.gmtOffset ? `GMT ${agent.availability.timeZone.gmtOffset >= 0 ? '+' : ''}${Math.round(agent.availability.timeZone.gmtOffset / 3600)}` : 'Unknown',
              countryCode: agent.availability?.timeZone?.countryCode || 'Unknown',
              countryName: agent.availability?.timeZone?.countryName || 'Unknown'
            }
          },
          languageMatch: {
            score: languageScore,
            details: {
              matchingLanguages,
              missingLanguages,
              insufficientLanguages,
              matchStatus: languageMatchStatus
            }
          },
          skillsMatch: {
            score: requiredSkills.length > 0 ? matchingSkills.length / requiredSkills.length : 1,
            details: {
              matchingSkills,
              missingSkills,
              insufficientSkills,
              matchStatus: skillsMatchStatus
            }
          },
          industryMatch: {
            score: industryScore,
            details: {
              matchingIndustries,
              missingIndustries,
              matchStatus: industryMatchStatus
            }
          },
          activityMatch: {
            score: activityScore,
            details: {
              matchingActivities,
              missingActivities,
              matchStatus: activityMatchStatus
            }
          },
          experienceMatch: {
            score: experienceMatch.status === "perfect_match" ? 1 : 0, // ⭐ BINAIRE: 1 si match, 0 sinon
            details: experienceMatch.details,
            matchStatus: experienceMatch.status
          },
          timezoneMatch: {
            score: timezoneMatch.status === "perfect_match" ? 1 : 0, // ⭐ BINAIRE: 1 si match, 0 sinon
            details: timezoneMatch.details,
            matchStatus: timezoneMatch.status
          },
          regionMatch: {
            score: regionMatch.status === "perfect_match" ? 1 : 0, // ⭐ BINAIRE: 1 si match, 0 sinon
            details: regionMatch.details,
            matchStatus: regionMatch.status
          },
          availabilityMatch: {
            score: scheduleMatch.score,
            details: scheduleMatch.details,
            matchStatus: scheduleMatch.status
          },
          matchStatus: overallMatchStatus
        };
      } catch (agentError) {
        console.error(`❌ Error processing agent ${agent?._id}:`, agentError);

        // Return a default match result for this agent
        return {
          agentId: agent?._id || 'unknown',
          totalMatchingScore: 0,
          agentInfo: {
            _id: agent?._id || 'unknown',
            name: agent?.personalInfo?.name || 'Unknown Agent',
            email: agent?.personalInfo?.email || '',
            // Add minimal required fields
            personalInfo: agent?.personalInfo || {},
            availability: agent?.availability || {},
            professionalSummary: agent?.professionalSummary || {},
            skills: agent?.skills || {}
          },
          languageMatch: { score: 0, details: { matchStatus: 'error' } },
          skillsMatch: { score: 0, details: { matchStatus: 'error' } },
          industryMatch: { score: 0, details: { matchStatus: 'error' } },
          activityMatch: { score: 0, details: { matchStatus: 'error' } },
          experienceMatch: { score: 0, details: {}, matchStatus: 'error' },
          timezoneMatch: { score: 0, details: {}, matchStatus: 'error' },
          regionMatch: { score: 0, details: {}, matchStatus: 'error' },
          availabilityMatch: { score: 0, details: {}, matchStatus: 'error' },
          matchStatus: 'error'
        };
      }
    }));

    // Filter out null results (agents that failed to process)
    const validMatches = matches.filter(match => match !== null);
    const failedMatches = matches.length - validMatches.length;

    if (failedMatches > 0) {
      console.warn(`⚠️ ${failedMatches} agents failed to process and were excluded from results`);
    }

    // ⭐ VÉRIFIER SI TOUS LES WEIGHTS SONT À 0
    const allWeightsZero = Object.values(weights).every(weight => weight === 0);

    // Tracker pour compter les agents à chaque étape (déclaré en dehors des blocs conditionnels)
    const filteringSteps = {
      totalAgentsEvaluated: validMatches.length,
      failedAgents: failedMatches,
      steps: []
    };

    let filteredMatches = validMatches;

    if (allWeightsZero) {
      console.log('🎯 TOUS LES WEIGHTS SONT À 0 - Aucun filtrage, garder tous les agents');
      console.log(`📊 Tous les ${validMatches.length} agents seront retournés avec leurs scores individuels`);

      // Pas de filtrage séquentiel, garder tous les agents
      filteredMatches = validMatches;
    } else {
      // ⭐ NOUVELLE LOGIQUE: Les weights déterminent les PRIORITÉS (pas des seuils)
      // Plus le weight est élevé, plus le critère est important pour le classement final
      // On ne fait plus de filtrage séquentiel, juste du tri par score total pondéré
      // ⭐ NOUVELLE APPROCHE: Pas de filtrage séquentiel, juste tri par score total pondéré
      // Tous les agents sont gardés, mais triés selon l'importance des critères (weights)
      filteredMatches = validMatches;

      console.log(`📊 Tous les ${validMatches.length} agents gardés - Tri selon les priorités (weights)`);
      console.log(`📋 Weights comme priorités:`, Object.entries(weights)
        .sort(([, a], [, b]) => b - a)
        .map(([criterion, weight]) => `${criterion}: ${weight}`)
        .join(', '));
    }



    // ⭐ NOUVELLE APPROCHE: Pas de filtrage, tous les agents sont gardés
    // Le tri se fait uniquement par le score total pondéré (totalMatchingScore)
    const finalFilteredMatches = filteredMatches;

    // Ajouter le résultat final aux statistiques
    filteringSteps.finalAgentsSelected = finalFilteredMatches.length;
    filteringSteps.totalEliminationRate = "0.0"; // Pas d'élimination, tous gardés

    // Calculer les statistiques des scores totaux
    if (finalFilteredMatches.length > 0) {
      const totalScores = finalFilteredMatches.map(m => m.totalMatchingScore);
      filteringSteps.scoreStats = {
        highest: Math.max(...totalScores),
        lowest: Math.min(...totalScores),
        average: (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(3),
        median: totalScores.sort((a, b) => a - b)[Math.floor(totalScores.length / 2)]
      };
    } else {
      filteringSteps.scoreStats = {
        highest: 0,
        lowest: 0,
        average: 0,
        median: 0
      };
    }

    console.log(`🎯 Filtrage final terminé: ${finalFilteredMatches.length} agents sélectionnés`);



    // Récupérer les agents déjà invités pour ce gig (invitations en attente uniquement)
    const invitedAgents = await GigAgent.find({
      gigId: gig._id,
      enrollmentStatus: 'invited',
    }).select('agentId');
    const invitedAgentIds = invitedAgents.map(ga => ga.agentId.toString());
    console.log('📧 Backend: Invited agents for gig', gig._id, ':', invitedAgentIds);

    // Trier les agents par score total décroissant pour avoir les meilleurs en premier
    const sortedMatches = finalFilteredMatches.sort((a, b) => b.totalMatchingScore - a.totalMatchingScore);

    // 📊 Log du tri des agents par score décroissant
    console.log('🏆 TOP 10 AGENTS TRIÉS PAR SCORE DÉCROISSANT:');
    sortedMatches.slice(0, 10).forEach((match, index) => {
      console.log(`   ${index + 1}. Agent ${match.agentId} - Score: ${match.totalMatchingScore} (${(match.totalMatchingScore * 100).toFixed(1)}%)`);
    });

    // Ajouter l'information d'invitation à chaque match
    const matchesWithInvitationStatus = sortedMatches.map(match => ({
      ...match,
      isInvited: invitedAgentIds.includes(match.agentId.toString())
    }));

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



    // Retourner la réponse finale avec les statistiques de filtrage
    res.json({
      preferedmatches: matchesWithInvitationStatus,
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
      scheduleStats: stats.scheduleStats,
      // ⭐ NOUVEAU: Statistiques détaillées du processus de filtrage
      filteringProcess: filteringSteps
    });
  } catch (error) {
    console.error('❌ Error in findMatchesForGigById:', error);

    // Provide more detailed error information
    let errorMessage = 'Internal server error';
    let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;

    if (error.name === 'CastError') {
      errorMessage = 'Invalid gig ID format';
      statusCode = StatusCodes.BAD_REQUEST;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Invalid request data';
      statusCode = StatusCodes.BAD_REQUEST;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
            // ⭐ NOUVEAU: Ignorer les niveaux - si l'agent a la skill, c'est un match
            matchingSkills.push({
              skill: reqSkill.skill,
              requiredLevel: reqSkill.level,
              agentLevel: agentSkill.level,
              score: 1 // Score fixe de 1 pour chaque skill possédée
            });
            totalScore += 1; // Chaque skill compte pour 1 point
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

    let emailSent = false;
    // Envoyer l'email de notification
    try {
      const emailResult = await sendMatchingNotification(agent, gig, matchDetails);

      if (emailResult.success) {
        // Marquer l'email comme envoyé
        await savedGigAgent.markEmailSent();
        emailSent = true;
      } else {
        console.error('❌ SMTP Error detail in matchController:', emailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Exception in matchController sending email:', emailError);
    }

    // Retourner la réponse avec les détails
    const populatedGigAgent = await GigAgent.findById(savedGigAgent._id)
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });

    res.status(StatusCodes.CREATED).json({
      message: 'Assignation créée avec succès',
      gigAgent: populatedGigAgent,
      emailSent: emailSent,
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