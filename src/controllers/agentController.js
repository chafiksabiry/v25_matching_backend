import Agent from '../models/Agent.js';
import { StatusCodes } from 'http-status-codes';
import axios from 'axios';
import config from '../config/config.js';
import mongoose from 'mongoose';

// Get all agents
export const getAllAgents = async (req, res) => {
  try {
    const agents = await Agent.find();
    res.status(StatusCodes.OK).json(agents);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get a specific agent by ID
export const getAgentById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Getting agent by ID: ${id}`);

    // Helper to populate agent fields
    const populateAgent = (query) => {
      return query
        .populate('personalInfo.languages.language', 'name nativeName code')
        .populate('personalInfo.country', 'name code')
        .populate('availability.timeZone', 'zoneName countryCode countryName gmtOffset')
        .populate('professionalSummary.industries', 'name description category')
        .populate('professionalSummary.activities', 'name description category')
        .populate('skills.technical.skill', 'name description category')
        .populate('skills.professional.skill', 'name description category')
        .populate('skills.soft.skill', 'name description category')
        .populate('favoriteGigs', 'title description');
    };

    let agent;

    // Valid ObjectId? Try finding by _id
    if (mongoose.Types.ObjectId.isValid(id)) {
      agent = await populateAgent(Agent.findById(id));
    }

    // If not found or invalid ObjectId, try finding by userId
    if (!agent) {
      console.log(`Agent not found by _id ${id}, trying by userId...`);
      // Validate if it could be a userId (assuming userId is also ObjectId)
      if (mongoose.Types.ObjectId.isValid(id)) {
        agent = await populateAgent(Agent.findOne({ userId: id }));
      }
    }

    if (!agent) {
      console.log(`Agent not found: ${id}`);
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }

    res.status(StatusCodes.OK).json(agent);
  } catch (error) {
    console.error('Error in getAgentById:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Create a new agent
export const createAgent = async (req, res) => {
  try {
    const agent = new Agent(req.body);
    const savedAgent = await agent.save();
    res.status(StatusCodes.CREATED).json(savedAgent);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Update an agent
export const updateAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }
    res.status(StatusCodes.OK).json(agent);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Delete an agent
export const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }
    res.status(StatusCodes.OK).json({ message: 'Agent deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get agents from Zoho CRM
export const getZohoAgents = async (req, res) => {
  try {
    const deals = await getAgentsPipelineDeals();

    // Transform Zoho deals into agent format
    const agents = deals.map(deal => ({
      name: deal.Deal_Name || 'Unknown',
      experience: parseInt(deal.Experience__c) || 0,
      skills: deal.Skills__c ? deal.Skills__c.split(',') : [],
      industries: deal.Industries__c ? deal.Industries__c.split(',') : [],
      languages: deal.Languages__c ? deal.Languages__c.split(',') : [],
      zohoDealId: deal.id
    }));

    res.status(StatusCodes.OK).json(agents);
  } catch (error) {
    console.error('Error fetching agents from Zoho CRM:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error fetching agents from Zoho CRM',
      error: error.message
    });
  }
};

// Get all data from both local database and Zoho CRM
export const getAllData = async (req, res) => {
  try {
    // Get local agents
    const localAgents = await Agent.find({});

    // Get Zoho agents
    const zohoAgents = await getZohoAgents(req, res);

    // Combine both data sources
    const allData = {
      localAgents,
      zohoAgents,
      totalCount: localAgents.length + zohoAgents.length
    };

    res.status(StatusCodes.OK).json(allData);
  } catch (error) {
    console.error('Error fetching all data:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error fetching all data',
      error: error.message
    });
  }
}; 