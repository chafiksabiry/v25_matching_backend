// Fonction pour calculer le score de matching entre un agent et un gig
const calculateMatchScore = (entity, candidate, weights) => {
  try {
    console.log('Calculating match score for:', {
      entityId: entity._id,
      candidateId: candidate._id,
      weights
    });

    // Déterminer qui est l'agent et qui est le gig
    const isEntityAgent = !entity.category && entity.professionalSummary;
    const gig = isEntityAgent ? candidate : entity;
    const agent = isEntityAgent ? entity : candidate;

    // Extraire les données du gig
    const gigData = {
      category: gig.category,
      requiredSkills: gig.requiredSkills || [],
      seniority: gig.seniority || {},
      requiredLanguages: gig.requiredLanguages || [],
      availability: gig.availability || {}
    };

    // Extraire les données de l'agent
    const agentData = {
      industries: agent.professionalSummary?.industries || [],
      skills: {
        technical: agent.skills?.technical?.map(s => s.skill) || [],
        professional: agent.skills?.professional?.map(s => s.skill) || [],
        soft: agent.skills?.soft || []
      },
      experience: agent.experience || [],
      languages: agent.personalInfo?.languages?.map(l => l.language) || [],
      availability: agent.availability || []
    };

    console.log('Available data:', {
      gig: gigData,
      agent: agentData
    });

    let score = 0;
    let totalWeight = 0;

    // Matching des industries
    if (weights.industry > 0) {
      const agentIndustries = agentData.industries;
      const requiredIndustry = gigData.category ? [gigData.category] : [];
      
      console.log('Industries matching:', {
        agentIndustries,
        requiredIndustry,
        weight: weights.industry
      });

      if (requiredIndustry.length > 0) {
        const normalizeIndustry = (industry) => {
          return industry.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .replace(/\s+/g, '');
        };

        // Définir des groupes d'industries liées
        const industryGroups = {
          sales: ['sales', 'retail', 'inboundsales', 'saas', 'salesrepresentative', 'insurancesalesrepresentative'],
          technology: ['technology', 'tech', 'developpement', 'development', 'technicalsupport', 'saas'],
          telecom: ['telecom', 'telecommunications', 'telephony'],
          customerservice: ['customerservice', 'support', 'technicalsupport']
        };

        const normalizedAgentIndustries = agentIndustries.map(normalizeIndustry);
        const normalizedRequiredIndustry = requiredIndustry.map(normalizeIndustry);

        // Vérifier si l'industrie requise est dans les industries de l'agent ou dans un groupe lié
        const hasMatchingIndustry = normalizedRequiredIndustry.some(reqIndustry => {
          // Vérifier la correspondance directe
          if (normalizedAgentIndustries.includes(reqIndustry)) {
            return true;
          }

          // Vérifier les groupes d'industries
          for (const [groupName, industries] of Object.entries(industryGroups)) {
            if (industries.includes(reqIndustry) && 
                normalizedAgentIndustries.some(agentInd => industries.includes(agentInd))) {
              return true;
            }
          }

          return false;
        });

        if (hasMatchingIndustry) {
          const industryScore = weights.industry;
          score += industryScore;
          totalWeight += weights.industry;
          console.log('Industry score:', industryScore);
        } else {
          console.log('No matching industry found, but continuing...');
          totalWeight += weights.industry;
        }
      } else {
        const industryScore = (agentIndustries.length > 0 ? 0.5 : 0) * weights.industry;
        score += industryScore;
        totalWeight += weights.industry;
        console.log('No required industry, using agent industries:', industryScore);
      }
    }

    // Matching des compétences
    if (weights.skills > 0) {
      const allAgentSkills = [
        ...agentData.skills.technical,
        ...agentData.skills.professional,
        ...agentData.skills.soft
      ];
      const requiredSkills = gigData.requiredSkills;
      
      console.log('Skills matching:', {
        agentSkills: allAgentSkills,
        requiredSkills,
        weight: weights.skills
      });

      if (requiredSkills.length > 0) {
        const matchingSkills = allAgentSkills.filter(skill => 
          requiredSkills.includes(skill)
        );
        const skillScore = (matchingSkills.length / requiredSkills.length) * weights.skills;
        score += skillScore;
        totalWeight += weights.skills;
        console.log('Skills score:', skillScore);
      } else {
        const skillScore = (allAgentSkills.length > 0 ? 0.5 : 0) * weights.skills;
        score += skillScore;
        totalWeight += weights.skills;
        console.log('No required skills, using agent skills:', skillScore);
      }
    }

    // Matching des langues
    if (weights.language > 0) {
      const agentLanguages = agentData.languages;
      const requiredLanguages = gigData.requiredLanguages;
      
      console.log('Languages matching:', {
        agentLanguages,
        requiredLanguages,
        weight: weights.language
      });

      if (requiredLanguages.length > 0) {
        const matchingLanguages = agentLanguages.filter(lang => 
          requiredLanguages.includes(lang)
        );
        const languageScore = (matchingLanguages.length / requiredLanguages.length) * weights.language;
        score += languageScore;
        totalWeight += weights.language;
        console.log('Languages score:', languageScore);
      } else {
        const languageScore = (agentLanguages.length > 0 ? 0.5 : 0) * weights.language;
        score += languageScore;
        totalWeight += weights.language;
        console.log('No required languages, using agent languages:', languageScore);
      }
    }

    // Matching de l'expérience
    if (weights.experience > 0) {
      const agentExperience = agentData.experience.length;
      const requiredExperience = parseInt(gigData.seniority.yearsExperience) || 0;
      
      console.log('Experience matching:', {
        agentExperience,
        requiredExperience,
        weight: weights.experience
      });

      if (requiredExperience > 0) {
        const experienceScore = Math.min(agentExperience / requiredExperience, 1) * weights.experience;
        score += experienceScore;
        totalWeight += weights.experience;
        console.log('Experience score:', experienceScore);
      } else {
        const experienceScore = (agentExperience > 0 ? 0.5 : 0) * weights.experience;
        score += experienceScore;
        totalWeight += weights.experience;
        console.log('No required experience, using agent experience:', experienceScore);
      }
    }

    // Matching de la disponibilité
    if (weights.availability > 0) {
      const agentAvailability = agentData.availability;
      const requiredAvailability = gigData.availability.schedule ? gigData.availability.schedule : [];
      const requiredDays = requiredAvailability.map(slot => slot.day);
      
      console.log('Availability matching:', {
        agentAvailability,
        requiredDays,
        weight: weights.availability
      });

      if (requiredDays.length > 0) {
        const matchingAvailability = agentAvailability.filter(avail => 
          requiredDays.includes(avail)
        );
        const availabilityScore = (matchingAvailability.length / requiredDays.length) * weights.availability;
        score += availabilityScore;
        totalWeight += weights.availability;
        console.log('Availability score:', availabilityScore);
      } else {
        const availabilityScore = (agentAvailability.length > 0 ? 0.5 : 0) * weights.availability;
        score += availabilityScore;
        totalWeight += weights.availability;
        console.log('No required availability, using agent availability:', availabilityScore);
      }
    }

    // Normaliser le score
    const finalScore = totalWeight > 0 ? score / totalWeight : 0;
    console.log('Final score breakdown:', {
      totalScore: score,
      totalWeight,
      finalScore
    });
    
    return finalScore;
  } catch (error) {
    console.error('Error in calculateMatchScore:', error);
    return 0;
  }
};

// Fonction pour normaliser les données avant le matching
const normalizeData = (data) => {
  try {
    console.log('Normalizing data:', data._id);

    // Si c'est un gig, extraire les données nécessaires
    if (data.category) {
      return {
        _id: data._id,
        category: data.category,
        requiredSkills: data.requiredSkills || [],
        seniority: data.seniority || {},
        requiredLanguages: data.requiredLanguages || [],
        availability: data.availability || {}
      };
    }

    // Si c'est un agent, extraire les données nécessaires
    return {
      _id: data._id,
      professionalSummary: {
        industries: data.professionalSummary?.industries || [],
        keyExpertise: data.professionalSummary?.keyExpertise || [],
        yearsOfExperience: data.professionalSummary?.yearsOfExperience || ''
      },
      skills: {
        technical: data.skills?.technical?.map(s => ({
          skill: s.skill,
          level: s.level
        })) || [],
        professional: data.skills?.professional?.map(s => ({
          skill: s.skill,
          level: s.level
        })) || [],
        soft: data.skills?.soft || [],
        contactCenter: data.skills?.contactCenter || []
      },
      personalInfo: {
        languages: data.personalInfo?.languages?.map(l => ({
          language: l.language,
          proficiency: l.proficiency
        })) || []
      },
      experience: data.experience || [],
      availability: data.availability || []
    };
  } catch (error) {
    console.error('Error normalizing data:', error);
    return data;
  }
};

// Fonction pour trier les critères par poids
const sortCriteriaByWeight = (weights) => {
  console.log('Sorting criteria by weight...');
  console.log('Input weights:', weights);

  const sortedEntries = Object.entries(weights)
    .sort(([, a], [, b]) => b - a);

  console.log('Sorted criteria with weights:');
  sortedEntries.forEach(([criterion, weight]) => {
    console.log(`- ${criterion}: ${weight}`);
  });

  return sortedEntries.map(([criterion]) => criterion);
};

// Fonction pour appliquer le filtrage séquentiel
const applySequentialFiltering = (entity, candidates, weights, options = {}) => {
  try {
    console.log('Starting sequential filtering...');
    console.log('Entity type:', entity.experience ? 'Agent' : 'Gig');
    console.log('Number of candidates:', candidates.length);
    console.log('Weights:', weights);

    // Normaliser les données
    const normalizedEntity = normalizeData(entity);
    const normalizedCandidates = candidates.map(normalizeData);

    // Trier les critères par poids
    const sortedCriteria = sortCriteriaByWeight(weights);
    console.log('Criteria sorted by weight:', sortedCriteria);

    // Prendre les 4 critères les plus importants
    const topCriteria = sortedCriteria.slice(0, 4);
    console.log('Top criteria for filtering:', topCriteria);

    let filteredCandidates = [...normalizedCandidates];

    // Appliquer le filtrage séquentiel
    for (const criterion of topCriteria) {
      const weight = weights[criterion];
      console.log(`Filtering by ${criterion} (weight: ${weight})...`);

      filteredCandidates = filteredCandidates.filter(candidate => {
        const score = calculateMatchScore(normalizedEntity, candidate, { [criterion]: weight });
        return score >= (options.minScore || 0.4);
      });

      console.log(`Candidates after ${criterion} filtering:`, filteredCandidates.length);
      
      // Si plus de candidats, continuer avec le critère suivant
      if (filteredCandidates.length === 0) {
        console.log('No candidates left after filtering');
        break;
      }
    }

    // Calculer le score final pour les candidats restants
    const scoredCandidates = filteredCandidates.map(candidate => {
      const score = calculateMatchScore(normalizedEntity, candidate, weights);
      return { candidate, score };
    });

    // Trier par score
    const sortedMatches = scoredCandidates.sort((a, b) => b.score - a.score);

    // Limiter le nombre de résultats si spécifié
    const maxResults = options.maxResults || 10;
    const finalMatches = sortedMatches.slice(0, maxResults);

    // Calculer les statistiques de score
    const scores = finalMatches.map(({ score }) => score);
    const scoreStats = {
      highest: scores[0] || 0,
      average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      qualifying: scores.length
    };

    console.log('Final score statistics:', scoreStats);

    return {
      matches: finalMatches,
      totalCandidates: candidates.length,
      filteredCandidates: filteredCandidates.length,
      matchCount: finalMatches.length,
      minimumScoreApplied: options.minScore || 0.4,
      scoreStats,
      weights
    };
  } catch (error) {
    console.error('Error in applySequentialFiltering:', error);
    throw error;
  }
};

// Fonction principale pour trouver les matches
export const findMatches = async (entity, candidates, weights = {}, options = {}) => {
  try {
    console.log('Starting matching process...');
    console.log('Entity type:', entity.experience ? 'Agent' : 'Gig');
    console.log('Number of candidates:', candidates.length);
    console.log('Weights:', weights);

    // Trier les critères par poids décroissant
    const sortedCriteria = Object.entries(weights)
      .sort(([, a], [, b]) => b - a)
      .map(([criterion]) => criterion);

    console.log('Criteria sorted by weight:', sortedCriteria);

    // Prendre les 4 critères les plus importants
    const topCriteria = sortedCriteria.slice(0, 4);
    console.log('Top criteria for matching:', topCriteria);

    // Convertir les candidats en objets JavaScript simples
    let matchedCandidates = candidates.map(candidate => ({
      ...candidate.toObject ? candidate.toObject() : candidate,
      score: 0
    }));

    // Calculer le score final pour tous les candidats
    const scoredCandidates = matchedCandidates.map(candidate => {
      const score = calculateMatchScore(entity, candidate, weights);
      return { ...candidate, score };
    });

    // Trier par score
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Appliquer le seuil minimum si spécifié
    const minimumScore = options.minimumScore || 0.1; // Réduire le score minimum à 0.1
    const qualifyingCandidates = scoredCandidates.filter(c => c.score >= minimumScore);

    // Calculer les statistiques de score
    const scores = qualifyingCandidates.map(c => c.score);
    const scoreStats = {
      highest: scores[0] || 0,
      average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      qualifying: scores.length
    };

    console.log('Final matching results:', {
      totalCandidates: candidates.length,
      qualifyingCandidates: qualifyingCandidates.length,
      scoreStats
    });

    // Nettoyer les objets MongoDB
    const cleanMatches = qualifyingCandidates.map(match => {
      const cleanMatch = { ...match };
      delete cleanMatch.$__;
      delete cleanMatch.$isNew;
      delete cleanMatch._doc;
      return cleanMatch;
    });

    return {
      matches: cleanMatches,
      totalCandidates: candidates.length,
      qualifyingCandidates: qualifyingCandidates.length,
      matchCount: qualifyingCandidates.length,
      totalMatches: qualifyingCandidates.length,
      minimumScoreApplied: minimumScore,
      scoreStats
    };
  } catch (error) {
    console.error('Error in findMatches:', error);
    throw error;
  }
}; 