import Match from '../models/Match.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import GigAgent from '../models/GigAgent.js';
import { StatusCodes } from 'http-status-codes';
import { findMatches } from '../utils/matchingUtils.js';
import { findLanguageMatches, getLanguageLevelScore } from '../utils/matchingAlgorithm.js';
import { sendMatchingNotification } from '../services/emailService.js';

// Language normalization function
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
      schedule: gig.availability?.schedule
    });

    // Get weights from request body or use defaults
    const weights = req.body.weights || { skills: 0.4, languages: 0.3, schedule: 0.3 };
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

    const matches = agentsWithLanguages.map(agent => {
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
        
        const normalizedReqSkill = reqSkill.skill.toLowerCase().trim();
        const agentSkill = agentSkills.find(
          skill => skill?.skill && skill.skill.toLowerCase().trim() === normalizedReqSkill && skill.type === reqSkill.type
        );

        if (agentSkill) {
          console.log('Skill level comparison:', {
            skill: reqSkill.skill,
            agentLevel: agentSkill.level,
            requiredLevel: reqSkill.level
          });

          if (agentSkill.level >= reqSkill.level) {
            matchingSkills.push({
              skill: reqSkill.skill,
              requiredLevel: reqSkill.level,
              agentLevel: agentSkill.level,
              type: reqSkill.type
            });
            return true;
          } else {
            insufficientSkills.push({
              skill: reqSkill.skill,
              requiredLevel: reqSkill.level,
              agentLevel: agentSkill.level,
              type: reqSkill.type
            });
            return false;
          }
        } else {
          missingSkills.push({
            skill: reqSkill.skill,
            type: reqSkill.type
          });
          return false;
        }
      });

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
        schedule: scheduleMatch.status
      });

      // Overall match status - être moins strict et permettre des correspondances partielles
      const overallMatchStatus = (languageMatchStatus === "perfect_match" && 
                                skillsMatchStatus === "perfect_match" && 
                                scheduleMatch.status === "perfect_match") ? "perfect_match" :
                                (languageMatchStatus === "no_match" && 
                                 skillsMatchStatus === "no_match" && 
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
          languages: agent.personalInfo?.languages || [],
          professionalSummary: agent.professionalSummary || {},
          skills: agent.skills || {},
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
        scheduleMatch: {
          score: scheduleMatch.score,
          details: scheduleMatch.details,
          matchStatus: scheduleMatch.status
        },
        matchStatus: overallMatchStatus
      };
    });

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
      const hasScheduleMatch = match.scheduleMatch.matchStatus === "perfect_match";
      
      // Un agent doit avoir au moins un perfect_match pour être considéré
      return hasLanguageMatch || hasSkillsMatch || hasScheduleMatch;
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
          const normalizedReqSkill = normalizeSkill(reqSkill.name);
          const agentSkill = agentSkills.find(
            skill => normalizeSkill(skill.name) === normalizedReqSkill
          );

          if (agentSkill) {
            const skillScore = getSkillLevelScore(agentSkill.level);
            const requiredScore = getSkillLevelScore(reqSkill.level);
            
            if (skillScore >= requiredScore) {
              matchingSkills.push({
                skill: reqSkill.name,
                requiredLevel: reqSkill.level,
                agentLevel: agentSkill.level,
                score: skillScore
              });
              totalScore += skillScore;
            } else {
              insufficientSkills.push({
                skill: reqSkill.name,
                requiredLevel: reqSkill.level,
                agentLevel: agentSkill.level,
                score: skillScore
              });
            }
          } else {
            missingSkills.push(reqSkill.name);
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

    const matches = skillsMatches.map(match => ({
      agentId: match.agent._id,
      agentSkills: match.agent.skills?.technical?.map(skill => ({
        skill: skill.name,
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
    const scheduleScore = matchDetails.scheduleMatch?.score || 0;
    
    const matchScore = (languageScore + skillsScore + scheduleScore) / 3;

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