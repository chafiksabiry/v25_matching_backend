import express from 'express';
import {
  createOrUpdateWeights,
  getWeights,
  deleteWeights,
  resetWeights,
  getAllGigsWithWeights
} from '../controllers/gigMatchingWeightsController.js';

const router = express.Router();

// Get all gigs with their matching weights
router.get('/all', getAllGigsWithWeights);

// Get matching weights for a specific gig
router.get('/:gigId', getWeights);

// Create or update matching weights for a gig
router.post('/:gigId', createOrUpdateWeights);

// Reset weights to defaults for a gig
router.post('/:gigId/reset', resetWeights);

// Delete matching weights for a gig
router.delete('/:gigId', deleteWeights);

export default router; 