import { Gig } from '../models/Gig.js';
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
    const gigs = await Gig.find()
      .populate('destination_zone', 'name cca2')
      .populate('activities', 'name')
      .populate('industries', 'name')
      .populate('skills.professional.skill', 'name')
      .populate('skills.technical.skill', 'name')
      .populate('skills.soft.skill', 'name')
      .populate('skills.languages.language', 'name iso639_1')
      .populate('availability.time_zone', 'name')
      .populate('commission.currency', 'code symbol')
      .populate('team.territories', 'name cca2');
    res.status(StatusCodes.OK).json(gigs);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

export const getGig = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id)
      .populate('destination_zone', 'name cca2')
      .populate('activities', 'name')
      .populate('industries', 'name')
      .populate('skills.professional.skill', 'name')
      .populate('skills.technical.skill', 'name')
      .populate('skills.soft.skill', 'name')
      .populate('skills.languages.language', 'name iso639_1')
      .populate('availability.time_zone', 'name')
      .populate('commission.currency', 'code symbol')
      .populate('team.territories', 'name cca2');
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

// Sauvegarder l'availability (schedule) d'un gig
export const saveGigAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;
    
    const gig = await Gig.findById(id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig not found' });
    }
    
    // Mettre à jour l'availability du gig
    gig.availability = availability;
    await gig.save();
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: gig.availability,
      message: 'Gig availability saved successfully'
    });
  } catch (error) {
    console.error('Error saving gig availability:', error);
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

// Récupérer l'availability (schedule) d'un gig
export const getGigAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    
    const gig = await Gig.findById(id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig not found' });
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: gig.availability,
      message: 'Gig availability retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting gig availability:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: error.message });
  }
};

// Mettre à jour l'availability (schedule) d'un gig
export const updateGigAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { availability } = req.body;
    
    const gig = await Gig.findByIdAndUpdate(
      id,
      { availability },
      { new: true, runValidators: true }
    );
    
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: 'Gig not found' });
    }
    
    res.status(StatusCodes.OK).json({
      success: true,
      data: gig.availability,
      message: 'Gig availability updated successfully'
    });
  } catch (error) {
    console.error('Error updating gig availability:', error);
    res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
  }
};

// Trouver des gigs correspondants pour un agent
export const findGigsForAgent = async (req, res) => {
  try {
    const { agentId, weights } = req.body;
    
    // Récupérer l'agent avec populate des données géographiques
    const agent = await Agent.findById(agentId)
      .populate('availability.timeZone', 'countryCode zoneName gmtOffset')
      .populate('personalInfo.country', 'name cca2');
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }
    
    // Récupérer tous les gigs actifs avec populate
    const gigs = await Gig.find({ status: 'active' })
      .populate('destination_zone', 'name cca2')
      .populate('activities', 'name')
      .populate('industries', 'name')
      .populate('skills.professional.skill', 'name')
      .populate('skills.technical.skill', 'name')
      .populate('skills.soft.skill', 'name')
      .populate('skills.languages.language', 'name iso639_1')
      .populate('availability.time_zone', 'name')
      .populate('commission.currency', 'code symbol')
      .populate('team.territories', 'name cca2');
    
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
    
    // Récupérer le gig avec populate
    const gig = await Gig.findById(gigId)
      .populate('destination_zone', 'name cca2')
      .populate('activities', 'name')
      .populate('industries', 'name')
      .populate('skills.professional.skill', 'name')
      .populate('skills.technical.skill', 'name')
      .populate('skills.soft.skill', 'name')
      .populate('skills.languages.language', 'name iso639_1')
      .populate('availability.time_zone', 'name')
      .populate('commission.currency', 'code symbol')
      .populate('team.territories', 'name cca2');
    if (!gig) {
      return res.status(404).json({ message: 'Gig not found' });
    }
    
    // Récupérer tous les agents actifs avec populate des timezones
    const agents = await Agent.find({ status: 'active' })
      .populate('availability.timeZone', 'countryCode zoneName gmtOffset')
      .populate('personalInfo.country', 'name cca2');
    
    // Trouver les agents correspondants
    const result = await findMatches(gig, agents, weights);
    
    res.json(result);
  } catch (error) {
    console.error('Error finding agents for gig:', error);
    res.status(500).json({ message: 'Error finding matching agents', error: error.message });
  }
}; 