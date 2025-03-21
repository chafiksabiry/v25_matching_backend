import express from 'express';
import {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  findMatchesForGigById,
  findGigsForRepById,
  generateOptimalMatches
} from '../controllers/matchController.js';

const router = express.Router();

router.route('/')
  .get(getAllMatches)
  .post(createMatch);

router.route('/:id')
  .get(getMatchById)
  .put(updateMatch)
  .delete(deleteMatch);

router.route('/gig/:id/matches')
  .post(findMatchesForGigById);

router.route('/rep/:id/gigs')
  .post(findGigsForRepById);

router.route('/optimize')
  .post(generateOptimalMatches);
  

export default router;