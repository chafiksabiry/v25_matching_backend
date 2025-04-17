import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';
import Agent from '../models/Agent.js';
import { findMatches } from '../utils/matchingUtils.js';

export const createGig = async (req, res) => {
  try {
    const gig = await Gig.create(req.body);
    res.status(StatusCodes.CREATED).json(gig);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

export const getGigs = async (req, res) => {
  try {
    const gigs = await Gig.find();
    res.status(StatusCodes.OK).json(gigs);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

export const getGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig not found' });
    }
    res.status(StatusCodes.OK).json(gig);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

export const updateGig = async (req, res) => {
  try {
    const gig = await Gig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig not found' });
    }
    res.status(StatusCodes.OK).json(gig);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

export const deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findByIdAndDelete(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig not found' });
    }
    res.status(StatusCodes.OK).json({ message: 'Gig deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Trouver des gigs correspondants pour un agent
export const findGigsForAgent = async (req, res) => {
  try {
    const { agentId, weights } = req.body;
    
    // Récupérer l'agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Récupérer tous les gigs actifs
    const gigs = await Gig.find({ status: 'active' });
    
    // Trouver les gigs correspondants
    const result = await findMatches(agent, gigs, weights);
    
    res.json(result);
  } catch (error) {
    console.error('Error finding gigs for agent:', error);
    res.status(500).json({ message: 'Error finding matching gigs', error: error.message });
  }
};

// Trouver des agents correspondants pour un gig
export const findAgentsForGig = async (req, res) => {
  try {
    const { gigId, weights } = req.body;
    
    // Récupérer le gig
    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }
    
    // Récupérer tous les agents actifs
    const agents = await Agent.find({ status: 'active' });
    
    // Trouver les agents correspondants
    const result = await findMatches(gig, agents, weights);
    
    res.json(result);
  } catch (error) {
    console.error('Error finding agents for gig:', error);
    res.status(500).json({ message: 'Error finding matching agents', error: error.message });
  }
}; 