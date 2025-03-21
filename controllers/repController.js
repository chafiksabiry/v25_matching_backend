import Rep from '../models/Rep.js';
import { StatusCodes } from 'http-status-codes';

// Get all reps
export const getAllReps = async (req, res) => {
  try {
    const reps = await Rep.find();
    res.status(StatusCodes.OK).json(reps);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Get a single rep
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