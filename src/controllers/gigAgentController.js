import { startOfWeek, format, parseISO, isValid } from 'date-fns';
import mongoose from 'mongoose';
import GigAgent from '../models/GigAgent.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import Currency from '../models/Currency.js';
import Timezone from '../models/Timezone.js';
import Country from '../models/Country.js';
import { StatusCodes } from 'http-status-codes';
import { sendMatchingNotification } from '../services/emailService.js';
import { syncAgentGigRelationship, getAgentGigsWithDetails, getGigAgentsWithDetails } from '../utils/relationshipSync.js';
import { broadcastEnrollmentUpdate } from '../websocket/enrollmentUpdates.js';
import { emitToRep, emitToCompany } from '../realtime/hub.js';

// Get all gig agents
export const getAllGigAgents = async (req, res) => {
  try {
    const gigAgents = await GigAgent.find()
      .populate({
        path: 'agentId',
        populate: [
          { path: 'personalInfo.country' },
          { path: 'personalInfo.languages.language' },
          { path: 'professionalSummary.industries' },
          { path: 'professionalSummary.activities' },
          { path: 'skills.technical.skill' },
          { path: 'skills.professional.skill' },
          { path: 'skills.soft.skill' },
          { path: 'availability.timeZone' }
        ]
      })
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' },
          { path: 'companyId', select: 'name logo' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json(gigAgents);
  } catch (error) {
    console.error('Error in getAllGigAgents:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get a specific gig agent by ID
export const getGigAgentById = async (req, res) => {
  try {
    const gigAgent = await GigAgent.findById(req.params.id)
      .populate({
        path: 'agentId',
        populate: [
          { path: 'personalInfo.country' },
          { path: 'personalInfo.languages.language' },
          { path: 'professionalSummary.industries' },
          { path: 'professionalSummary.activities' },
          { path: 'skills.technical.skill' },
          { path: 'skills.professional.skill' },
          { path: 'skills.soft.skill' },
          { path: 'availability.timeZone' }
        ]
      })
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' },
          { path: 'companyId', select: 'name logo' }
        ]
      });

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'GigAgent not found' });
    }

    res.status(StatusCodes.OK).json(gigAgent);
  } catch (error) {
    console.error('Error in getGigAgentById:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get gig agents for a specific agent
export const getGigAgentsForAgent = async (req, res) => {
  try {
    const gigAgents = await GigAgent.find({ agentId: req.params.agentId })
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' },
          { path: 'companyId', select: 'name logo' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json(gigAgents);
  } catch (error) {
    console.error('Error in getGigAgentsForAgent:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get gig agents for a specific gig
export const getGigAgentsForGig = async (req, res) => {
  try {
    const gigAgents = await GigAgent.find({ gigId: req.params.gigId })
      .populate({
        path: 'agentId',
        populate: [
          { path: 'personalInfo.country' },
          { path: 'personalInfo.languages.language' },
          { path: 'professionalSummary.industries' },
          { path: 'professionalSummary.activities' },
          { path: 'skills.technical.skill' },
          { path: 'skills.professional.skill' },
          { path: 'skills.soft.skill' },
          { path: 'availability.timeZone' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json(gigAgents);
  } catch (error) {
    console.error('Error in getGigAgentsForGig:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Create a new gig agent assignment and send email
export const createGigAgent = async (req, res) => {
  try {
    const { agentId, gigId, notes } = req.body;

    // Vérifier que l'agent et le gig existent
    const agent = await Agent.findById(agentId)
      .populate('professionalSummary.industries')
      .populate('personalInfo.languages.language')
      .populate('skills.technical.skill')
      .populate('skills.professional.skill')
      .populate('skills.soft.skill');
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }

    const gig = await Gig.findById(gigId)
      .populate('skills.languages.language')
      .populate('skills.technical.skill')
      .populate('skills.professional.skill')
      .populate('skills.soft.skill')
      .populate('activities')
      .populate('industries');
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }

    // Vérifier si une assignation existe déjà
    const existingAssignment = await GigAgent.findOne({ agentId, gigId });
    if (existingAssignment) {
      return res.status(StatusCodes.CONFLICT).json({
        message: 'Une assignation existe déjà pour cet agent et ce gig'
      });
    }

    // Calculer automatiquement le matching
    const matchDetails = await calculateMatchDetails(agent, gig);
    const matchScore = calculateMatchScore(matchDetails);

    // Créer la nouvelle assignation
    const gigAgent = new GigAgent({
      agentId,
      gigId,
      matchScore,
      matchDetails,
      matchStatus: 'partial_match', // Sera calculé automatiquement
      notes,
      status: 'pending',
      matchingWeights: {
        experience: 0.20,
        skills: 0.20,
        industry: 0.20,
        languages: 0.15,
        availability: 0.10,
        timezone: 0.15,
        activities: 0.0,
        region: 0.0
      }
    });

    // Calculer le statut global de matching
    gigAgent.calculateMatchStatus();

    const savedGigAgent = await gigAgent.save();

    // Envoyer l'email de notification
    let emailSent = false;
    try {
      const emailResult = await sendMatchingNotification(agent, gig, matchDetails);

      if (emailResult.success) {
        // Marquer l'email comme envoyé seulement si succès
        await savedGigAgent.markEmailSent();
        emailSent = true;
        console.log('Email d\'invitation envoyé avec succès');
      } else {
        console.warn('L\'email n\'a pas été envoyé:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email:', emailError);
      // Ne pas échouer la création si l'email échoue
    }

    // 🆕 Synchroniser la relation dans Agent.gigs et Gig.agents
    try {
      await syncAgentGigRelationship(
        agentId,
        gigId,
        'invited',
        {
          invitationDate: new Date(),
          gigAgentId: savedGigAgent._id
        }
      );
    } catch (syncError) {
      console.error('Erreur lors de la synchronisation:', syncError);
    }

    // Retourner la réponse avec les détails
    const populatedGigAgent = await GigAgent.findById(savedGigAgent._id)
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' },
          { path: 'companyId', select: 'name logo' }
        ]
      });

    // 🔔 Notifier le rep en temps réel d'une nouvelle invitation (room rep:<id>).
    try {
      emitToRep(agentId, 'invitation_new', {
        gigId: String(gigId),
        gigTitle: gig?.title || null
      });
    } catch (wsError) {
      console.error('[Realtime] invitation_new emit failed:', wsError);
    }

    res.status(StatusCodes.CREATED).json({
      message: 'Assignation créée avec succès',
      gigAgent: populatedGigAgent,
      emailSent: emailSent,
      matchScore: matchScore
    });

  } catch (error) {
    console.error('Error in createGigAgent:', error);

    if (error.code === 11000) {
      return res.status(StatusCodes.CONFLICT).json({
        message: 'Une assignation existe déjà pour cet agent et ce gig'
      });
    }

    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Fonction pour calculer les détails de matching
const calculateMatchDetails = async (agent, gig) => {
  // Language matching
  const requiredLanguages = gig.skills?.languages || [];
  const agentLanguages = agent.personalInfo?.languages || [];

  let matchingLanguages = [];
  let missingLanguages = [];
  let insufficientLanguages = [];

  requiredLanguages.forEach(reqLang => {
    if (!reqLang?.language) return;

    const normalizedReqLang = normalizeLanguage(reqLang.language);
    const agentLang = agentLanguages.find(
      lang => lang?.language && normalizeLanguage(lang.language) === normalizedReqLang
    );

    if (agentLang) {
      const normalizedReqLevel = normalizeLanguage(reqLang.proficiency);
      const normalizedAgentLevel = normalizeLanguage(agentLang.proficiency);

      const isNativeRequired = ['native', 'natif'].includes(normalizedReqLevel);
      const isLevelMatch = isNativeRequired
        ? ['native', 'natif', 'c2'].includes(normalizedAgentLevel)
        : getLanguageLevelScore(normalizedAgentLevel) >= getLanguageLevelScore(normalizedReqLevel);

      if (isLevelMatch) {
        matchingLanguages.push({
          language: extractCleanData(reqLang.language),
          languageName: extractCleanData(reqLang.language),
          requiredLevel: reqLang.proficiency,
          agentLevel: agentLang.proficiency
        });
      } else {
        insufficientLanguages.push({
          language: extractCleanData(reqLang.language),
          languageName: extractCleanData(reqLang.language),
          requiredLevel: reqLang.proficiency,
          agentLevel: agentLang.proficiency
        });
      }
    } else {
      missingLanguages.push({
        language: extractCleanData(reqLang.language),
        languageName: extractCleanData(reqLang.language),
        requiredLevel: reqLang.proficiency
      });
    }
  });

  // Skills matching
  const requiredSkills = [
    ...(gig.skills?.technical || []).map(s => ({ skill: s.skill, level: s.level, type: 'technical' })),
    ...(gig.skills?.professional || []).map(s => ({ skill: s.skill, level: s.level, type: 'professional' })),
    ...(gig.skills?.soft || []).map(s => ({ skill: s.skill, level: s.level, type: 'soft' }))
  ];

  const agentSkills = [
    ...(agent.skills?.technical || []).map(s => ({ skill: s.skill, level: s.level, type: 'technical' })),
    ...(agent.skills?.professional || []).map(s => ({ skill: s.skill, level: s.level, type: 'professional' })),
    ...(agent.skills?.soft || []).map(s => ({ skill: s.skill, level: s.level, type: 'soft' }))
  ];

  let matchingSkills = [];
  let missingSkills = [];
  let insufficientSkills = [];

  requiredSkills.forEach(reqSkill => {
    if (!reqSkill?.skill) return;

    const normalizedReqSkill = normalizeSkill(reqSkill.skill);
    const agentSkill = agentSkills.find(
      skill => skill?.skill && normalizeSkill(skill.skill) === normalizedReqSkill && skill.type === reqSkill.type
    );

    if (agentSkill) {
      // ⭐ NOUVEAU: Ignorer les niveaux - si l'agent a la skill, c'est un match
      matchingSkills.push({
        skill: extractCleanData(reqSkill.skill),
        skillName: extractCleanData(reqSkill.skill),
        requiredLevel: reqSkill.level,
        agentLevel: agentSkill.level,
        type: reqSkill.type
      });
    } else {
      missingSkills.push({
        skill: extractCleanData(reqSkill.skill),
        skillName: extractCleanData(reqSkill.skill),
        type: reqSkill.type,
        requiredLevel: reqSkill.level
      });
    }
  });

  // Industry matching
  const industryMatch = calculateIndustryMatch(agent, gig);

  // Activity matching
  const activityMatch = calculateActivityMatch(agent, gig);

  // Experience matching
  const experienceMatch = calculateExperienceMatch(agent, gig);

  // Timezone matching
  const timezoneMatch = calculateTimezoneMatch(agent, gig);

  // Region matching
  const regionMatch = calculateRegionMatch(agent, gig);

  // Schedule matching
  const scheduleMatch = compareSchedules(gig.availability?.schedule, agent.availability);

  // Determine match status
  const languageMatchStatus = matchingLanguages.length === requiredLanguages.length ? "perfect_match" :
    matchingLanguages.length > 0 ? "partial_match" : "no_match";

  const skillsMatchStatus = matchingSkills.length === requiredSkills.length ? "perfect_match" :
    matchingSkills.length > 0 ? "partial_match" : "no_match";

  return {
    languageMatch: {
      score: matchingLanguages.length / Math.max(requiredLanguages.length, 1),
      details: {
        matchingLanguages,
        missingLanguages,
        insufficientLanguages,
        matchStatus: languageMatchStatus
      }
    },
    skillsMatch: {
      score: matchingSkills.length / Math.max(requiredSkills.length, 1),
      details: {
        matchingSkills,
        missingSkills,
        insufficientSkills,
        matchStatus: skillsMatchStatus
      }
    },
    industryMatch,
    activityMatch,
    experienceMatch,
    timezoneMatch,
    regionMatch,
    availabilityMatch: {
      score: scheduleMatch.score,
      details: scheduleMatch.details,
      matchStatus: scheduleMatch.status
    }
  };
};

// Fonction pour calculer le score global
const calculateMatchScore = (matchDetails) => {
  const languageScore = matchDetails.languageMatch?.score || 0;
  const skillsScore = matchDetails.skillsMatch?.score || 0;
  const industryScore = matchDetails.industryMatch?.score || 0;
  const activityScore = matchDetails.activityMatch?.score || 0;
  const experienceScore = matchDetails.experienceMatch?.score || 0;
  const timezoneScore = matchDetails.timezoneMatch?.score || 0;
  const regionScore = matchDetails.regionMatch?.score || 0;
  const availabilityScore = matchDetails.availabilityMatch?.score || 0;

  // Poids par défaut
  const weights = {
    language: 0.15,
    skills: 0.20,
    industry: 0.20,
    activity: 0.05,
    experience: 0.20,
    timezone: 0.10,
    region: 0.05,
    availability: 0.05
  };

  return (
    languageScore * weights.language +
    skillsScore * weights.skills +
    industryScore * weights.industry +
    activityScore * weights.activity +
    experienceScore * weights.experience +
    timezoneScore * weights.timezone +
    regionScore * weights.region +
    availabilityScore * weights.availability
  );
};

// Fonction pour calculer le matching d'industrie
const calculateIndustryMatch = (agent, gig) => {
  if (!gig.category || !agent.professionalSummary?.industries) {
    return {
      score: 0,
      details: {
        matchingIndustries: [],
        missingIndustries: [],
        matchStatus: 'no_match'
      }
    };
  }

  const normalizeString = (str) => {
    if (!str) return "";

    // Handle ObjectId case
    if (typeof str === 'object' && str.toString) {
      str = str.toString();
    }
    // Handle number case
    else if (typeof str === 'number') {
      str = str.toString();
    }

    // Ensure str is a string before calling toLowerCase
    if (typeof str !== 'string') {
      return "";
    }

    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
  };

  const gigCategory = normalizeString(gig.category);
  const matchingIndustries = [];
  const missingIndustries = [];

  const hasMatchingIndustry = agent.professionalSummary.industries.some(industry => {
    const normalizedIndustry = normalizeString(industry);
    const isExactMatch = normalizedIndustry === gigCategory;
    const isPartialMatch = normalizedIndustry.includes(gigCategory) || gigCategory.includes(normalizedIndustry);

    if (isExactMatch || isPartialMatch) {
      matchingIndustries.push({
        industry: extractCleanData(gig.category),
        industryName: extractCleanData(gig.category),
        agentIndustryName: extractCleanData(industry)
      });
      return true;
    }
    return false;
  });

  if (!hasMatchingIndustry) {
    missingIndustries.push({
      industry: extractCleanData(gig.category),
      industryName: extractCleanData(gig.category)
    });
  }

  return {
    score: hasMatchingIndustry ? 1.0 : 0.0,
    details: {
      matchingIndustries,
      missingIndustries,
      matchStatus: hasMatchingIndustry ? 'perfect_match' : 'no_match'
    }
  };
};

// Fonction pour calculer le matching d'activités
const calculateActivityMatch = (agent, gig) => {
  if (!gig.activities || !agent.professionalSummary?.activities) {
    return {
      score: 0,
      details: {
        matchingActivities: [],
        missingActivities: [],
        matchStatus: 'no_match'
      }
    };
  }

  const normalizeString = (str) => {
    if (!str) return "";

    // Handle ObjectId case
    if (typeof str === 'object' && str.toString) {
      str = str.toString();
    }
    // Handle number case
    else if (typeof str === 'number') {
      str = str.toString();
    }

    // Ensure str is a string before calling toLowerCase
    if (typeof str !== 'string') {
      return "";
    }

    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
  };

  const matchingActivities = [];
  const missingActivities = [];

  gig.activities.forEach(gigActivity => {
    const normalizedGigActivity = normalizeString(gigActivity);
    const agentActivity = agent.professionalSummary.activities.find(activity => {
      const normalizedActivity = normalizeString(activity);
      return normalizedActivity === normalizedGigActivity ||
        normalizedActivity.includes(normalizedGigActivity) ||
        normalizedGigActivity.includes(normalizedActivity);
    });

    if (agentActivity) {
      matchingActivities.push({
        activity: extractCleanData(gigActivity),
        activityName: extractCleanData(gigActivity),
        agentActivityName: extractCleanData(agentActivity)
      });
    } else {
      missingActivities.push({
        activity: extractCleanData(gigActivity),
        activityName: extractCleanData(gigActivity)
      });
    }
  });

  const hasMatches = matchingActivities.length > 0;
  const allMatch = matchingActivities.length === gig.activities.length;

  return {
    score: allMatch ? 1.0 : hasMatches ? 0.5 : 0.0,
    details: {
      matchingActivities,
      missingActivities,
      matchStatus: allMatch ? 'perfect_match' : hasMatches ? 'partial_match' : 'no_match'
    }
  };
};

// Fonction pour calculer le matching d'expérience
const calculateExperienceMatch = (agent, gig) => {
  if (!gig.seniority?.yearsExperience || !agent.professionalSummary?.yearsOfExperience) {
    return {
      score: 0.5,
      details: {
        gigRequiredExperience: 0,
        agentExperience: 0,
        difference: 0,
        reason: 'Missing experience data'
      },
      matchStatus: 'no_match'
    };
  }

  const agentExperience = parseInt(agent.professionalSummary.yearsOfExperience) || 0;
  const gigExperience = parseInt(gig.seniority.yearsExperience) || 0;
  const difference = agentExperience - gigExperience;

  let score = 0;
  let reason = '';
  let matchStatus = 'no_match';

  if (agentExperience >= gigExperience) {
    if (agentExperience === gigExperience) {
      score = 1.0;
      reason = 'Exact experience match';
      matchStatus = 'perfect_match';
    } else if (agentExperience <= gigExperience * 1.5) {
      score = 0.9;
      reason = 'Slightly more experience (good)';
      matchStatus = 'perfect_match';
    } else if (agentExperience <= gigExperience * 2) {
      score = 0.8;
      reason = 'More experience but acceptable';
      matchStatus = 'partial_match';
    } else {
      score = 0.7;
      reason = 'Much more experience (may be overqualified)';
      matchStatus = 'partial_match';
    }
  } else {
    if (agentExperience >= gigExperience * 0.8) {
      score = 0.6;
      reason = 'Almost sufficient experience';
      matchStatus = 'partial_match';
    } else if (agentExperience >= gigExperience * 0.6) {
      score = 0.4;
      reason = 'Partially sufficient experience';
      matchStatus = 'partial_match';
    } else if (agentExperience >= gigExperience * 0.4) {
      score = 0.2;
      reason = 'Insufficient but not completely';
      matchStatus = 'no_match';
    } else {
      score = 0.0;
      reason = 'Completely insufficient experience';
      matchStatus = 'no_match';
    }
  }

  return {
    score,
    details: {
      gigRequiredExperience: gigExperience,
      agentExperience: agentExperience,
      difference: difference,
      reason: reason
    },
    matchStatus
  };
};

// Fonction pour calculer le matching de timezone
const calculateTimezoneMatch = (agent, gig) => {
  if (!gig.availability?.timeZone || !agent.availability?.timeZone) {
    return {
      score: 0.5,
      details: {
        gigTimezone: gig.availability?.timeZone || 'Unknown',
        agentTimezone: agent.availability?.timeZone || 'Unknown',
        reason: 'Missing timezone data'
      },
      matchStatus: 'no_match'
    };
  }

  const gigTimezone = gig.availability.timeZone;
  const agentTimezone = agent.availability.timeZone;
  const isExactMatch = gigTimezone === agentTimezone;

  let score = 0;
  let reason = '';
  let matchStatus = 'no_match';

  if (isExactMatch) {
    score = 1.0;
    reason = 'Exact timezone match';
    matchStatus = 'perfect_match';
  } else {
    // Logique simplifiée pour la compatibilité de timezone
    score = 0.7;
    reason = 'Different timezones but potentially compatible';
    matchStatus = 'partial_match';
  }

  return {
    score,
    details: {
      gigTimezone,
      agentTimezone,
      reason
    },
    matchStatus
  };
};

// Fonction pour calculer le matching de région
const calculateRegionMatch = (agent, gig) => {
  if (!gig.destination_zone) {
    return {
      score: 0.5,
      details: {
        gigDestinationZone: 'Unknown',
        agentCountryCode: 'Unknown',
        reason: 'No destination zone specified'
      },
      matchStatus: 'neutral_match'
    };
  }

  // Logique simplifiée pour la compatibilité régionale
  const score = 0.8;
  const reason = 'Regional compatibility assumed';

  return {
    score,
    details: {
      gigDestinationZone: gig.destination_zone,
      agentCountryCode: 'Unknown',
      reason
    },
    matchStatus: 'partial_match'
  };
};

// Fonction de normalisation des langues (importée depuis matchController)
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

// Fonction de normalisation des compétences (skills)
const normalizeSkill = (skill) => {
  if (!skill) return '';

  // Handle populated Skill object case (has name property)
  if (typeof skill === 'object' && skill.name) {
    skill = skill.name;
  }
  // Handle ObjectId case (non-populated references)
  else if (typeof skill === 'object' && skill.toString) {
    skill = skill.toString();
  }

  // Ensure skill is a string before calling toLowerCase
  if (typeof skill !== 'string') {
    return '';
  }

  return skill.toLowerCase().trim();
};

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

// Fonction pour obtenir le score de niveau de langue (importée depuis matchController)
const getLanguageLevelScore = (level) => {
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
  return levels[normalized] || 0;
};

// Fonction de comparaison des horaires (importée depuis matchController)
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

// Update a gig agent
export const updateGigAgent = async (req, res) => {
  try {
    const { status, notes, agentResponse } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (agentResponse) {
      updateData.agentResponse = agentResponse;
      updateData.agentResponseAt = new Date();
    }

    const gigAgent = await GigAgent.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('agentId').populate({
      path: 'gigId',
      populate: [
        { path: 'commission.currency' },
        { path: 'destination_zone' },
        { path: 'availability.time_zone' }
      ]
    });

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'GigAgent not found' });
    }

    res.status(StatusCodes.OK).json({
      message: 'GigAgent updated successfully',
      gigAgent
    });
  } catch (error) {
    console.error('Error in updateGigAgent:', error);
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Delete a gig agent
export const deleteGigAgent = async (req, res) => {
  try {
    const gigAgent = await GigAgent.findByIdAndDelete(req.params.id);

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'GigAgent not found' });
    }

    res.status(StatusCodes.OK).json({
      message: 'GigAgent deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteGigAgent:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Resend email notification
export const resendEmailNotification = async (req, res) => {
  try {
    const gigAgent = await GigAgent.findById(req.params.id)
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'GigAgent not found' });
    }

    // Envoyer l'email de notification
    const emailResult = await sendMatchingNotification(
      gigAgent.agentId,
      gigAgent.gigId,
      gigAgent.matchDetails
    );

    let message = 'Email de notification renvoyé avec succès';
    if (emailResult.success) {
      // Marquer l'email comme envoyé
      await gigAgent.markEmailSent();
    } else {
      message = `L'email n'a pas pu être envoyé: ${emailResult.error || 'Erreur inconnue'}`;
    }

    res.status(StatusCodes.OK).json({
      message,
      emailResult
    });

  } catch (error) {
    console.error('Error in resendEmailNotification:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: `Échec de l'envoi de l'email: ${error.message}`
    });
  }
};

// Get invited gigs for an agent
export const getInvitedGigsForAgent = async (req, res) => {
  try {
    const gigAgents = await GigAgent.find({
      agentId: req.params.agentId,
      enrollmentStatus: 'invited'
    })
      .populate({
        path: 'gigId',
        populate: { path: 'commission.currency' }
      })
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json(gigAgents);
  } catch (error) {
    console.error('Error in getInvitedGigsForAgent:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get invited agents for a company
export const getInvitedAgentsForCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    // 1. D'abord, on récupère tous les gigs de la company
    const gigs = await Gig.find({ companyId });

    if (!gigs || gigs.length === 0) {
      return res.status(StatusCodes.OK).json([]);
    }

    const gigIds = gigs.map(gig => gig._id);

    // 2. Ensuite, on cherche les GigAgents qui correspondent à ces gigs
    const gigAgents = await GigAgent.find({
      enrollmentStatus: 'invited',
      gigId: { $in: gigIds }
    })
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: { path: 'commission.currency' }
      })
      .sort({ createdAt: -1 });

    // 3. Extraire les agents uniques de manière sécurisée (évite les erreurs null et Set d'objets)
    const agentMap = new Map();
    gigAgents.forEach(ga => {
      if (ga.agentId && ga.agentId._id) {
        const idStr = ga.agentId._id.toString();
        if (!agentMap.has(idStr)) {
          agentMap.set(idStr, ga.agentId);
        }
      }
    });

    const uniqueAgents = Array.from(agentMap.values());
    res.status(StatusCodes.OK).json(uniqueAgents);
  } catch (error) {
    console.error('Error in getInvitedAgentsForCompany:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get enrolled gigs for an agent
export const getEnrolledGigsForAgent = async (req, res) => {
  try {
    const gigAgents = await GigAgent.find({
      agentId: req.params.agentId,
      enrollmentStatus: 'enrolled'
    })
      .populate({
        path: 'gigId',
        populate: { path: 'commission.currency' }
      })
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json(gigAgents);
  } catch (error) {
    console.error('Error in getEnrolledGigsForAgent:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get enrollment requests for a company
export const getEnrollmentRequestsForCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    // 1. D'abord, on récupère tous les gigs de la company
    const gigs = await Gig.find({ companyId });

    if (!gigs || gigs.length === 0) {
      return res.status(StatusCodes.OK).json([]);
    }

    const gigIds = gigs.map(gig => gig._id);

    // 2. Ensuite, on cherche les GigAgents qui correspondent à ces gigs
    const requests = await GigAgent.find({
      enrollmentStatus: 'requested',
      gigId: { $in: gigIds }
    })
      .populate({
        path: 'gigId',
        populate: { path: 'commission.currency' }
      })
      .populate('agentId')
      .sort({ createdAt: -1 });

    // Filtrer les requêtes où l'agent a pu être supprimé
    const validRequests = requests.filter(r => r.agentId !== null);

    res.status(StatusCodes.OK).json(validRequests);
  } catch (error) {
    console.error('Error in getEnrollmentRequestsForCompany:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get active agents for a company
export const getActiveAgentsForCompany = async (req, res) => {
  try {
    const { companyId } = req.params;

    // 1. D'abord, on récupère tous les gigs de la company
    const gigs = await Gig.find({ companyId });

    if (!gigs || gigs.length === 0) {
      return res.status(StatusCodes.OK).json([]);
    }

    const gigIds = gigs.map(gig => gig._id);

    // 2. Ensuite, on cherche les GigAgents qui correspondent à ces gigs
    const activeAgents = await GigAgent.find({
      enrollmentStatus: 'enrolled',
      gigId: { $in: gigIds }
    })
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: { path: 'commission.currency' }
      })
      .sort({ createdAt: -1 });

    // Filtrer les agents où l'agent a pu être supprimé
    const validActiveAgents = activeAgents.filter(a => a.agentId !== null);

    // Retourner tous les GigAgents actifs
    res.status(StatusCodes.OK).json(validActiveAgents);
  } catch (error) {
    console.error('Error in getActiveAgentsForCompany:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Agent accepts invitation
export const agentAcceptInvitation = async (req, res) => {
  try {
    const gigAgent = await GigAgent.findById(req.params.id);

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Invitation not found'
      });
    }

    if (gigAgent.enrollmentStatus !== 'invited') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Only invited enrollments can be accepted by agent'
      });
    }

    // ✅ Permettre l'acceptation même si l'invitation est expirée
    // if (gigAgent.isInvitationExpired()) {
    //   return res.status(StatusCodes.BAD_REQUEST).json({ 
    //     message: 'Invitation has expired' 
    //   });
    // }

    // Accepter l'enrollment avec les notes optionnelles
    await gigAgent.acceptEnrollment(req.body.notes);

    // Ajouter l'agent à la liste des agents enrôlés du gig
    await Gig.findByIdAndUpdate(
      gigAgent.gigId,
      { $addToSet: { enrolledAgents: gigAgent.agentId } },
      { new: true }
    );

    // 🆕 Synchroniser le statut dans Agent.gigs et Gig.agents
    try {
      await syncAgentGigRelationship(
        gigAgent.agentId,
        gigAgent.gigId,
        'enrolled',
        {
          enrollmentDate: new Date(),
          gigAgentId: gigAgent._id
        }
      );
    } catch (syncError) {
      console.error('Erreur lors de la synchronisation:', syncError);
    }

    // Récupérer le gigAgent mis à jour avec les relations
    const updatedGigAgent = await GigAgent.findById(gigAgent._id)
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });

    res.status(StatusCodes.OK).json({
      message: 'Invitation accepted successfully',
      gigAgent: updatedGigAgent
    });

  } catch (error) {
    console.error('Error in agentAcceptInvitation:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message
    });
  }
};

// Accept enrollment request
export const acceptEnrollmentRequest = async (req, res) => {
  try {
    const gigAgent = await GigAgent.findById(req.params.id);

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Enrollment request not found'
      });
    }

    if (gigAgent.enrollmentStatus !== 'requested') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Only requested enrollments can be accepted'
      });
    }

    // Accepter l'enrollment avec les notes optionnelles
    await gigAgent.acceptEnrollment(req.body.notes);

    // Ajouter l'agent au gig
    await Gig.findByIdAndUpdate(
      gigAgent.gigId,
      { $addToSet: { enrolledAgents: gigAgent.agentId } },
      { new: true }
    );

    // Ajouter le gig à l'agent
    await Agent.findByIdAndUpdate(
      gigAgent.agentId,
      { $addToSet: { enrolledGigs: gigAgent.gigId } },
      { new: true }
    );

    // 🆕 Synchroniser le statut dans Agent.gigs et Gig.agents
    try {
      await syncAgentGigRelationship(
        gigAgent.agentId,
        gigAgent.gigId,
        'enrolled',
        {
          enrollmentDate: new Date(),
          gigAgentId: gigAgent._id
        }
      );
    } catch (syncError) {
      console.error('Erreur lors de la synchronisation:', syncError);
    }

    // Récupérer le gigAgent mis à jour avec les relations
    const updatedGigAgent = await GigAgent.findById(gigAgent._id)
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });

    // 🔔 Notifier le rep en temps réel (marketplace: PENDING → Enrolled)
    try {
      broadcastEnrollmentUpdate({
        type: 'enrollment_update',
        repId: String(gigAgent.agentId),
        gigId: String(gigAgent.gigId),
        status: 'enrolled'
      });
    } catch (wsError) {
      console.error('[Enrollment WS] broadcast failed:', wsError);
    }

    res.status(StatusCodes.OK).json({
      message: 'Enrollment request accepted successfully',
      gigAgent: updatedGigAgent
    });

  } catch (error) {
    console.error('Error in acceptEnrollmentRequest:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message
    });
  }
};



// Agent rejects invitation
export const agentRejectInvitation = async (req, res) => {
  try {
    const gigAgent = await GigAgent.findById(req.params.id);

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Invitation not found'
      });
    }

    if (gigAgent.enrollmentStatus !== 'invited') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: 'Only invited enrollments can be rejected by agent'
      });
    }

    // ✅ Permettre le rejet même si l'invitation est expirée
    // if (gigAgent.isInvitationExpired()) {
    //   return res.status(StatusCodes.BAD_REQUEST).json({ 
    //     message: 'Invitation has expired' 
    //   });
    // }

    const agentId = gigAgent.agentId;
    const gigId = gigAgent.gigId;

    // 🆕 Supprimer complètement la relation au lieu de la marquer comme rejected
    try {
      // 1. Supprimer de Agent.gigs
      await Agent.findByIdAndUpdate(
        agentId,
        { $pull: { gigs: { gigId: gigId } } }
      );

      // 2. Supprimer de Gig.agents
      await Gig.findByIdAndUpdate(
        gigId,
        { $pull: { agents: { agentId: agentId } } }
      );

      // 3. Supprimer le document GigAgent
      await GigAgent.findByIdAndDelete(req.params.id);

      console.log(`✅ Invitation rejected and deleted: Agent ${agentId} <-> Gig ${gigId}`);

    } catch (deleteError) {
      console.error('Erreur lors de la suppression:', deleteError);
      throw deleteError;
    }

    res.status(StatusCodes.OK).json({
      message: 'Invitation rejected and removed successfully'
    });

  } catch (error) {
    console.error('Error in agentRejectInvitation:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message
    });
  }
};

// Agent sends enrollment request
export const sendEnrollmentRequest = async (req, res) => {
  try {
    // Vérifier si le gig existe
    const gig = await Gig.findById(req.params.gigId);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Gig not found'
      });
    }

    // Vérifier si l'agent existe
    const agent = await Agent.findById(req.params.agentId);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'Agent not found'
      });
    }

    // Vérifier si une relation existe déjà
    let gigAgent = await GigAgent.findOne({
      agentId: req.params.agentId,
      gigId: req.params.gigId
    });

    if (gigAgent) {
      // Vérifier si une nouvelle demande est possible
      if (!gigAgent.canRequestEnrollment()) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          message: 'Cannot request enrollment for this gig at this time'
        });
      }
    } else {
      // Créer une nouvelle relation GigAgent
      gigAgent = new GigAgent({
        agentId: req.params.agentId,
        gigId: req.params.gigId,
        status: 'pending'
      });
    }

    // Enregistrer la demande d'enrollment
    await gigAgent.requestEnrollment(req.body.notes);

    // 🆕 Synchroniser le statut dans Agent.gigs et Gig.agents
    try {
      await syncAgentGigRelationship(
        req.params.agentId,
        req.params.gigId,
        'requested',
        {
          invitationDate: new Date(),
          gigAgentId: gigAgent._id
        }
      );
    } catch (syncError) {
      console.error('Erreur lors de la synchronisation:', syncError);
    }

    // Récupérer le gigAgent mis à jour avec les relations
    const updatedGigAgent = await GigAgent.findById(gigAgent._id)
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      });

    // 🔔 Notifier l'entreprise en temps réel d'une nouvelle candidature
    // (room company:<id>). Consommé par le front matching de l'entreprise.
    try {
      if (gig?.companyId) {
        emitToCompany(gig.companyId, 'application_new', {
          gigId: String(req.params.gigId),
          gigTitle: gig?.title || null,
          agentId: String(req.params.agentId)
        });
      }
    } catch (wsError) {
      console.error('[Realtime] application_new emit failed:', wsError);
    }

    res.status(StatusCodes.OK).json({
      message: 'Enrollment request sent successfully',
      gigAgent: updatedGigAgent
    });

  } catch (error) {
    console.error('Error in sendEnrollmentRequest:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message
    });
  }
};

// Get gig agents by status
export const getGigAgentsByStatus = async (req, res) => {
  try {
    const { status } = req.params;

    const gigAgents = await GigAgent.find({ status })
      .populate('agentId')
      .populate({
        path: 'gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      status,
      count: gigAgents.length,
      gigAgents
    });
  } catch (error) {
    console.error('Error in getGigAgentsByStatus:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get statistics for gig agents
export const getGigAgentStats = async (req, res) => {
  try {
    const stats = await GigAgent.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCount = await GigAgent.countDocuments();
    const emailSentCount = await GigAgent.countDocuments({ emailSent: true });
    const pendingResponseCount = await GigAgent.countDocuments({
      status: 'pending',
      emailSent: true
    });

    const statsObject = {
      total: totalCount,
      emailSent: emailSentCount,
      pendingResponse: pendingResponseCount,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    };

    res.status(StatusCodes.OK).json(statsObject);
  } catch (error) {
    console.error('Error in getGigAgentStats:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// 🆕 Get agent's gigs with full details and status
export const getAgentGigsWithStatus = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query; // Optionnel : filtrer par statut

    const gigs = await getAgentGigsWithDetails(agentId, status);

    res.status(StatusCodes.OK).json({
      message: 'Agent gigs retrieved successfully',
      count: gigs.length,
      agentId,
      filterStatus: status || 'all',
      gigs
    });

  } catch (error) {
    console.error('Error in getAgentGigsWithStatus:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message
    });
  }
};

// 🆕 Get gig's agents with full details and status
export const getGigAgentsWithStatus = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { status } = req.query; // Optionnel : filtrer par statut

    const agents = await getGigAgentsWithDetails(gigId, status);

    res.status(StatusCodes.OK).json({
      message: 'Gig agents retrieved successfully',
      count: agents.length,
      gigId,
      filterStatus: status || 'all',
      agents
    });

  } catch (error) {
    console.error('Error in getGigAgentsWithStatus:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: error.message
    });
  }
};

function normalizeWeekStartMonday(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim();
  const d = parseISO(s);
  if (!isValid(d)) return null;
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function sanitizeWeekBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((b) => {
      const isoDay = Math.min(7, Math.max(1, parseInt(b.isoDay, 10) || 1));
      const st = String(b.startTime || '09:00').trim().slice(0, 5);
      const en = String(b.endTime || '10:00').trim().slice(0, 5);
      const duration = Math.max(1, parseInt(b.duration, 10) || 1);
      const capacity = Math.max(1, parseInt(b.capacity, 10) || 1);
      return { isoDay, startTime: st, endTime: en, duration, capacity };
    })
    .filter((b) => b.startTime && b.endTime);
}

function asObjectIdOrEmpty(raw) {
  const s = String(raw || '').trim();
  return mongoose.Types.ObjectId.isValid(s) ? s : '';
}

/** GET /api/gig-agents/session-planning?gigId=&agentId=|repId= */
export const getSessionPlanning = async (req, res) => {
  try {
    const { gigId, agentId, repId } = req.query;
    const gid = asObjectIdOrEmpty(gigId);
    const aid = asObjectIdOrEmpty(agentId || repId);
    if (!gid || !aid) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'gigId and agentId (or repId) are required' });
    }
    const ga = await GigAgent.findOne({ gigId: gid, agentId: aid }).select('sessionPlanning');
    if (!ga) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'GigAgent not found for this gig and agent' });
    }
    const sp = ga.sessionPlanning || { templateWeek: [], weekOverrides: [] };
    res.status(StatusCodes.OK).json({
      data: {
        templateWeek: sp.templateWeek || [],
        weekOverrides: sp.weekOverrides || []
      }
    });
  } catch (error) {
    console.error('Error in getSessionPlanning:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

/**
 * PUT /api/gig-agents/session-planning
 * body: { gigId, agentId|repId, mode: 'template'|'week', templateWeek?, weekStart?, weekBlocks? }
 */
export const updateSessionPlanning = async (req, res) => {
  try {
    const { gigId, agentId, repId, mode, templateWeek, weekStart, weekBlocks } = req.body || {};
    const gid = asObjectIdOrEmpty(gigId);
    const aid = asObjectIdOrEmpty(agentId || repId);
    if (!gid || !aid || !mode) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'gigId, agentId (or repId), and mode are required' });
    }
    const ga = await GigAgent.findOne({ gigId: gid, agentId: aid });
    if (!ga) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'GigAgent not found for this gig and agent' });
    }
    if (!ga.sessionPlanning) {
      ga.sessionPlanning = { templateWeek: [], weekOverrides: [] };
    }

    if (mode === 'template') {
      ga.sessionPlanning.templateWeek = sanitizeWeekBlocks(templateWeek);
      ga.markModified('sessionPlanning');
    } else if (mode === 'week') {
      const ws = normalizeWeekStartMonday(weekStart);
      if (!ws) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: 'weekStart must be a valid date (Monday of week will be used)' });
      }
      const blocks = sanitizeWeekBlocks(weekBlocks);
      const arr = Array.isArray(ga.sessionPlanning.weekOverrides) ? [...ga.sessionPlanning.weekOverrides] : [];
      const idx = arr.findIndex((w) => w.weekStart === ws);
      if (blocks.length === 0) {
        if (idx >= 0) arr.splice(idx, 1);
      } else if (idx >= 0) {
        arr[idx] = { weekStart: ws, blocks };
      } else {
        arr.push({ weekStart: ws, blocks });
      }
      ga.sessionPlanning.weekOverrides = arr;
      ga.markModified('sessionPlanning');
    } else {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'mode must be "template" or "week"' });
    }

    await ga.save();
    const sp = ga.sessionPlanning || { templateWeek: [], weekOverrides: [] };
    res.status(StatusCodes.OK).json({
      data: {
        templateWeek: sp.templateWeek || [],
        weekOverrides: sp.weekOverrides || []
      }
    });
  } catch (error) {
    console.error('Error in updateSessionPlanning:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};