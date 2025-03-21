import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';

// Get all gigs
export const getAllGigs = async (req, res) => {
  try {
    const gigs = await Gig.find();
    res.status(StatusCodes.OK).json(gigs);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get a single gig
export const getGigById = async (req, res) => {
  try {
    const gig = await Gig.findById(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }
    res.status(StatusCodes.OK).json(gig);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Create a new gig
export const createGig = async (req, res) => {
  try {
    const gig = new Gig(req.body);
    const savedGig = await gig.save();
    res.status(StatusCodes.CREATED).json(savedGig);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Update a gig
export const updateGig = async (req, res) => {
  try {
    const gig = await Gig.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }
    res.status(StatusCodes.OK).json(gig);
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }
};

// Delete a gig
export const deleteGig = async (req, res) => {
  try {
    const gig = await Gig.findByIdAndDelete(req.params.id);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }
    res.status(StatusCodes.OK).json({ message: 'Gig deleted successfully' });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};