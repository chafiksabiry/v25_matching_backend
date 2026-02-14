import express from 'express';
import {
    getTimeSlots,
    upsertTimeSlot,
    deleteTimeSlot,
    cancelTimeSlot
} from '../controllers/timeSlotController.js';

const router = express.Router();

// GET /api/time-slots?agentId=...&gigId=...&date=...
router.get('/', getTimeSlots);

// POST /api/time-slots (Creates or updates a slot)
router.post('/', upsertTimeSlot);

// DELETE /api/time-slots/:id
router.delete('/:id', deleteTimeSlot);

// PATCH /api/time-slots/:id/cancel
router.patch('/:id/cancel', cancelTimeSlot);

export default router;
