import GigAgent from '../models/GigAgent.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';
import { sendMatchingNotification } from '../services/emailService.js';

// Get all gig agents
export const getAllGigAgents = async (req, res) => {
  try {
    const gigAgents = await GigAgent.find()
      .populate('agentId')
      .populate('gigId')
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
      .populate('agentId')
      .populate('gigId');
    
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
      .populate('gigId')
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
      .populate('agentId')
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
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }

    const gig = await Gig.findById(gigId);
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
      notes,
      status: 'pending'
    });

    const savedGigAgent = await gigAgent.save();

    // Envoyer l'email de notification
    try {
      const emailResult = await sendMatchingNotification(agent, gig, matchDetails);
      
      // Marquer l'email comme envoyé
      await savedGigAgent.markEmailSent();
      
      console.log('Assignation créée avec succès');
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
          language: reqLang.language,
          requiredLevel: reqLang.proficiency,
          agentLevel: agentLang.proficiency
        });
      } else {
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
    
    const normalizedReqSkill = reqSkill.skill.toLowerCase().trim();
    const agentSkill = agentSkills.find(
      skill => skill?.skill && skill.skill.toLowerCase().trim() === normalizedReqSkill && skill.type === reqSkill.type
    );

    if (agentSkill) {
      if (agentSkill.level >= reqSkill.level) {
        matchingSkills.push({
          skill: reqSkill.skill,
          requiredLevel: reqSkill.level,
          agentLevel: agentSkill.level,
          type: reqSkill.type
        });
      } else {
        insufficientSkills.push({
          skill: reqSkill.skill,
          requiredLevel: reqSkill.level,
          agentLevel: agentSkill.level,
          type: reqSkill.type
        });
      }
    } else {
      missingSkills.push(reqSkill.skill);
    }
  });

  // Schedule matching
  const scheduleMatch = compareSchedules(gig.availability?.schedule, agent.availability);

  // Determine match status
  const languageMatchStatus = matchingLanguages.length === requiredLanguages.length ? "perfect_match" : 
                             matchingLanguages.length > 0 ? "partial_match" : "no_match";
  
  const skillsMatchStatus = matchingSkills.length === requiredSkills.length ? "perfect_match" : "no_match";

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
      details: {
        matchingSkills,
        missingSkills,
        insufficientSkills,
        matchStatus: skillsMatchStatus
      }
    },
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
  const skillsScore = matchDetails.skillsMatch?.details?.matchStatus === 'perfect_match' ? 1 : 0;
  const scheduleScore = matchDetails.availabilityMatch?.score || 0;
  
  return (languageScore + skillsScore + scheduleScore) / 3;
};

// Fonction de normalisation des langues (importée depuis matchController)
const normalizeLanguage = (language) => {
  if (!language) return '';
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
    ).populate('agentId').populate('gigId');

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
      .populate('gigId');

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'GigAgent not found' });
    }

    // Envoyer l'email de notification
    const emailResult = await sendMatchingNotification(
      gigAgent.agentId, 
      gigAgent.gigId, 
      gigAgent.matchDetails
    );

    // Marquer l'email comme envoyé
    await gigAgent.markEmailSent();

    res.status(StatusCodes.OK).json({
      message: 'Email de notification renvoyé avec succès',
      emailResult
    });

  } catch (error) {
    console.error('Error in resendEmailNotification:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: `Échec de l'envoi de l'email: ${error.message}` 
    });
  }
};

// Get gig agents by status
export const getGigAgentsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    
    const gigAgents = await GigAgent.find({ status })
      .populate('agentId')
      .populate('gigId')
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