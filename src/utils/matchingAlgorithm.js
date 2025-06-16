import Match from "../models/Match.js";

/**
 * Calcule le score de matching global entre un agent et un gig
 * @param {Object} agent - Le représentant avec ses caractéristiques
 * @param {Object} gig - Le gig avec ses exigences
 * @param {Object} weights - Les poids personnalisés pour chaque critère
 * @returns {Object} Le score final et les détails de chaque critère
 */
export const calculateMatchScore = (agent, gig, weights = {}) => {
  const defaultWeights = {
    industry: 0.8, // 80% weight for industry matching
    experience: 0.05, // 5% for experience
    skills: 0.05, // 5% for skills
    language: 0.05, // 5% for language
    availability: 0.05, // 5% for availability
  };

  // Utiliser les poids fournis ou les poids par défaut
  const finalWeights = { ...defaultWeights, ...weights };

  // Calculer les scores individuels
  const industryScore = calculateIndustryScore(agent, gig);
  const experienceScore = calculateExperienceScore(agent, gig);
  const skillsScore = calculateSkillsScore(agent, gig);
  const languageScore = calculateLanguageScore(agent, gig);
  const availabilityScore = calculateAvailabilityScore(agent, gig);

  // Calculer le score total en utilisant les poids
  const totalScore =
    industryScore * finalWeights.industry +
    experienceScore * finalWeights.experience +
    skillsScore * finalWeights.skills +
    languageScore * finalWeights.language +
    availabilityScore * finalWeights.availability;

  return {
    score: totalScore,
    details: {
      industryScore,
      experienceScore,
      skillsScore,
      languageScore,
      availabilityScore,
    },
  };
};

/**
 * Calcule le score d'expérience en comparant l'expérience du agent avec les exigences du gig
 * @param {Object} agent - Le représentant avec ses expériences
 * @param {Object} gig - Le gig avec ses exigences
 * @returns {number} Score entre 0 et 1
 */
function calculateExperienceScore(agent, gig) {
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
    return 0.5;
  }

  const normalizeString = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .replace(/\s+/g, "");
  };

  // Extraire le nombre d'années de l'expérience du rep
  const yearsMatch =
    agent.professionalSummary.yearsOfExperience.match(/(\d+)\s*years?/i);
  const agentExperience = yearsMatch ? parseInt(yearsMatch[1]) : 0;

  // Extraire le nombre d'années de l'expérience requise du gig
  const gigExperience = parseInt(gig.seniority.yearsExperience);

  console.log("Experience comparison:", {
    agentId: agent._id,
    gigId: gig._id,
    agentExperience,
    gigExperience,
    isExactMatch: agentExperience === gigExperience,
    isPartialMatch: agentExperience >= gigExperience,
  });

  if (agentExperience >= gigExperience) {
    return 1.0;
  } else if (agentExperience >= gigExperience * 0.8) {
    return 0.8;
  } else if (agentExperience >= gigExperience * 0.6) {
    return 0.6;
  } else if (agentExperience >= gigExperience * 0.4) {
    return 0.4;
  } else {
    return 0.2;
  }
}

/**
 * Calcule le score de compétences en comparant les compétences du agent avec celles requises
 * @param {Object} agent - Le représentant avec ses compétences
 * @param {Object} gig - Le gig avec ses compétences requises
 * @returns {number} Score entre 0 et 1
 */
function calculateSkillsScore(agent, gig) {
  if (!gig.requiredSkills || !agent.skills || gig.requiredSkills.length === 0) {
    console.log("Missing skills data:", { agent: agent._id, gig: gig._id });
    return 0.5;
  }

  const normalizeString = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .replace(/\s+/g, "");
  };

  // Combiner toutes les compétences de toutes les catégories
  const allSkills = [
    ...(agent.skills.technical || []),
    ...(agent.skills.professional || []),
    ...(agent.skills.soft || []),
  ];

  const matchingSkills = gig.requiredSkills.filter((requiredSkill) => {
    const normalizedRequiredSkill = normalizeString(requiredSkill);
    return allSkills.some((agentSkill) => {
      const normalizedAgentSkill = normalizeString(agentSkill.name);
      const isExactMatch = normalizedAgentSkill === normalizedRequiredSkill;
      const isPartialMatch =
        normalizedAgentSkill.includes(normalizedRequiredSkill) ||
        normalizedRequiredSkill.includes(normalizedAgentSkill);

      console.log("Comparing skills:", {
        agentId: agent._id,
        gigId: gig._id,
        requiredSkill,
        agentSkill: agentSkill.name,
        isExactMatch,
        isPartialMatch,
      });

      return (
        (isExactMatch || isPartialMatch) &&
        ["Advanced", "Expert"].includes(agentSkill.level)
      );
    });
  });

  return matchingSkills.length / gig.requiredSkills.length;
}

/**
 * Calcule le score de langue en comparant les langues du agent avec celles requises
 * @param {Object} agent - Le représentant avec ses langues
 * @param {Object} gig - Le gig avec ses langues requises
 * @returns {number} Score entre 0 et 1
 */
function calculateLanguageScore(agent, gig) {
  if (!agent.personalInfo?.languages || !gig.skills?.languages) {
    console.log("Missing language data:", {
      agentId: agent._id,
      hasAgentLanguages: !!agent.personalInfo?.languages,
      hasGigLanguages: !!gig.skills?.languages,
    });
    return 0.5;
  }

  const normalizeString = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .replace(/\s+/g, "");
  };

  console.log("Language matching details:", {
    agentId: agent._id,
    agentLanguages: agent.personalInfo.languages,
    gigLanguages: gig.skills.languages,
  });

  // Vérifier si l'agent a au moins une des langues requises avec le bon niveau
  return gig.skills.languages.some((gigLang) => {
    const normalizedGigLang = normalizeString(gigLang.name);
    const gigLevel = gigLang.level.toLowerCase();

    console.log("Checking gig language:", {
      gigId: gig._id,
      gigLanguage: gigLang.name,
      normalizedGigLang,
      gigLevel,
    });

    return agent.personalInfo.languages.some((agentLang) => {
      const normalizedAgentLang = normalizeString(agentLang.language);
      const agentLevel = agentLang.proficiency.toLowerCase();

      // Vérifier la correspondance de la langue
      const isLanguageMatch = normalizedAgentLang === normalizedGigLang;

      // Vérifier le niveau de compétence
      const isLevelMatch =
        (gigLevel === "conversational" &&
          [
            "professional working",
            "native or bilingual",
            "c1",
            "c2",
            "b2",
          ].includes(agentLevel)) ||
        (gigLevel === "professional" &&
          ["professional working", "native or bilingual", "c1", "c2"].includes(
            agentLevel
          )) ||
        (gigLevel === "native" &&
          ["native or bilingual", "c2"].includes(agentLevel));

      console.log("Language comparison details:", {
        agentId: agent._id,
        gigId: gig._id,
        gigLanguage: gigLang.name,
        agentLanguage: agentLang.language,
        normalizedGigLang,
        normalizedAgentLang,
        gigLevel,
        agentLevel,
        isLanguageMatch,
        isLevelMatch,
      });

      return isLanguageMatch && isLevelMatch;
    });
  });
}

/**
 * Calcule le score de disponibilité en comparant les créneaux du agent avec ceux du gig
 * @param {Object} agent - Le représentant avec ses disponibilités
 * @param {Object} gig - Le gig avec son planning
 * @returns {number} Score entre 0 et 1
 */
function calculateAvailabilityScore(agent, gig) {
  if (
    !agent.availability ||
    !gig.schedule ||
    !Array.isArray(agent.availability)
  ) {
    console.log("Missing availability data:", {
      agent: agent._id,
      gig: gig._id,
    });
    return 0.2;
  }

  const normalizeString = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .replace(/\s+/g, "");
  };

  const gigSchedule = JSON.parse(gig.schedule.hours);
  const gigDays = gigSchedule.map((day) => normalizeString(day.day));
  const gigHours = gigSchedule.map((day) => ({
    start: timeToMinutes(day.start),
    end: timeToMinutes(day.end),
  }));

  const availableDays = agent.availability.filter((day) => {
    const normalizedDay = normalizeString(day);
    return gigDays.some((gigDay) => {
      const isExactMatch = normalizedDay === gigDay;
      const isPartialMatch =
        normalizedDay.includes(gigDay) || gigDay.includes(normalizedDay);

      console.log("Comparing availability:", {
        agentId: agent._id,
        gigId: gig._id,
        agentDay: day,
        gigDay,
        isExactMatch,
        isPartialMatch,
      });

      return isExactMatch || isPartialMatch;
    });
  });

  return 0.2 + 0.8 * (availableDays.length / gigDays.length);
}

function calculateIndustryScore(agent, gig) {
  if (
    !gig.category ||
    !agent.professionalSummary ||
    !agent.professionalSummary.industries
  ) {
    console.log("Missing industry data:", {
      gigCategory: gig.category,
      agentIndustries: agent.professionalSummary?.industries,
    });
    return 0.0;
  }

  // Normaliser les catégories et industries pour la comparaison
  const normalizeString = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .replace(/\s+/g, "");
  };

  const gigCategory = normalizeString(gig.category);

  console.log("Industry comparison:", {
    gigId: gig._id,
    originalGigCategory: gig.category,
    normalizedGigCategory: gigCategory,
    agentIndustries: agent.professionalSummary.industries,
    normalizedAgentIndustries:
      agent.professionalSummary.industries.map(normalizeString),
  });

  // Vérifier si l'une des industries du rep correspond à la catégorie du gig
  const hasMatchingIndustry = agent.professionalSummary.industries.some(
    (industry) => {
      const normalizedIndustry = normalizeString(industry);

      // Vérifier la correspondance exacte ou partielle
      const isExactMatch = normalizedIndustry === gigCategory;
      const isPartialMatch =
        normalizedIndustry.includes(gigCategory) ||
        gigCategory.includes(normalizedIndustry);

      console.log("Comparing:", {
        industry,
        normalizedIndustry,
        gigCategory,
        isExactMatch,
        isPartialMatch,
      });

      return isExactMatch || isPartialMatch;
    }
  );

  return hasMatchingIndustry ? 1.0 : 0.0;
}

/**
 * Trouve les meilleurs matches pour un gig spécifique
 * @param {Object} gig - Le gig à matcher
 * @param {Array} agents - Liste des agents disponibles
 * @param {Object} weights - Poids personnalisés
 * @param {Object} options - Options de recherche
 * @returns {Object} Résultats de la recherche
 */
export const findMatchesForGig = async (
  gig,
  agents,
  weights = {},
  options = {}
) => {
  const { limit = 10, minimumScore = 0.4, showAllScores = false } = options;

  console.log("Finding matches for gig:", {
    gigId: gig._id,
    industry: gig.industry,
    totalAgents: agents.length,
    weights,
  });

  // Trier les critères par poids décroissant
  const sortedCriteria = Object.entries(weights)
    .sort(([, a], [, b]) => b - a)
    .map(([criterion]) => criterion);

  console.log("Sorted criteria by weight:", sortedCriteria);

  // Filtrer les agents selon les critères triés
  let filteredAgents = agents;
  const filterResults = {};

  for (const criterion of sortedCriteria) {
    const weight = weights[criterion];
    const beforeCount = filteredAgents.length;

    // Si le poids est faible (< 0.5), on ne filtre pas sur ce critère
    // if (weight < 0.5) {
    console.log(`Skipping ${criterion} filter due to low weight (${weight})`);
    
    console.log(filterResults);

    filterResults[criterion] = {
      before: beforeCount,
      after: beforeCount,
      removed: 0,
      skipped: true,
    };
    continue;
    // }

    console.log(`Filtering by ${criterion} (weight: ${weight})...`);

    switch (criterion) {
      case "experience":
        filteredAgents = filteredAgents.filter((agent) => {
          if (!agent.professionalSummary?.yearsOfExperience) return false;

          const yearsMatch =
            agent.professionalSummary.yearsOfExperience.match(
              /(\d+)\s*years?/i
            );
          const agentExperience = yearsMatch ? parseInt(yearsMatch[1]) : 0;
          const gigExperience = parseInt(gig.seniority.yearsExperience);

          console.log("Experience comparison:", {
            agentId: agent._id,
            gigId: gig._id,
            agentExperience,
            gigExperience,
            isExactMatch: agentExperience === gigExperience,
            isPartialMatch: agentExperience >= gigExperience,
          });

          return (
            agentExperience >= gigExperience &&
            agentExperience <= gigExperience * 2
          );
        });
        break;

      case "skills":
        filteredAgents = filteredAgents.filter((agent) => {
          if (!agent.skills?.professional || !gig.skills?.professional)
            return false;

          const normalizeString = (str) => {
            if (!str) return "";
            return str
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]/g, "")
              .replace(/\s+/g, "");
          };

          return gig.skills.professional.some((gigSkill) => {
            const normalizedGigSkill = normalizeString(gigSkill);

            return agent.skills.professional.some((agentSkill) => {
              const normalizedAgentSkill = normalizeString(agentSkill.skill);
              const isExactMatch = normalizedAgentSkill === normalizedGigSkill;
              const isPartialMatch =
                normalizedAgentSkill.includes(normalizedGigSkill) ||
                normalizedGigSkill.includes(normalizedAgentSkill);

              console.log("Skill comparison:", {
                agentId: agent._id,
                gigId: gig._id,
                gigSkill,
                agentSkill: agentSkill.skill,
                isExactMatch,
                isPartialMatch,
              });

              return isExactMatch || isPartialMatch;
            });
          });
        });
        break;

      case "language":
        filteredAgents = filteredAgents.filter((agent) => {
          if (!agent.personalInfo?.languages || !gig.skills?.languages)
            return false;

          const normalizeString = (str) => {
            if (!str) return "";
            return str
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]/g, "")
              .replace(/\s+/g, "");
          };

          return gig.skills.languages.some((gigLang) => {
            const normalizedGigLang = normalizeString(gigLang.name);
            const gigLevel = gigLang.level.toLowerCase();

            return agent.personalInfo.languages.some((agentLang) => {
              const normalizedAgentLang = normalizeString(agentLang.language);
              const agentLevel = agentLang.proficiency.toLowerCase();

              const isLanguageMatch = normalizedAgentLang === normalizedGigLang;
              const isLevelMatch =
                (gigLevel === "professional" &&
                  ["professional working", "native or bilingual"].includes(
                    agentLevel
                  )) ||
                (gigLevel === "native" && agentLevel === "native or bilingual");

              console.log("Language comparison:", {
                agentId: agent._id,
                gigId: gig._id,
                gigLanguage: gigLang.name,
                agentLanguage: agentLang.language,
                gigLevel,
                agentLevel,
                isLanguageMatch,
                isLevelMatch,
              });

              return isLanguageMatch && isLevelMatch;
            });
          });
        });
        break;

      case "availability":
        filteredAgents = filteredAgents.filter((agent) => {
          if (!agent.availability || !gig.schedule?.hours) return false;

          const normalizeString = (str) => {
            if (!str) return "";
            return str
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]/g, "")
              .replace(/\s+/g, "");
          };

          try {
            const gigSchedule = JSON.parse(gig.schedule.hours);
            const gigDays = gigSchedule.map((day) => normalizeString(day.day));

            return agent.availability.some((agentDay) => {
              const normalizedAgentDay = normalizeString(agentDay);
              return gigDays.some((gigDay) => {
                const isExactMatch = normalizedAgentDay === gigDay;
                const isPartialMatch =
                  normalizedAgentDay.includes(gigDay) ||
                  gigDay.includes(normalizedAgentDay);

                console.log("Availability comparison:", {
                  agentId: agent._id,
                  gigId: gig._id,
                  gigDay,
                  agentDay,
                  isExactMatch,
                  isPartialMatch,
                });

                return isExactMatch || isPartialMatch;
              });
            });
          } catch (error) {
            console.error("Error parsing gig schedule:", error);
            return false;
          }
        });
        break;

      case "industry":
        filteredAgents = filteredAgents.filter((agent) => {
          if (!agent.professionalSummary?.industries || !gig.category)
            return false;

          const normalizeString = (str) => {
            if (!str) return "";
            return str
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]/g, "")
              .replace(/\s+/g, "");
          };

          const normalizedGigCategory = normalizeString(gig.category);

          return agent.professionalSummary.industries.some((industry) => {
            const normalizedIndustry = normalizeString(industry);
            const isExactMatch = normalizedIndustry === normalizedGigCategory;
            const isPartialMatch =
              normalizedIndustry.includes(normalizedGigCategory) ||
              normalizedGigCategory.includes(normalizedIndustry);

            console.log("Industry comparison:", {
              agentId: agent._id,
              gigId: gig._id,
              gigCategory: gig.category,
              agentIndustry: industry,
              isExactMatch,
              isPartialMatch,
            });

            return isExactMatch || isPartialMatch;
          });
        });
        break;
    }

    const afterCount = filteredAgents.length;
    filterResults[criterion] = {
      before: beforeCount,
      after: afterCount,
      removed: beforeCount - afterCount,
      skipped: false,
    };

    console.log(`After ${criterion} filter (weight: ${weight}):`, {
      before: beforeCount,
      after: afterCount,
      removed: beforeCount - afterCount,
    });
  }

  // Calculer les scores finaux pour les agents restants
  const matches = filteredAgents.map((agent) => {
    const { score, details } = calculateMatchScore(agent, gig, weights);
    return {
      agentId: agent._id,
      gigId: gig._id,
      score,
      matchDetails: details,
    };
  });

  const sortedMatches = matches.sort((a, b) => b.score - a.score);
  const qualifyingMatches = sortedMatches.filter(
    (match) => match.score >= minimumScore
  );
  const bestMatches = qualifyingMatches.slice(0, limit);

  return {
    matches: showAllScores ? sortedMatches : bestMatches,
    totalAgents: agents.length,
    qualifyingAgents: qualifyingMatches.length,
    matchCount: bestMatches.length,
    totalMatches: sortedMatches.length,
    filterResults,
    weights,
  };
};

/**
 * Trouve les meilleurs gigs pour un agent spécifique
 * @param {Object} agent - Le agent à matcher
 * @param {Array} gigs - Liste des gigs disponibles
 * @param {Object} weights - Poids personnalisés
 * @param {Object} options - Options de recherche
 * @returns {Object} Résultats de la recherche
 */
export const findGigsForAgent = async (
  agent,
  gigs = [],
  weights = {},
  options = {}
) => {
  const {
    limit = 10,
    minimumScore = 0.4,
    showAllScores = false,
    topScoreCount = 5,
  } = options;

  if (!agent) {
    throw new Error("Agent is required");
  }

  console.log("Finding gigs for agent:", {
    agentId: agent._id,
    agentIndustries: agent.professionalSummary?.industries,
    totalGigs: gigs.length,
  });

  if (!gigs || gigs.length === 0) {
    return {
      matches: [],
      totalGigs: 0,
      qualifyingGigs: 0,
      matchCount: 0,
      totalMatches: 0,
      minimumScoreApplied: minimumScore,
      scoreStats: {
        highest: 0,
        average: 0,
        qualifying: 0,
      },
    };
  }

  // Filtrer d'abord les gigs qui ont la même catégorie que l'industrie de l'agent
  const industryMatches = gigs.filter((gig) => {
    if (
      !gig.category ||
      !agent.professionalSummary ||
      !agent.professionalSummary.industries
    ) {
      console.log("Skipping gig due to missing data:", {
        gigId: gig._id,
        gigCategory: gig.category,
        hasProfessionalSummary: !!agent.professionalSummary,
        hasIndustries: !!agent.professionalSummary?.industries,
      });
      return false;
    }

    const normalizeString = (str) => {
      if (!str) return "";
      return str
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "")
        .replace(/\s+/g, "");
    };

    const gigCategory = normalizeString(gig.category);

    const isMatch = agent.professionalSummary.industries.some((industry) => {
      const normalizedIndustry = normalizeString(industry);
      const isExactMatch = normalizedIndustry === gigCategory;
      const isPartialMatch =
        normalizedIndustry.includes(gigCategory) ||
        gigCategory.includes(normalizedIndustry);

      console.log("Comparing industry:", {
        gigId: gig._id,
        gigCategory: gig.category,
        normalizedGigCategory: gigCategory,
        agentIndustry: industry,
        normalizedAgentIndustry: normalizedIndustry,
        isExactMatch,
        isPartialMatch,
      });

      return isExactMatch || isPartialMatch;
    });

    return isMatch;
  });

  console.log("Industry matches found:", {
    total: industryMatches.length,
    matches: industryMatches.map((m) => ({
      gigId: m._id,
      category: m.category,
    })),
  });

  // Calculer les scores uniquement pour les gigs qui ont la même industrie
  const allMatches = industryMatches.map((gig) => {
    const matchResult = calculateMatchScore(agent, gig, weights);
    return {
      agentId: agent._id,
      gigId: gig._id,
      score: matchResult.score,
      matchDetails: matchResult.details,
    };
  });

  // Filtrer les matches avec un score minimum
  const qualifyingMatches = allMatches.filter(
    (match) => match.score >= minimumScore
  );

  // Trier par score décroissant
  const sortedMatches = qualifyingMatches.sort((a, b) => b.score - a.score);

  // Limiter le nombre de résultats
  const limitedMatches = sortedMatches.slice(0, limit);

  // Calculer les top scores si demandé
  const topScores = showAllScores
    ? sortedMatches.slice(0, topScoreCount)
    : null;

  return {
    matches: limitedMatches,
    totalGigs: gigs.length,
    qualifyingGigs: qualifyingMatches.length,
    matchCount: limitedMatches.length,
    totalMatches: allMatches.length,
    minimumScoreApplied: minimumScore,
    industryMatches: industryMatches.length,
    topScores: topScores,
    topScoresCount: topScores ? topScores.length : 0,
    totalTopScoresAvailable: qualifyingMatches.length,
    scoreStats: {
      highest: Math.max(...allMatches.map((m) => m.score)),
      average:
        allMatches.reduce((sum, m) => sum + m.score, 0) / allMatches.length,
      qualifying: qualifyingMatches.length,
    },
  };
};

/**
 * Optimise les matches pour assurer la meilleure allocation globale
 * Version simplifiée de l'algorithme hongrois
 * @param {Array} agents - Liste des agents
 * @param {Array} gigs - Liste des gigs
 * @param {Object} weights - Poids personnalisés
 * @returns {Array} Liste des matches optimaux
 */
export const optimizeMatches = (agents, gigs, weights = {}) => {
  const matches = [];
  const matchedAgents = new Set();
  const matchedGigs = new Set();

  // Sort agents by their overall score potential
  const agentScores = agents.map((agent) => {
    const scores = gigs.map(
      (gig) => calculateMatchScore(agent, gig, weights).score
    );
    return {
      agent,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    };
  });

  const sortedAgents = agentScores.sort(
    (a, b) => b.averageScore - a.averageScore
  );

  // Match agents to gigs
  for (const { agent } of sortedAgents) {
    if (matchedAgents.has(agent._id)) continue;

    const gigMatches = gigs
      .filter((gig) => !matchedGigs.has(gig._id))
      .map((gig) => calculateMatchScore(agent, gig, weights))
      .sort((a, b) => b.score - a.score);

    if (gigMatches.length > 0) {
      const bestMatch = gigMatches[0];
      matches.push({
        agentId: agent._id,
        gigId: bestMatch.gig._id,
        score: bestMatch.score,
        matchDetails: bestMatch.details,
      });
      matchedAgents.add(agent._id);
      matchedGigs.add(bestMatch.gig._id);
    }
  }

  return matches;
};

/**
 * Formate le score en pourcentage
 * @param {number} score - Score à formater
 * @returns {string} Score formaté en pourcentage
 */
export function formatScore(score) {
  return `${Math.round(score * 100)}%`;
}

// Fonction utilitaire pour convertir les heures en minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return 0;

  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const findMatches = async (
  entity,
  candidates,
  weights,
  options = {}
) => {
  try {
    console.log("Starting matching process with weights:", weights);

    // Déterminer si on cherche des gigs pour un rep ou des reps pour un gig
    const isFindingGigs = "experience" in entity;
    console.log(
      "Matching type:",
      isFindingGigs ? "Finding gigs for rep" : "Finding reps for gig"
    );

    // Trier les critères par poids décroissant
    const sortedCriteria = Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .filter(([, weight]) => weight >= 0.5);

    console.log("Sorted criteria by weight:", sortedCriteria);

    let matchingCandidates = [...candidates];
    const filterResults = {};

    // Filtrer les candidats selon les critères triés
    for (const [criterion, weight] of sortedCriteria) {
      const beforeCount = matchingCandidates.length;

      switch (criterion) {
        case "experience":
          matchingCandidates = matchingCandidates.filter((candidate) => {
            if (isFindingGigs) {
              // Chercher des gigs pour un rep
              const repExp = parseInt(entity.experience);
              const gigExp = parseInt(candidate.seniority.yearsExperience);
              return repExp >= gigExp;
            } else {
              // Chercher des reps pour un gig
              const repExp = parseInt(candidate.experience);
              const gigExp = parseInt(entity.seniority.yearsExperience);
              return repExp >= gigExp;
            }
          });
          break;

        case "skills":
          matchingCandidates = matchingCandidates.filter((candidate) => {
            if (isFindingGigs) {
              // Chercher des gigs pour un rep
              const requiredSkills = [
                ...candidate.skills.professional,
                ...candidate.skills.technical,
                ...candidate.skills.soft,
              ];
              return requiredSkills.some((skill) =>
                entity.skills.includes(skill)
              );
            } else {
              // Chercher des reps pour un gig
              const requiredSkills = [
                ...entity.skills.professional,
                ...entity.skills.technical,
                ...entity.skills.soft,
              ];
              return requiredSkills.some((skill) =>
                candidate.skills.includes(skill)
              );
            }
          });
          break;

        case "language":
          matchingCandidates = matchingCandidates.filter((candidate) => {
            if (isFindingGigs) {
              // Chercher des gigs pour un rep
              const repLanguages = entity.personalInfo.languages.map(
                (lang) => lang.name
              );
              const requiredLanguages = candidate.skills.languages.map(
                (lang) => lang.name
              );
              return requiredLanguages.some((lang) =>
                repLanguages.includes(lang)
              );
            } else {
              // Chercher des reps pour un gig
              const repLanguages = candidate.personalInfo.languages.map(
                (lang) => lang.name
              );
              const requiredLanguages = entity.skills.languages.map(
                (lang) => lang.name
              );
              return requiredLanguages.some((lang) =>
                repLanguages.includes(lang)
              );
            }
          });
          break;

        case "availability":
          matchingCandidates = matchingCandidates.filter((candidate) => {
            if (isFindingGigs) {
              // Chercher des gigs pour un rep
              const gigSchedule = JSON.parse(candidate.schedule.hours);
              const repAvailability = entity.availability;
              return Object.entries(gigSchedule).every(([day, hours]) => {
                if (!hours) return true;
                return repAvailability.some(
                  (avail) =>
                    avail.day === day &&
                    avail.startTime <= hours.start &&
                    avail.endTime >= hours.end
                );
              });
            } else {
              // Chercher des reps pour un gig
              const gigSchedule = JSON.parse(entity.schedule.hours);
              const repAvailability = candidate.availability;
              return Object.entries(gigSchedule).every(([day, hours]) => {
                if (!hours) return true;
                return repAvailability.some(
                  (avail) =>
                    avail.day === day &&
                    avail.startTime <= hours.start &&
                    avail.endTime >= hours.end
                );
              });
            }
          });
          break;

        case "industry":
          // Ignorer l'industrie car son poids est trop faible
          break;
      }

      const afterCount = matchingCandidates.length;
      filterResults[criterion] = {
        before: beforeCount,
        after: afterCount,
        removed: beforeCount - afterCount,
      };
      console.log(
        `After ${criterion} filtering: ${beforeCount} -> ${afterCount} candidates`
      );
    }

    // Calculer les scores de correspondance pour les candidats restants
    const scoredCandidates = matchingCandidates.map((candidate) => {
      const { score, details } = calculateMatchScore(
        isFindingGigs ? entity : candidate,
        isFindingGigs ? candidate : entity,
        weights
      );
      return {
        [isFindingGigs ? "gigId" : "repId"]: candidate._id,
        score,
        matchDetails: details,
      };
    });

    // Trier par score décroissant
    const sortedMatches = scoredCandidates.sort((a, b) => b.score - a.score);

    // Appliquer le score minimum si spécifié
    const minimumScore = options.minimumScore || 0.4;
    const qualifyingMatches = sortedMatches.filter(
      (match) => match.score >= minimumScore
    );

    // Limiter le nombre de résultats si spécifié
    const limit = options.limit || 10;
    const limitedMatches = qualifyingMatches.slice(0, limit);

    return {
      matches: limitedMatches,
      totalCandidates: candidates.length,
      qualifyingCandidates: qualifyingMatches.length,
      matchCount: limitedMatches.length,
      totalMatches: sortedMatches.length,
      filterResults,
      weights,
    };
  } catch (error) {
    console.error("Error in findMatches:", error);
    throw error;
  }
};

/**
 * Convertit les niveaux de langue en scores numériques
 * @param {string} level - Niveau de langue (A1, A2, B1, B2, C1, C2, Native)
 * @returns {number} Score entre 0 et 1
 */
export const getLanguageLevelScore = (level) => {
  const levelMap = {
    'A1': 0.1,  // Débutant
    'A2': 0.2,  // Élémentaire
    'B1': 0.4,  // Intermédiaire
    'B2': 0.6,  // Intermédiaire avancé
    'C1': 0.8,  // Avancé
    'C2': 1.0,  // Maîtrise
    'Native': 1.0  // Langue maternelle
  };
  return levelMap[level] || 0;
};

/**
 * Trouve les agents qui matchent les langues requises pour un gig
 * Cette fonction compare les langues requises par le gig avec les langues maîtrisées par chaque agent
 * et retourne uniquement les agents qui satisfont tous les critères linguistiques.
 * 
 * @param {Object} gig - Le gig avec ses langues requises dans gig.skills.languages
 * @param {Array} agents - Liste des agents à évaluer, chacun avec ses langues dans personalInfo.languages
 * @returns {Array} Liste des agents qui matchent avec leurs scores et détails de matching
 */
export const findLanguageMatches = (gig, agents) => {
  // Vérification des paramètres d'entrée
  if (!gig?.skills?.languages || !Array.isArray(agents)) return [];

  /**
   * Normalise une chaîne de caractères pour la comparaison
   * - Convertit en minuscules
   * - Supprime les espaces
   * - Supprime les caractères spéciaux
   * @param {string} str - La chaîne à normaliser
   * @returns {string} La chaîne normalisée
   */
  const normalizeString = (str) => {
    if (!str) return "";
    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
  };

  // Évaluation de chaque agent
  return agents.map(agent => {
    // Cas où l'agent n'a pas de langues définies
    if (!agent?.personalInfo?.languages) {
      return {
        agent,
        score: 0,
        details: {
          matchingLanguages: [],
          missingLanguages: gig.skills.languages,
          insufficientLanguages: [],
          matchStatus: "missing_data"
        }
      };
    }

    // Initialisation des tableaux pour stocker les résultats du matching
    const matchingLanguages = [];    // Langues qui correspondent parfaitement
    const missingLanguages = [];     // Langues manquantes chez l'agent
    const insufficientLanguages = []; // Langues présentes mais niveau insuffisant

    // Vérification de chaque langue requise par le gig
    const allLanguagesMatch = gig.skills.languages.every(gigLang => {
      const normalizedGigLang = normalizeString(gigLang.language);
      const gigLevel = gigLang.proficiency.toLowerCase();

      // Recherche de la langue chez l'agent
      const agentLang = agent.personalInfo.languages.find(agentLang => 
        normalizeString(agentLang.language) === normalizedGigLang
      );

      // Si la langue n'est pas trouvée chez l'agent
      if (!agentLang) {
        missingLanguages.push({
          language: gigLang.language,
          requiredLevel: gigLang.proficiency
        });
        return false;
      }

      const agentLevel = agentLang.proficiency.toLowerCase();

      // Définition des niveaux acceptables pour chaque niveau requis
      const isLevelMatch = 
        // Niveau "conversational" : accepte les niveaux professionnels et avancés
        (gigLevel === "conversational" && 
          ["professional working", "native or bilingual", "c1", "c2", "b2"].includes(agentLevel)) ||
        // Niveau "professional" : accepte uniquement les niveaux professionnels et natifs
        (gigLevel === "professional" && 
          ["professional working", "native or bilingual", "c1", "c2"].includes(agentLevel)) ||
        // Niveau "native" : accepte uniquement les niveaux natifs
        (gigLevel === "native" && 
          ["native or bilingual", "c2"].includes(agentLevel));

      // Si le niveau correspond, ajouter aux langues matching
      if (isLevelMatch) {
        matchingLanguages.push({
          language: gigLang.language,
          requiredLevel: gigLang.proficiency,
          agentLevel: agentLang.proficiency
        });
        return true;
      } else {
        // Si le niveau ne correspond pas, ajouter aux langues insuffisantes
        insufficientLanguages.push({
          language: gigLang.language,
          requiredLevel: gigLang.proficiency,
          agentLevel: agentLang.proficiency
        });
        return false;
      }
    });

    // Retourner le résultat pour cet agent
    return {
      agent,
      score: allLanguagesMatch ? 1 : 0, // Score 1 si toutes les langues matchent, 0 sinon
      details: {
        matchingLanguages,
        missingLanguages,
        insufficientLanguages,
        matchStatus: allLanguagesMatch ? "perfect_match" : "no_match"
      }
    };
  }).filter(match => match.score === 1); // Ne garder que les agents avec un score de 1
};
