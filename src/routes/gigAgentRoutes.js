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
  getGigAgentStats,
  getInvitedGigsForAgent,
  getInvitedAgentsForCompany,
  getEnrolledGigsForAgent,
  getEnrollmentRequestsForCompany,
  getActiveAgentsForCompany,
  acceptEnrollmentRequest
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

// Routes pour les gigs invités
router.get('/invited/agent/:agentId', getInvitedGigsForAgent);
router.get('/invited/company/:companyId', getInvitedAgentsForCompany);

// Routes pour les gigs enrolled
router.get('/enrolled/agent/:agentId', getEnrolledGigsForAgent);

// Routes pour les demandes d'enrollment
router.get('/enrollment-requests/company/:companyId', getEnrollmentRequestsForCompany);

// Route pour les agents actifs
router.get('/active-agents/company/:companyId', getActiveAgentsForCompany);

// Route pour accepter une demande d'enrollment
router.post('/enrollment-requests/:id/accept', acceptEnrollmentRequest);

export default router; 