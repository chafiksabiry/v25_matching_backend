import Match from '../models/Match.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';
import { findMatches } from '../utils/matchingUtils.js';

// Get all matches
export const getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('agentId')
      .populate('gigId');
    res.status(StatusCodes.OK).json(matches);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get a specific match by ID
export const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('agentId')
      .populate('gigId');
    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Match not found' });
    }
    res.status(StatusCodes.OK).json(match);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get matches for a specific agent
export const getMatchesForAgent = async (req, res) => {
  try {
    const matches = await Match.find({ agentId: req.params.agentId })
      .populate('gigId');
    res.status(StatusCodes.OK).json(matches);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get matches for a specific gig
export const getMatchesForGig = async (req, res) => {
  try {
    const matches = await Match.find({ gigId: req.params.gigId })
      .populate('agentId');
    res.status(StatusCodes.OK).json(matches);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Create a new match
export const createMatch = async (req, res) => {
  try {
    const match = new Match(req.body);
    const savedMatch = await match.save();
    res.status(StatusCodes.CREATED).json(savedMatch);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Update a match
export const updateMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Match not found' });
    }
    res.status(StatusCodes.OK).json(match);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Delete a match
export const deleteMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Match not found' });
    }
    res.status(StatusCodes.OK).json({ message: 'Match deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Find matches for a specific gig
export const findMatchesForGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }

    console.log('Gig found:', {
      id: gig._id,
      title: gig.title,
      requiredSkills: gig.requiredSkills,
      requiredLanguages: gig.requiredLanguages,
      requiredExperience: gig.requiredExperience
    });

    const agents = await Agent.find();
    if (!agents || agents.length === 0) {
      return res.status(StatusCodes.OK).json({
        matches: [],
        totalAgents: 0,
        qualifyingAgents: 0,
        matchCount: 0,
        totalMatches: 0,
        minimumScoreApplied: 0.4,
        scoreStats: {
          highest: 0,
          average: 0,
          qualifying: 0
        }
      });
    }

    console.log('Number of agents found:', agents.length);

    // Poids par défaut pour le matching
    const defaultWeights = {
      skills: 0.4,
      languages: 0.3,
      experience: 0.2,
      industries: 0.1
    };

    const weights = req.body.weights || defaultWeights;
    console.log('Using weights:', weights);

    // Afficher les critères triés
    const sortedEntries = Object.entries(weights)
      .sort(([, a], [, b]) => b - a);
    console.log('Sorted criteria with weights:');
    sortedEntries.forEach(([criterion, weight]) => {
      console.log(`- ${criterion}: ${weight}`);
    });

    const result = await findMatches(gig, agents, weights);
    console.log('Matching results:', {
      totalMatches: result.matches.length,
      topScore: result.matches[0]?.score
    });

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("Error in findMatchesForGigById:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Find matches for a specific agent
export const findMatchesForAgentById = async (req, res) => {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }

    console.log('Agent found:', {
      id: agent._id,
      name: agent.personalInfo.name,
      skills: agent.skills,
      languages: agent.personalInfo.languages,
      experience: agent.experience
    });

    const gigs = await Gig.find();
    if (!gigs || gigs.length === 0) {
      return res.status(StatusCodes.OK).json({
        matches: [],
        totalGigs: 0,
        qualifyingGigs: 0,
        matchCount: 0,
        totalMatches: 0,
        minimumScoreApplied: 0.4,
        scoreStats: {
          highest: 0,
          average: 0,
          qualifying: 0
        }
      });
    }

    console.log('Number of gigs found:', gigs.length);

    // Poids par défaut pour le matching
    const defaultWeights = {
      skills: 0.4,
      languages: 0.3,
      experience: 0.2,
      industries: 0.1
    };

    const weights = req.body.weights || defaultWeights;
    console.log('Using weights:', weights);

    // Afficher les critères triés
    const sortedEntries = Object.entries(weights)
      .sort(([, a], [, b]) => b - a);
    console.log('Sorted criteria with weights:');
    sortedEntries.forEach(([criterion, weight]) => {
      console.log(`- ${criterion}: ${weight}`);
    });

    const result = await findMatches(agent, gigs, weights);
    console.log('Matching results:', {
      totalMatches: result.matches.length,
      topScore: result.matches[0]?.score
    });

    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    console.error("Error in findMatchesForAgentById:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Generate optimal matches
export const generateOptimalMatches = async (req, res) => {
  try {
    const { weights } = req.body;
    
    const agents = await Agent.find();
    const gigs = await Gig.find();
    
    const gigMatches = await Promise.all(
      gigs.map(async gig => {
        const result = await findMatches(gig, agents, weights);
        return {
          gigId: gig._id,
          matches: result.matches
        };
      })
    );
    
    res.status(StatusCodes.OK).json({
      gigMatches,
      totalGigs: gigs.length,
      totalAgents: agents.length
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};