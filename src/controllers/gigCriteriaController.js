import GigCriteria from '../models/GigCriteria.js';
import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';

// Créer des critères pour un gig
export const createGigCriteria = async (req, res) => {
  try {
    const { gigId, criteriaCodes, metadata } = req.body;

    // Vérifier que le gig existe
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig not found' });
    }

    // Vérifier si des critères existent déjà pour ce gig
    const existingCriteria = await GigCriteria.findOne({ gigId });
    if (existingCriteria) {
      return res.status(StatusCodes.CONFLICT).json({ 
        error: 'Criteria already exist for this gig. Use update instead.' 
      });
    }

    const gigCriteria = await GigCriteria.create({
      gigId,
      criteriaCodes,
      metadata
    });

    res.status(StatusCodes.CREATED).json(gigCriteria);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

// Obtenir tous les critères
export const getAllGigCriteria = async (req, res) => {
  try {
    const criteria = await GigCriteria.find().populate('gigId', 'title description');
    res.status(StatusCodes.OK).json(criteria);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Obtenir les critères d'un gig spécifique
export const getGigCriteria = async (req, res) => {
  try {
    const { gigId } = req.params;
    
    const criteria = await GigCriteria.findOne({ gigId }).populate('gigId', 'title description');
    if (!criteria) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig criteria not found' });
    }
    
    res.status(StatusCodes.OK).json(criteria);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Mettre à jour les critères d'un gig
export const updateGigCriteria = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { criteriaCodes, metadata } = req.body;

    const criteria = await GigCriteria.findOneAndUpdate(
      { gigId },
      { 
        criteriaCodes,
        metadata: { ...metadata, updatedAt: new Date() }
      },
      { new: true, runValidators: true }
    );

    if (!criteria) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig criteria not found' });
    }

    res.status(StatusCodes.OK).json(criteria);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

// Supprimer les critères d'un gig
export const deleteGigCriteria = async (req, res) => {
  try {
    const { gigId } = req.params;
    
    const criteria = await GigCriteria.findOneAndDelete({ gigId });
    if (!criteria) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig criteria not found' });
    }

    res.status(StatusCodes.OK).json({ message: 'Gig criteria deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Ajouter un critère spécifique à un gig
export const addCriteriaToGig = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { category, criteria } = req.body;

    const gigCriteria = await GigCriteria.findOne({ gigId });
    if (!gigCriteria) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig criteria not found' });
    }

    await gigCriteria.addCriteria(category, criteria);
    
    res.status(StatusCodes.OK).json(gigCriteria);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

// Supprimer un critère spécifique d'un gig
export const removeCriteriaFromGig = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { category, criteriaId } = req.body;

    const gigCriteria = await GigCriteria.findOne({ gigId });
    if (!gigCriteria) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig criteria not found' });
    }

    await gigCriteria.removeCriteria(category, criteriaId);
    
    res.status(StatusCodes.OK).json(gigCriteria);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

// Obtenir tous les codes de critères d'un gig
export const getGigCriteriaCodes = async (req, res) => {
  try {
    const { gigId } = req.params;

    const gigCriteria = await GigCriteria.findOne({ gigId });
    if (!gigCriteria) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig criteria not found' });
    }

    const codes = gigCriteria.getAllCriteriaCodes();
    res.status(StatusCodes.OK).json(codes);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Rechercher des gigs par critères
export const searchGigsByCriteria = async (req, res) => {
  try {
    const { criteriaCodes, weights } = req.body;

    let query = {};
    
    // Construire la requête basée sur les critères fournis
    if (criteriaCodes.professionalSkills && criteriaCodes.professionalSkills.length > 0) {
      query['criteriaCodes.professionalSkills.skillCode'] = { 
        $in: criteriaCodes.professionalSkills 
      };
    }
    
    if (criteriaCodes.technicalSkills && criteriaCodes.technicalSkills.length > 0) {
      query['criteriaCodes.technicalSkills.skillCode'] = { 
        $in: criteriaCodes.technicalSkills 
      };
    }
    
    if (criteriaCodes.softSkills && criteriaCodes.softSkills.length > 0) {
      query['criteriaCodes.softSkills.skillCode'] = { 
        $in: criteriaCodes.softSkills 
      };
    }
    
    if (criteriaCodes.languages && criteriaCodes.languages.length > 0) {
      query['criteriaCodes.languages.languageCode'] = { 
        $in: criteriaCodes.languages 
      };
    }
    
    if (criteriaCodes.industries && criteriaCodes.industries.length > 0) {
      query['criteriaCodes.industries.industryCode'] = { 
        $in: criteriaCodes.industries 
      };
    }
    
    if (criteriaCodes.activities && criteriaCodes.activities.length > 0) {
      query['criteriaCodes.activities.activityCode'] = { 
        $in: criteriaCodes.activities 
      };
    }
    
    if (criteriaCodes.destination) {
      query['criteriaCodes.destinationCode'] = criteriaCodes.destination;
    }
    
    if (criteriaCodes.seniority) {
      query['criteriaCodes.seniorityCode'] = criteriaCodes.seniority;
    }

    const matchingCriteria = await GigCriteria.find(query).populate('gigId');
    
    // Calculer les scores de correspondance si des poids sont fournis
    let results = matchingCriteria.map(criteria => ({
      gigCriteria: criteria,
      gig: criteria.gigId,
      matchScore: weights ? calculateMatchScore(criteria, weights) : null
    }));

    // Trier par score de correspondance si disponible
    if (weights) {
      results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    res.status(StatusCodes.OK).json(results);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Fonction utilitaire pour calculer le score de correspondance
const calculateMatchScore = (criteria, weights) => {
  let totalScore = 0;
  let totalWeight = 0;

  // Calculer le score pour chaque catégorie
  Object.keys(weights).forEach(category => {
    if (criteria.criteriaCodes[category] && weights[category]) {
      const categoryWeight = weights[category];
      totalWeight += categoryWeight;
      
      // Logique de calcul du score selon la catégorie
      // Cette logique peut être adaptée selon vos besoins
      totalScore += categoryWeight * 0.8; // Score de base pour la correspondance
    }
  });

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}; 