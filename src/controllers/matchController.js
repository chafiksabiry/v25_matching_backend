import Match from '../models/Match.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';
import { findMatches } from '../utils/matchingUtils.js';
import { findLanguageMatches, getLanguageLevelScore } from '../utils/matchingAlgorithm.js';

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

    // Get weights from request body or use defaults
    const weights = req.body.weights || { skills: 0.5, languages: 0.5 };
    console.log('Using weights:', weights);

    const agents = await Agent.find({
      $or: [
        { 'personalInfo.languages': { $exists: true, $ne: [] } },
        { 'skills.technical': { $exists: true, $ne: [] } },
        { 'skills.professional': { $exists: true, $ne: [] } },
        { 'skills.soft': { $exists: true, $ne: [] } }
      ]
    }).select('personalInfo skills');

    console.log('Found agents:', agents.length);
    agents.forEach(agent => {
      console.log('Agent:', {
        id: agent._id,
        name: agent.personalInfo?.name,
        skills: {
          technical: agent.skills?.technical,
          professional: agent.skills?.professional,
          soft: agent.skills?.soft
        }
      });
    });

    if (!agents || agents.length === 0) {
      return res.status(StatusCodes.OK).json([]);
    }

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
        'arabe': 'arabic'
      };
      return languageMap[language.toLowerCase()] || language.toLowerCase();
    };

    const normalizeSkill = (skill) => {
      if (!skill) return '';
      return skill.toLowerCase().trim();
    };

    const getLanguageLevelScore = (proficiency) => {
      if (!proficiency) return 0;
      const levels = {
        'a1': 0.2,
        'a2': 0.3,
        'b1': 0.5,
        'b2': 0.6,
        'c1': 0.8,
        'c2': 1.0,
        'native': 1.0,
        'native or bilingual': 1.0,
        'fluent': 0.9,
        'advanced': 0.8,
        'intermediate': 0.6,
        'beginner': 0.4,
        'professional working': 0.7,
        'bonne maîtrise': 0.7,
        'langue maternelle': 1.0
      };
      return levels[proficiency.toLowerCase()] || 0;
    };

    const matches = agents.map(agent => {
      console.log('Processing agent:', {
        id: agent._id,
        name: agent.personalInfo?.name,
        skills: {
          technical: agent.skills?.technical,
          professional: agent.skills?.professional,
          soft: agent.skills?.soft
        }
      });

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
          const langScore = getLanguageLevelScore(agentLang.proficiency);
          const requiredScore = getLanguageLevelScore(reqLang.proficiency);
          
          if (langScore >= requiredScore) {
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

      // Check if agent has all required skills
      const hasAllRequiredSkills = requiredSkills.every(reqSkill => {
        if (!reqSkill?.skill) return true;
        
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

      // Determine match status based on direct matches
      const languageMatchStatus = matchingLanguages.length === requiredLanguages.length ? "perfect_match" : 
                                 matchingLanguages.length > 0 ? "partial_match" : "no_match";
      
      // Skills match status is now based on having ALL required skills
      const skillsMatchStatus = hasAllRequiredSkills ? "perfect_match" : "no_match";

      // Overall match status is perfect only if both language and skills are perfect
      const overallMatchStatus = (languageMatchStatus === "perfect_match" && skillsMatchStatus === "perfect_match") ? "perfect_match" :
                                (languageMatchStatus === "no_match" && skillsMatchStatus === "no_match") ? "no_match" :
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
        matchStatus: overallMatchStatus
      };
    });

    // Sort matches by overall score
    matches.sort((a, b) => b.overallScore - a.overallScore);

    // Filter matches based on weights
    let filteredMatches = matches;
    if (weights.skills > 0.5 && weights.languages < 0.5) {
      // Priorité aux skills
      filteredMatches = matches
        .filter(match => match.skillsMatch.details.matchStatus === "perfect_match" && match.languageMatch.details.matchStatus === "perfect_match")
        .sort((a, b) => {
          const aCount = a.skillsMatch.details.matchingSkills.length;
          const bCount = b.skillsMatch.details.matchingSkills.length;
          if (bCount !== aCount) return bCount - aCount;
          return 0;
        });
    } else if (weights.skills < 0.5 && weights.languages > 0.5) {
      // Priorité aux langues
      filteredMatches = matches.filter(match => 
        match.languageMatch.details.matchStatus === "perfect_match"
      );
    } else if (weights.skills < 0.5 && weights.languages < 0.5) {
      // Si les deux critères sont < 0.5, on prend le critère avec le poids le plus élevé
      if (weights.skills > weights.languages) {
        filteredMatches = matches.filter(match => 
          match.skillsMatch.details.matchStatus === "perfect_match"
        );
      } else {
        filteredMatches = matches.filter(match => 
          match.languageMatch.details.matchStatus === "perfect_match"
        );
      }
    } else {
      // Les deux faibles ou égaux
      filteredMatches = matches.filter(match => 
        match.matchStatus === "perfect_match"
      );
    }

    // Calculate language match statistics
    const languageStats = {
      perfectMatches: filteredMatches.filter(m => m.languageMatch.details.matchStatus === "perfect_match").length,
      partialMatches: filteredMatches.filter(m => m.languageMatch.details.matchStatus === "partial_match").length,
      noMatches: filteredMatches.filter(m => m.languageMatch.details.matchStatus === "no_match").length,
      totalMatches: filteredMatches.length
    };

    // Calculate skills match statistics
    const skillsStats = {
      perfectMatches: filteredMatches.filter(m => m.skillsMatch.details.matchStatus === "perfect_match").length,
      partialMatches: filteredMatches.filter(m => m.skillsMatch.details.matchStatus === "partial_match").length,
      noMatches: filteredMatches.filter(m => m.skillsMatch.details.matchStatus === "no_match").length,
      totalMatches: filteredMatches.length,
      byType: {
        technical: {
          perfectMatches: filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length,
          partialMatches: filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length,
          noMatches: filteredMatches.length - filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'technical')).length
        },
        professional: {
          perfectMatches: filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'professional')).length,
          partialMatches: filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'professional')).length,
          noMatches: filteredMatches.length - filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'professional')).length
        },
        soft: {
          perfectMatches: filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'soft')).length,
          partialMatches: filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'soft')).length,
          noMatches: filteredMatches.length - filteredMatches.filter(m => m.skillsMatch.details.matchingSkills.some(s => s.type === 'soft')).length
        }
      }
    };

    res.json({
      preferedmatches: filteredMatches,
      totalMatches: filteredMatches.length,
      perfectMatches: filteredMatches.filter(m => m.matchStatus === "perfect_match").length,
      partialMatches: filteredMatches.filter(m => m.matchStatus === "partial_match").length,
      noMatches: filteredMatches.filter(m => m.matchStatus === "no_match").length,
      languageStats,
      skillsStats
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
        'expert': 1.0,
        'advanced': 0.8,
        'intermediate': 0.6,
        'beginner': 0.4,
        'novice': 0.2,
        'master': 1.0,
        'senior': 0.9,
        'junior': 0.5
      };
      return levels[level.toLowerCase()] || 0;
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