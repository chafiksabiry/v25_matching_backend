import express from 'express';
import {
  createGigCriteria,
  getAllGigCriteria,
  getGigCriteria,
  updateGigCriteria,
  deleteGigCriteria,
  addCriteriaToGig,
  removeCriteriaFromGig,
  getGigCriteriaCodes,
  searchGigsByCriteria
} from '../controllers/gigCriteriaController.js';

const router = express.Router();

// Routes CRUD de base
router.post('/', createGigCriteria);
router.get('/', getAllGigCriteria);
router.get('/:gigId', getGigCriteria);
router.put('/:gigId', updateGigCriteria);
router.delete('/:gigId', deleteGigCriteria);

// Routes pour la gestion des critères spécifiques
router.post('/:gigId/add-criteria', addCriteriaToGig);
router.delete('/:gigId/remove-criteria', removeCriteriaFromGig);

// Routes pour obtenir les codes et rechercher
router.get('/:gigId/codes', getGigCriteriaCodes);
router.post('/search', searchGigsByCriteria);

export default router; 