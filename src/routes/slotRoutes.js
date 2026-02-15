import express from 'express';
import {
    generateSlots,
    getSlots,
    reserveSlot,
    cancelReservation,
    updateReservation,
    getReservations,
    upsertSlot,
    deleteSlot
} from '../controllers/slotController.js';

const router = express.Router();

// POST /api/slots/generate - Generate slots for a gig
router.post('/generate', generateSlots);

// GET /api/slots - Get all slots (filtered by gigId, date)
router.get('/', getSlots);

// POST /api/slots/upsert - Create or update a manual slot
router.post('/upsert', upsertSlot);

// POST /api/slots/:slotId/reserve - Reserve a slot
router.post('/:slotId/reserve', reserveSlot);

// DELETE /api/slots/reservations/:reservationId - Cancel a reservation
router.delete('/reservations/:reservationId', cancelReservation);

// PATCH /api/slots/reservations/:reservationId - Update a reservation
router.patch('/reservations/:reservationId', updateReservation);

// DELETE /api/slots/:id - Delete a slot
router.delete('/:id', deleteSlot);

// GET /api/slots/reservations - Get reservations (filtered by agentId, gigId)
router.get('/reservations', getReservations);

export default router;
