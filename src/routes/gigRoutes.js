import express from 'express';
import {
  createGig,
  getGigs,
  getGig,
  updateGig,
  deleteGig,
  findGigsForAgent,
  findAgentsForGig,
  saveGigAvailability,
  getGigAvailability,
  updateGigAvailability
} from '../controllers/gigController.js';

const router = express.Router();

router.post('/', createGig);
router.get('/', getGigs);
router.get('/:id', getGig);
router.put('/:id', updateGig);
router.delete('/:id', deleteGig);

// Trouver des gigs pour un agent
router.post('/find-gigs-for-agent', findGigsForAgent);

// Trouver des agents pour un gig
router.post('/find-agents-for-gig', findAgentsForGig);

// Routes pour l'availability (schedule)
router.post('/:id/availability', saveGigAvailability);
router.get('/:id/availability', getGigAvailability);
router.put('/:id/availability', updateGigAvailability);

export default router; 