import express from 'express';
import {
  getAllGigs,
  getGigById,
  createGig,
  updateGig,
  deleteGig
} from '../controllers/gigController.js';

const router = express.Router();

router.route('/')
  .get(getAllGigs)
  .post(createGig);

router.route('/:id')
  .get(getGigById)
  .put(updateGig)
  .delete(deleteGig);

export default router;