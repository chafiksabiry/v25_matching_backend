import Rep from '../models/Rep.js';
import { StatusCodes } from 'http-status-codes';
import axios from 'axios';
import config from '../config/config.js';
import mongoose from 'mongoose';

// Get all reps
export const getAllReps = async (req, res) => {
  console.log("Début de getAllReps");
  try {
    const { page = 1, limit = 200 } = req.body;
    
    // Vérifier l'état de la connexion MongoDB
    const dbState = mongoose.connection.readyState;
    console.log("État de la connexion MongoDB:", {
      state: dbState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    });

    if (dbState !== 1) {
      console.error("La connexion MongoDB n'est pas établie");
      return res.status(503).json({
        success: false,
        message: "Service temporairement indisponible - Connexion à la base de données non établie"
      });
    }
    
    console.log("Tentative de récupération des reps avec les paramètres:", { page, limit });
    
    const reps = await Rep.find({})
      .limit(limit)
      .skip((page - 1) * limit)
      .maxTimeMS(60000) // Augmenter le timeout à 60 secondes
      .exec();
    
    console.log("Récupération des reps réussie, tentative de comptage");
    
    const totalReps = await Rep.countDocuments()
      .maxTimeMS(60000) // Augmenter le timeout à 60 secondes
      .exec();
    
    console.log("Nombre de reps trouvés:", reps.length, "Total:", totalReps);
    
    res.json({ 
      success: true, 
      data: reps,
      totalReps: totalReps,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Détails de l'erreur:", {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });

    if (error.name === 'MongooseError' && error.message.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: "Service temporairement indisponible - Problème de connexion à la base de données",
        details: error.message,
        connectionState: mongoose.connection.readyState
      });
    }

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des reps",
      details: error.message
    });
  }
};

export const getRepById = async (req, res) => {
  try {
    const rep = await Rep.findById(req.params.id);
    if (!rep) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Rep not found' });
    }
    res.status(StatusCodes.OK).json(rep);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Create a new rep
export const createRep = async (req, res) => {
  try {
    const rep = new Rep(req.body);
    const savedRep = await rep.save();
    res.status(StatusCodes.CREATED).json(savedRep);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Update a rep
export const updateRep = async (req, res) => {
  try {
    const rep = await Rep.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!rep) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Rep not found' });
    }
    res.status(StatusCodes.OK).json(rep);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Delete a rep
export const deleteRep = async (req, res) => {
  try {
    const rep = await Rep.findByIdAndDelete(req.params.id);
    if (!rep) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Rep not found' });
    }
    res.status(StatusCodes.OK).json({ message: 'Rep deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get reps from Zoho CRM RepsPipeline
export const getZohoReps = async (req, res) => {
  try {
    const deals = await getRepsPipelineDeals();
    
    // Transform Zoho deals into rep format
    const reps = deals.map(deal => ({
      name: deal.Deal_Name || 'Unknown',
      experience: parseInt(deal.Experience__c) || 0,
      skills: deal.Skills__c ? deal.Skills__c.split(',') : [],
      industries: deal.Industries__c ? deal.Industries__c.split(',') : [],
      languages: deal.Languages__c ? deal.Languages__c.split(',') : [],
      availability: deal.Availability__c ? JSON.parse(deal.Availability__c) : [],
      timezone: deal.Timezone__c || 'UTC',
      conversionRate: parseFloat(deal.Conversion_Rate__c) || 0,
      reliability: parseInt(deal.Reliability__c) || 5,
      rating: parseFloat(deal.Rating__c) || 3,
      completedGigs: parseInt(deal.Completed_Gigs__c) || 0,
      region: deal.Region__c || 'Unknown',
      zohoDealId: deal.id
    }));

    res.status(StatusCodes.OK).json(reps);
  } catch (error) {
    console.error('Error fetching reps from Zoho CRM:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: 'Error fetching reps from Zoho CRM',
      error: error.message 
    });
  }
};

// Get all data from both local database and Zoho CRM
export const getAllData = async (req, res) => {
  try {
    // Get local reps
    const localReps = await Rep.find({});
    
    // Get Zoho reps
    const zohoReps = await getZohoReps(req, res);
    
    // Combine both data sources
    const allData = {
      localReps,
      zohoReps,
      totalCount: localReps.length + zohoReps.length
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