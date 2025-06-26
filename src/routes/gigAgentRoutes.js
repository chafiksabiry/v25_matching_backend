import express from 'express';
import {
  getAllGigAgents,
  getGigAgentById,
  getGigAgentsForAgent,
  getGigAgentsForGig,
  createGigAgent,
  updateGigAgent,
  deleteGigAgent,
  resendEmailNotification,
  getGigAgentsByStatus,
  getGigAgentStats
} from '../controllers/gigAgentController.js';

const router = express.Router();

// Routes principales
router.get('/', getAllGigAgents);
router.get('/stats', getGigAgentStats);
router.get('/:id', getGigAgentById);
router.post('/', createGigAgent);
router.put('/:id', updateGigAgent);
router.delete('/:id', deleteGigAgent);

// Routes spécialisées
router.get('/agent/:agentId', getGigAgentsForAgent);
router.get('/gig/:gigId', getGigAgentsForGig);
router.get('/status/:status', getGigAgentsByStatus);

// Route pour renvoyer l'email de notification
router.post('/:id/resend-email', resendEmailNotification);

export default router; 