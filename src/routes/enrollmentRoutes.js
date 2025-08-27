import express from 'express';
import {
  sendEnrollmentInvitation,
  acceptEnrollment,
  rejectEnrollment,
  getAgentEnrollments,
  getGigEnrollments,
  resendEnrollmentInvitation,
  cancelEnrollmentInvitation,
  acceptEnrollmentById,
  rejectEnrollmentById,
  getAgentEnrolledGigs,
  requestEnrollment,
  acceptEnrollmentRequest,
  rejectEnrollmentRequest,
  removeAgentFromGig,
  getGigAgents
} from '../controllers/enrollmentController.js';

const router = express.Router();

// Routes d'enrôlement
router.post('/invite', sendEnrollmentInvitation);
router.post('/accept', acceptEnrollment);
router.post('/reject', rejectEnrollment);

// Routes pour les demandes d'enrôlement (agent -> company)
router.post('/request', requestEnrollment);
router.post('/request/accept', acceptEnrollmentRequest);
router.post('/request/reject', rejectEnrollmentRequest);

// Routes directes via ID (pour la plateforme)
router.post('/:id/accept', acceptEnrollmentById);
router.post('/:id/reject', rejectEnrollmentById);

// Routes de consultation
router.get('/agent/:agentId', getAgentEnrollments);
router.get('/gig/:gigId', getGigEnrollments);

// Route spécifique pour récupérer les gigs d'un agent enrôlé
router.get('/agent/:agentId/gigs', getAgentEnrolledGigs);

// 🆕 Nouvelles routes pour la gestion des agents dans les gigs
router.get('/gig/:gigId/agents', getGigAgents);
router.post('/gig/remove-agent', removeAgentFromGig);

// Routes de gestion
router.post('/:id/resend', resendEnrollmentInvitation);
router.post('/:id/cancel', cancelEnrollmentInvitation);

export default router;
