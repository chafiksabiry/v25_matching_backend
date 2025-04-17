import express from 'express';
import {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent
} from '../controllers/agentController.js';

const router = express.Router();

// Get all agents
router.get('/', getAllAgents);

// Get a specific agent by ID
router.get('/:id', getAgentById);

// Create a new agent
router.post('/', createAgent);

// Update an agent
router.put('/:id', updateAgent);

// Delete an agent
router.delete('/:id', deleteAgent);

export default router; 