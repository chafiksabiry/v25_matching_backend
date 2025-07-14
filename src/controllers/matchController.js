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

    // Ajouter les détails du matching des langues à la réponse
    const response = {
      ...match.toObject(),
      languageMatch: {
        score: languageMatch.score,
        details: languageMatch.details
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
    console.log('🔍 Comparing timezones:', {
      gigTimezoneId,
      agentTimezoneId,
      gigType: typeof gigTimezoneId,
      agentType: typeof agentTimezoneId
    });

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
        console.log('❌ Error finding gig timezone in compareTimezones:', error.message);
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
        console.log('❌ Error finding agent timezone in compareTimezones:', error.message);
      }
    }
    
    if (!gigTimezone || !agentTimezone) {
      console.log('❌ Timezone data not found:', {
        gigTimezoneId,
        agentTimezoneId,
        gigTimezoneFound: !!gigTimezone,
        agentTimezoneFound: !!agentTimezone,
        gigTimezoneData: gigTimezone || 'Not found',
        agentTimezoneData: agentTimezone || 'Not found',
        gigTimezoneIdType: typeof gigTimezoneId,
        agentTimezoneIdType: typeof agentTimezoneId
      });
      
      // Si aucune timezone n'est trouvée, retourner un score neutre au lieu d'un no_match
      return {
        score: 0.5, // Score neutre
        status: "partial_match", // Permettre le matching
        details: {
          gigTimezone: gigTimezone?.zoneName || 'Unknown',
          agentTimezone: agentTimezone?.zoneName || 'Unknown',
          gmtOffsetDifference: null,
          reason: 'Timezone data not found - using neutral score'
        }
      };
    }

    const gmtOffsetDifference = Math.abs(gigTimezone.gmtOffset - agentTimezone.gmtOffset);
    
    console.log('🌍 Timezone comparison details:', {
      gigTimezone: {
        id: gigTimezoneId,
        zoneName: gigTimezone.zoneName,
        countryCode: gigTimezone.countryCode,
        countryName: gigTimezone.countryName,
        gmtOffset: gigTimezone.gmtOffset
      },
      agentTimezone: {
        id: agentTimezoneId,
        zoneName: agentTimezone.zoneName,
        countryCode: agentTimezone.countryCode,
        countryName: agentTimezone.countryName,
        gmtOffset: agentTimezone.gmtOffset
      },
      difference: {
        gmtOffsetDifference,
        hoursDifference: Math.round(gmtOffsetDifference / 3600 * 100) / 100
      }
    });

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
        gmtOffsetDifference,
        reason
      }
    };
  } catch (error) {
    console.error('Error comparing timezones:', error);
    return {
      score: 0,
      status: "no_match",
      details: {
        gigTimezone: 'Unknown',
        agentTimezone: 'Unknown',
        gmtOffsetDifference: null,
        reason: 'Error comparing timezones'
      }
    };
  }
};

// Add region comparison function
const compareRegions = async (gigDestinationZone, agentTimezoneId) => {
  try {
    console.log('🌍 Comparing regions:', {
      gigDestinationZone,
      agentTimezoneId,
      gigType: typeof gigDestinationZone,
      agentType: typeof agentTimezoneId
    });

    // Si le gig n'a pas de destination_zone, retourner un score neutre
    if (!gigDestinationZone) {
      console.log('❌ Gig destination zone not found');
      return {
        score: 0.5, // Score neutre
        status: "partial_match",
        details: {
          gigDestinationZone: 'Unknown',
          agentCountryCode: 'Unknown',
          reason: 'Gig destination zone not found - using neutral score'
        }
      };
    }

    // Récupérer le countryCode de l'agent à partir de son timezone
    let agentTimezone = null;
    let agentCountryCode = null;

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
        console.log('❌ Error finding agent timezone in compareRegions:', error.message);
      }
    }

    if (agentTimezone) {
      agentCountryCode = agentTimezone.countryCode;
    }

    console.log('🌍 Region comparison details:', {
      gigDestinationZone,
      agentCountryCode,
      agentTimezone: agentTimezone ? {
        id: agentTimezoneId,
        zoneName: agentTimezone.zoneName,
        countryCode: agentTimezone.countryCode,
        countryName: agentTimezone.countryName
      } : 'Not found'
    });

    // Si on ne peut pas récupérer le countryCode de l'agent, retourner un score neutre
    if (!agentCountryCode) {
      console.log('❌ Agent country code not found');
      return {
        score: 0.5, // Score neutre
        status: "partial_match",
        details: {
          gigDestinationZone,
          agentCountryCode: 'Unknown',
          reason: 'Agent country code not found - using neutral score'
        }
      };
    }

    // Comparer les codes de pays
    const isSameRegion = gigDestinationZone.toUpperCase() === agentCountryCode.toUpperCase();
    
    console.log('🌍 Region match result:', {
      gigDestinationZone: gigDestinationZone.toUpperCase(),
      agentCountryCode: agentCountryCode.toUpperCase(),
      isSameRegion
    });

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
        reason
      }
    };
  } catch (error) {
    console.error('Error comparing regions:', error);
    return {
      score: 0,
      status: "no_match",
      details: {
        gigDestinationZone: 'Unknown',
        agentCountryCode: 'Unknown',
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
      console.log('Invalid gig day data:', gigDay);
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

    console.log('Gig data:', {
      id: gig._id,
      title: gig.title,
      skills: gig.skills,
      languages: gig.skills?.languages,
      schedule: gig.availability?.schedule,
      timezone: {
        time_zone: gig.availability?.time_zone,
        timeZone: gig.availability?.timeZone,
        timezoneType: typeof gig.availability?.time_zone || typeof gig.availability?.timeZone
      }
    });

    // Get weights from request body or use defaults
    const weights = req.body.weights || { skills: 0.25, languages: 0.25, schedule: 0.2, timezone: 0.15, region: 0.15 };
    console.log('Using weights:', weights);

    console.log('Recherche des agents avec les critères suivants:', {
      'personalInfo.languages': { $exists: true, $ne: [] }
    });

    const agents = await Agent.find({})
      .select('personalInfo skills availability');

    console.log('Nombre total d\'agents trouvés:', agents.length);
    console.log('Liste complète des agents:', agents.map(agent => ({
      id: agent._id,
      name: agent.personalInfo?.name,
      languages: agent.personalInfo?.languages?.map(lang => ({
        language: lang.language,
        proficiency: lang.proficiency
      })),
      schedule: agent.availability?.schedule
    })));

    // Filtrer les agents qui ont des langues
    const agentsWithLanguages = agents.filter(agent => 
      agent.personalInfo?.languages && 
      agent.personalInfo.languages.length > 0
    );

    console.log('Nombre d\'agents avec des langues:', agentsWithLanguages.length);
    console.log('Agents avec des langues:', agentsWithLanguages.map(agent => ({
      id: agent._id,
      name: agent.personalInfo?.name,
      languages: agent.personalInfo?.languages?.map(lang => ({
        language: lang.language,
        proficiency: lang.proficiency
      }))
    })));

    const matches = await Promise.all(agentsWithLanguages.map(async agent => {
      console.log('Traitement de l\'agent:', {
        id: agent._id,
        name: agent.personalInfo?.name,
        languages: agent.personalInfo?.languages,
        schedule: agent.availability?.schedule
      });

      // Language matching
      const requiredLanguages = gig.skills?.languages || [];
      const agentLanguages = agent.personalInfo?.languages || [];
      
      console.log('Correspondance des langues pour', agent.personalInfo?.name, ':', {
        required: requiredLanguages,
        agent: agentLanguages
      });

      let matchingLanguages = [];
      let missingLanguages = [];
      let insufficientLanguages = [];

      requiredLanguages.forEach(reqLang => {
        if (!reqLang?.language) return;
        
        const normalizedReqLang = normalizeLanguage(reqLang.language);
        console.log('Recherche de correspondance pour la langue:', {
          required: reqLang.language,
          normalized: normalizedReqLang
        });

        const agentLang = agentLanguages.find(
          lang => lang?.language && normalizeLanguage(lang.language) === normalizedReqLang
        );

        if (agentLang) {
          console.log('Langue trouvée pour', agent.personalInfo?.name, ':', {
            language: agentLang.language,
            proficiency: agentLang.proficiency
          });
          
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
          
          console.log('🔍 DEBUG - Language scores:', {
            agent: agent.personalInfo?.name,
            agentLevel: agentLang.proficiency,
            normalizedAgentLevel,
            agentScore,
            requiredLevel: reqLang.proficiency,
            normalizedReqLevel,
            requiredScore,
            comparison: `${agentScore} >= ${requiredScore}`,
            result: agentScore >= requiredScore
          });
          
          // Si l'agent a un niveau inférieur, c'est forcément un no_match
          if (agentScore < requiredScore) {
            isLevelMatch = false;
            console.log('🔒 Forced no_match due to insufficient level:', {
              agent: agent.personalInfo?.name,
              agentLevel: agentLang.proficiency,
              agentScore,
              requiredLevel: reqLang.proficiency,
              requiredScore
            });
          } else {
            // Si l'agent a un niveau suffisant, confirmer le match
            isLevelMatch = true;
            console.log('✅ Confirmed match due to sufficient level:', {
              agent: agent.personalInfo?.name,
              agentLevel: agentLang.proficiency,
              agentScore,
              requiredLevel: reqLang.proficiency,
              requiredScore
            });
          }

          console.log('Language level comparison:', {
            agent: agent.personalInfo?.name,
            language: reqLang.language,
            requiredLevel: reqLang.proficiency,
            normalizedReqLevel,
            agentLevel: agentLang.proficiency,
            normalizedAgentLevel,
            isNativeRequired,
            agentScore: getLanguageLevelScore(normalizedAgentLevel),
            requiredScore: getLanguageLevelScore(normalizedReqLevel),
            isLevelMatch,
            comparison: `${getLanguageLevelScore(normalizedAgentLevel)} >= ${getLanguageLevelScore(normalizedReqLevel)}`
          });

          if (isLevelMatch) {
            console.log('✅ Language match accepted:', {
              agent: agent.personalInfo?.name,
              language: reqLang.language,
              requiredLevel: reqLang.proficiency,
              agentLevel: agentLang.proficiency
            });
            matchingLanguages.push({
              language: reqLang.language,
              requiredLevel: reqLang.proficiency,
              agentLevel: agentLang.proficiency
            });
          } else {
            console.log('❌ Language match rejected:', {
              agent: agent.personalInfo?.name,
              language: reqLang.language,
              requiredLevel: reqLang.proficiency,
              agentLevel: agentLang.proficiency
            });
            insufficientLanguages.push({
              language: reqLang.language,
              requiredLevel: reqLang.proficiency,
              agentLevel: agentLang.proficiency
            });
          }
        } else {
          missingLanguages.push(reqLang.language);
        }
      });

      // Skills matching - récupérer les noms des skills
      const gigTechnicalSkillIds = (gig.skills?.technical || []).map(s => s.skill);
      const gigProfessionalSkillIds = (gig.skills?.professional || []).map(s => s.skill);
      const gigSoftSkillIds = (gig.skills?.soft || []).map(s => s.skill);
      
      const agentTechnicalSkillIds = (agent.skills?.technical || []).map(s => s.skill);
      const agentProfessionalSkillIds = (agent.skills?.professional || []).map(s => s.skill);
      const agentSoftSkillIds = (agent.skills?.soft || []).map(s => s.skill);
      
      // Récupérer les noms des skills
      const [gigTechnicalSkills, gigProfessionalSkills, gigSoftSkills, 
             agentTechnicalSkills, agentProfessionalSkills, agentSoftSkills] = await Promise.all([
        getSkillNames(gigTechnicalSkillIds, 'technical'),
        getSkillNames(gigProfessionalSkillIds, 'professional'),
        getSkillNames(gigSoftSkillIds, 'soft'),
        getSkillNames(agentTechnicalSkillIds, 'technical'),
        getSkillNames(agentProfessionalSkillIds, 'professional'),
        getSkillNames(agentSoftSkillIds, 'soft')
      ]);
      
      // Créer les mappings pour faciliter la recherche
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

      console.log('Skills matching:', {
        required: requiredSkills,
        agent: agentSkills
      });

      let matchingSkills = [];
      let missingSkills = [];
      let insufficientSkills = [];

      // Check if agent has all required skills
      const hasAllRequiredSkills = requiredSkills.every(reqSkill => {
        if (!reqSkill?.skill) return true;
        
        // Comparer uniquement les IDs des skills, pas les niveaux
        const agentSkill = agentSkills.find(
          skill => skill?.skill && skill.skill.toString() === reqSkill.skill.toString() && skill.type === reqSkill.type
        );

        if (agentSkill) {
          console.log('Skill found (ID-based matching):', {
            skill: reqSkill.skill,
            skillName: reqSkill.name,
            agentLevel: agentSkill.level,
            requiredLevel: reqSkill.level,
            skillType: reqSkill.type
          });

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
          console.log('Skill not found:', {
            skill: reqSkill.skill,
            skillName: reqSkill.name,
            skillType: reqSkill.type
          });
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
    console.log('🔍 Timezone matching for agent:', {
      agentName: agent.personalInfo?.name,
      agentTimezoneId: agent.availability?.timeZone,
      gigTimezoneId: gig.availability?.time_zone || gig.availability?.timeZone
    });
    
    // Récupérer et afficher les données de timezone
    const gigTimezoneId = gig.availability?.time_zone || gig.availability?.timeZone;
    const agentTimezoneId = agent.availability?.timeZone;
    
    console.log('🔍 Timezone IDs:', {
      gigTimezoneId,
      agentTimezoneId,
      gigTimezoneIdType: typeof gigTimezoneId,
      agentTimezoneIdType: typeof agentTimezoneId
    });
    
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
      console.log('❌ Error finding gig timezone:', error.message);
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
      console.log('❌ Error finding agent timezone:', error.message);
    }
    
    console.log('🌍 Gig timezone data:', {
      id: gig.availability?.time_zone || gig.availability?.timeZone,
      zoneName: gigTimezoneData?.zoneName || 'Not found',
      countryCode: gigTimezoneData?.countryCode || 'Not found',
      countryName: gigTimezoneData?.countryName || 'Not found',
      gmtOffset: gigTimezoneData?.gmtOffset || 'Not found'
    });
    
    console.log('🌍 Agent timezone data:', {
      id: agent.availability?.timeZone,
      zoneName: agentTimezoneData?.zoneName || 'Not found',
      countryCode: agentTimezoneData?.countryCode || 'Not found',
      countryName: agentTimezoneData?.countryName || 'Not found',
      gmtOffset: agentTimezoneData?.gmtOffset || 'Not found'
    });
    
    const timezoneMatch = await compareTimezones(gigTimezoneId, agentTimezoneId);
    console.log('✅ Timezone match result for', agent.personalInfo?.name, ':', timezoneMatch);

    // Region matching
    const regionMatch = await compareRegions(gig.destination_zone, agentTimezoneId);
    console.log('🌍 Region match result for', agent.personalInfo?.name, ':', regionMatch);

    // Schedule matching
    const scheduleMatch = compareSchedules(gig.availability?.schedule, agent.availability);
    console.log('Schedule match result:', scheduleMatch);

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

      console.log('Match statuses:', {
        language: languageMatchStatus,
        skills: skillsMatchStatus,
        timezone: timezoneMatch.status,
        region: regionMatch.status,
        schedule: scheduleMatch.status
      });

      // Overall match status - être moins strict et permettre des correspondances partielles
      const overallMatchStatus = (languageMatchStatus === "perfect_match" && 
                                skillsMatchStatus === "perfect_match" && 
                                timezoneMatch.status === "perfect_match" &&
                                regionMatch.status === "perfect_match" &&
                                scheduleMatch.status === "perfect_match") ? "perfect_match" :
                                (languageMatchStatus === "no_match" && 
                                 skillsMatchStatus === "no_match" && 
                                 timezoneMatch.status === "no_match" &&
                                 regionMatch.status === "no_match" &&
                                 scheduleMatch.status === "no_match") ? "no_match" :
                                "partial_match";

      return {
        agentId: agent._id,
        agentInfo: {
          name: agent.personalInfo.name,
          email: agent.personalInfo?.email || '',
          photo: agent.personalInfo?.photo || null,
          location: agent.personalInfo?.location || '',
          phone: agent.personalInfo?.phone || '',
          languages: agent.personalInfo?.languages?.map(lang => ({
            _id: lang._id,
            language: lang.language,
            proficiency: lang.proficiency,
            iso639_1: lang.iso639_1
          })) || [],
          professionalSummary: agent.professionalSummary || {},
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
          experience: agent.experience || []
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
    console.log('Sorted weights for sequential filtering:', sortedWeights);

    let filteredMatches = matches;

    // Appliquer le filtrage séquentiel basé sur les poids
    for (const [criterion, weight] of sortedWeights) {
      console.log(`Filtering by ${criterion} with weight ${weight}`);
      
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

      console.log(`After ${criterion} filtering: ${filteredMatches.length} matches remaining`);
    }



    // Filtrage global obligatoire - rejeter tous les agents qui ont des no_match
    const finalFilteredMatches = filteredMatches.filter(match => {
      const hasLanguageMatch = match.languageMatch.details.matchStatus === "perfect_match";
      const hasSkillsMatch = match.skillsMatch.details.matchStatus === "perfect_match";
      const hasTimezoneMatch = match.timezoneMatch.matchStatus === "perfect_match";
      const hasRegionMatch = match.regionMatch.matchStatus === "perfect_match";
      const hasScheduleMatch = match.scheduleMatch.matchStatus === "perfect_match";
      
      // Un agent doit avoir au moins un perfect_match pour être considéré
      return hasLanguageMatch || hasSkillsMatch || hasTimezoneMatch || hasRegionMatch || hasScheduleMatch;
    });

    console.log('Filtrage global appliqué:', {
      before: filteredMatches.length,
      after: finalFilteredMatches.length,
      removed: filteredMatches.length - finalFilteredMatches.length
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
        perfectMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchStatus === "partial_match").length,
        noMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length,
        byType: {
          technical: {
            perfectMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length,
            partialMatches: finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length,
            noMatches: finalFilteredMatches.length - finalFilteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length
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
        }
      },
      timezoneStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.timezoneMatch.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.timezoneMatch.matchStatus === "partial_match").length,
        noMatches: finalFilteredMatches.filter(m => m.timezoneMatch.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length
      },
      regionStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.regionMatch.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.regionMatch.matchStatus === "partial_match").length,
        noMatches: finalFilteredMatches.filter(m => m.regionMatch.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length
      },
      scheduleStats: {
        perfectMatches: finalFilteredMatches.filter(m => m.scheduleMatch.matchStatus === "perfect_match").length,
        partialMatches: finalFilteredMatches.filter(m => m.scheduleMatch.matchStatus === "partial_match").length,
        noMatches: finalFilteredMatches.filter(m => m.scheduleMatch.matchStatus === "no_match").length,
        totalMatches: finalFilteredMatches.length
      }
    };

    console.log('Statistiques après filtrage global:', stats);
    
    res.json({
      preferedmatches: finalFilteredMatches,
      ...stats
    });
  } catch (error) {
    console.error("Error in findMatchesForGigById:", error);
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

    console.log('Agent found:', {
      id: agent._id,
      name: agent.personalInfo.name,
      skills: agent.skills,
      languages: agent.personalInfo.languages,
      experience: agent.experience
    });

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

    console.log('Number of gigs found:', gigs.length);

    // Poids par défaut pour le matching
    const defaultWeights = {
      industry: 0.9,
      skills: 0.7,
      language: 0.6,
      experience: 0.5,
      availability: 0.4
    };

    const weights = req.body.weights || defaultWeights;
    console.log('Using weights:', weights);

    // Afficher les critères triés
    const sortedEntries = Object.entries(weights)
      .sort(([, a], [, b]) => b - a);
    console.log('Sorted criteria with weights:');
    sortedEntries.forEach(([criterion, weight]) => {
      console.log(`- ${criterion}: ${weight}`);
    });

    const result = await findMatches(agent, gigs, weights);
    console.log('Matching results:', {
      totalMatches: result.matches.length,
      topScore: result.matches[0]?.score
    });

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("Error in findMatchesForAgentById:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Generate optimal matches
export const generateOptimalMatches = async (req, res) => {
  try {
    const { weights } = req.body;
    
    const agents = await Agent.find();
    const gigs = await Gig.find();
    
    const gigMatches = await Promise.all(
      gigs.map(async gig => {
        const result = await findMatches(gig, agents, weights);
        return {
          gigId: gig._id,
          matches: result.matches
        };
      })
    );
    
    res.status(StatusCodes.OK).json({
      gigMatches,
      totalGigs: gigs.length,
      totalAgents: agents.length
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

    console.log('Finding language matches for gig:', {
      id: gig._id,
      title: gig.title,
      requiredLanguages: gig.skills?.languages
    });

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
    console.log('Language matching results:', {
      totalMatches: result.matches.length,
      qualifyingAgents: result.qualifyingAgents
    });

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("Error in findLanguageMatchesForGig:", error);
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
      console.log('getLanguageLevelScore:', { level, normalized, score });
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
    console.error("Error in findSkillsMatchesForGig:", error);
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
      
      console.log('Email de notification envoyé avec succès:', emailResult);
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
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
    console.error('Error in createGigAgentFromMatch:', error);
    
    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({ 
        message: 'Une assignation existe déjà pour cet agent et ce gig' 
      });
    }
    
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};