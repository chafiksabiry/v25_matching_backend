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
  acceptEnrollmentRequest,
  agentAcceptInvitation,
  agentRejectInvitation,
  sendEnrollmentRequest,
  getAgentGigsWithStatus,
  getGigAgentsWithStatus
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

// Routes pour qu'un agent accepte ou refuse une invitation
router.post('/invitations/:id/accept', agentAcceptInvitation);
router.post('/invitations/:id/reject', agentRejectInvitation);

// Route pour qu'un agent envoie une demande d'enrollment
router.post('/enrollment-request/:agentId/:gigId', sendEnrollmentRequest);

// 🆕 Nouvelles routes pour récupérer les gigs/agents avec populate et status
// GET /api/gig-agents/agent-gigs/:agentId?status=invited
router.get('/agent-gigs/:agentId', getAgentGigsWithStatus);

// GET /api/gig-agents/gig-agents/:gigId?status=enrolled
router.get('/gig-agents/:gigId', getGigAgentsWithStatus);

export default router; 