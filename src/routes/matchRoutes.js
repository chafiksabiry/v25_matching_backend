import express from 'express';
import {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  findMatchesForGigById,
  findMatchesForAgentById,
  generateOptimalMatches
} from '../controllers/matchController.js';

const router = express.Router();

// Get all matches
router.get('/', getAllMatches);

// Get a specific match by ID
router.get('/:id', getMatchById);

// Create a new match
router.post('/', createMatch);

// Update a match
router.put('/:id', updateMatch);

// Delete a match
router.delete('/:id', deleteMatch);

// Find matches for a specific gig
router.post('/gig/:id', findMatchesForGigById);

// Find matches for a specific agent
router.post('/rep/:id', findMatchesForAgentById);

// Redirection pour l'ancienne route /rep/:id
router.post('/rep/:id', (req, res) => {
  const agentId = req.params.id;
  res.redirect(307, `/api/matches/agent/${agentId}`);
});

// Generate optimal matches
router.post('/optimize', generateOptimalMatches);

// Error handling for this router
router.use((req, res) => {
  res.status(404).json({
    message: `Route ${req.originalUrl} not found in matches router`,
    method: req.method
  });
});

export default router;