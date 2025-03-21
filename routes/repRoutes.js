import express from 'express';
import {
  getAllReps,
  getRepById,
  createRep,
  updateRep,
  deleteRep
} from '../controllers/repController.js';

const router = express.Router();

router.route('/')
  .get(getAllReps)
  .post(createRep);

router.route('/:id')
  .get(getRepById)
  .put(updateRep)
  .delete(deleteRep);

export default router;