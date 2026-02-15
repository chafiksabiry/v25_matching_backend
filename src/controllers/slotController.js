import Slot from '../models/Slot.js';
import ReservationSlot from '../models/ReservationSlot.js';
import { format, parse, addMinutes, addDays } from 'date-fns';

/**
 * Generate slots automatically for a Gig based on parameters
 * POST /api/slots/generate
 */
export const generateSlots = async (req, res) => {
    const { gigId, startDate, endDate, slotDuration, capacity, startHour, endHour, notes } = req.body;

    if (!gigId || !startDate || !endDate || !slotDuration || !capacity) {
        return res.status(400).json({
            message: 'Missing required fields: gigId, startDate, endDate, slotDuration, capacity are required'
        });
    }

    try {
        const start = parse(startDate, 'yyyy-MM-dd', new Date());
        const end = parse(endDate, 'yyyy-MM-dd', new Date());
        const durationMinutes = slotDuration * 60;
        const startH = startHour || 9;
        const endH = endHour || 18;

        const slotsToCreate = [];
        let currentDate = start;

        while (currentDate <= end) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            let currentTime = new Date(currentDate);
            currentTime.setHours(startH, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(endH, 0, 0, 0);

            while (currentTime < dayEnd) {
                const slotStart = format(currentTime, 'HH:mm');
                const slotEnd = format(addMinutes(currentTime, durationMinutes), 'HH:mm');

                const existing = await Slot.findOne({
                    gigId,
                    date: dateStr,
                    startTime: slotStart
                });

                if (!existing) {
                    slotsToCreate.push({
                        gigId,
                        date: dateStr,
                        startTime: slotStart,
                        endTime: slotEnd,
                        duration: slotDuration,
                        capacity: parseInt(capacity),
                        reservedCount: 0,
                        status: 'available',
                        notes: notes || ''
                    });
                }
                currentTime = addMinutes(currentTime, durationMinutes);
            }
            currentDate = addDays(currentDate, 1);
        }

        if (slotsToCreate.length === 0) {
            return res.status(200).json({ message: 'No new slots to create', slots: [] });
        }

        const createdSlots = await Slot.insertMany(slotsToCreate);
        res.status(201).json({ message: `Generated ${createdSlots.length} slots`, slots: createdSlots });
    } catch (error) {
        res.status(500).json({ message: 'Error generating slots', error: error.message });
    }
};

/**
 * Get all slots for a gig, optionally filtered by date
 */
export const getSlots = async (req, res) => {
    const { gigId, date, agentId, repId } = req.query;
    const finalAgentId = agentId || repId;

    try {
        let slots;
        if (finalAgentId) {
            // Find slots where this agent has a reservation
            const reservations = await ReservationSlot.find({ agentId: finalAgentId, status: 'reserved' }).select('slotId');
            const slotIds = reservations.map(r => r.slotId);
            slots = await Slot.find({ _id: { $in: slotIds } })
                .populate('gigId')
                .sort({ date: 1, startTime: 1 });
        } else {
            const filter = {};
            if (gigId) filter.gigId = gigId;
            if (date) filter.date = date;
            slots = await Slot.find(filter)
                .populate('gigId')
                .populate('reservations')
                .sort({ date: 1, startTime: 1 });
        }

        res.status(200).json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching slots', error: error.message });
    }
};

/**
 * Reserve a slot
 * POST /api/slots/:slotId/reserve
 */
export const reserveSlot = async (req, res) => {
    const { slotId } = req.params;
    const { agentId, repId, notes } = req.body;
    const finalAgentId = agentId || repId;

    if (!finalAgentId) return res.status(400).json({ message: 'agentId or repId is required' });

    try {
        const slot = await Slot.findById(slotId);
        if (!slot) return res.status(404).json({ message: 'Slot not found' });

        if (slot.reservedCount >= slot.capacity) {
            return res.status(400).json({ message: 'Slot is full' });
        }

        // Check if agent already reserved this specific slot
        const existingRes = await ReservationSlot.findOne({ slotId, agentId: finalAgentId, status: 'reserved' });
        if (existingRes) return res.status(400).json({ message: 'Agent already reserved this slot' });

        // Check for overlapping reservations
        const overlapping = await ReservationSlot.findOne({
            agentId: finalAgentId,
            date: slot.date,
            status: 'reserved',
            $or: [
                { startTime: { $lt: slot.endTime, $gte: slot.startTime } },
                { endTime: { $gt: slot.startTime, $lte: slot.endTime } }
            ]
        });

        if (overlapping) {
            return res.status(400).json({
                message: 'You have an overlapping reservation',
                conflictingSlot: { date: overlapping.date, startTime: overlapping.startTime, endTime: overlapping.endTime }
            });
        }

        // Create Reservation
        const reservation = new ReservationSlot({
            slotId,
            agentId: finalAgentId,
            gigId: slot.gigId,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            notes: notes || ''
        });
        await reservation.save();

        // Update Slot
        slot.reservedCount += 1;
        if (slot.reservedCount >= slot.capacity) slot.status = 'full';

        // Add reference ID
        if (!slot.reservations) slot.reservations = [];
        slot.reservations.push(reservation._id);

        await slot.save();

        const populatedSlot = await Slot.findById(slotId).populate('gigId').populate('reservations');
        res.status(200).json({ message: 'Slot reserved successfully', slot: populatedSlot, reservation });
    } catch (error) {
        res.status(500).json({ message: 'Error reserving slot', error: error.message });
    }
};

/**
 * Cancel a reservation
 * DELETE /api/slots/reservations/:reservationId
 */
export const cancelReservation = async (req, res) => {
    const { reservationId } = req.params;

    try {
        const reservation = await ReservationSlot.findById(reservationId);
        if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

        if (reservation.status === 'cancelled') {
            return res.status(400).json({ message: 'Reservation already cancelled' });
        }

        // Update Reservation Status
        reservation.status = 'cancelled';
        await reservation.save();

        // Update Slot
        const slot = await Slot.findById(reservation.slotId);
        if (slot) {
            slot.reservedCount = Math.max(0, slot.reservedCount - 1);
            if (slot.reservedCount < slot.capacity) slot.status = 'available';

            // Remove reference ID
            if (slot.reservations) {
                slot.reservations = slot.reservations.filter(id => id.toString() !== reservationId.toString());
            }

            await slot.save();
        }

        res.status(200).json({ message: 'Reservation cancelled successfully', reservation, slot });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling reservation', error: error.message });
    }
};

/**
 * Update a reservation
 * PATCH /api/slots/reservations/:reservationId
 */
export const updateReservation = async (req, res) => {
    const { reservationId } = req.params;
    const { notes } = req.body;

    try {
        const reservation = await ReservationSlot.findById(reservationId);
        if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

        if (notes !== undefined) reservation.notes = notes;
        await reservation.save();

        res.status(200).json({ message: 'Reservation updated successfully', reservation });
    } catch (error) {
        res.status(500).json({ message: 'Error updating reservation', error: error.message });
    }
};

/**
 * Get reservations for an agent
 * GET /api/slots/reservations
 */
export const getReservations = async (req, res) => {
    const { agentId, repId, gigId } = req.query;
    const finalAgentId = agentId || repId;

    try {
        const filter = { status: 'reserved' };
        if (finalAgentId) filter.agentId = finalAgentId;
        if (gigId) filter.gigId = gigId;

        const reservations = await ReservationSlot.find(filter)
            .populate('gigId')
            .populate('agentId')
            .sort({ date: 1, startTime: 1 });

        // Map back to format compatible with frontend expectations
        const formatted = reservations.map(r => ({
            ...r.toObject(),
            isMember: true,
            reservationId: r._id // explicitly include for clarity
        }));

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reservations', error: error.message });
    }
};

/**
 * Create or update a manual slot assignment
 * POST /api/slots/upsert
 */
export const upsertSlot = async (req, res) => {
    const { agentId, repId, gigId, date, startTime, endTime, duration, notes } = req.body;
    const finalAgentId = agentId || repId;

    if (!finalAgentId || !gigId || !date || !startTime || !endTime) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        let slot = await Slot.findOne({ gigId, date, startTime });
        if (!slot) {
            slot = new Slot({ gigId, date, startTime, endTime, duration: duration || 1, capacity: 1, status: 'available' });
            await slot.save();
        }

        let reservation = await ReservationSlot.findOne({ slotId: slot._id, agentId: finalAgentId, status: 'reserved' });
        if (!reservation) {
            // Reserve it
            reservation = new ReservationSlot({
                slotId: slot._id,
                agentId: finalAgentId,
                gigId,
                date,
                startTime,
                endTime,
                duration: duration || 1,
                notes: notes || ''
            });
            await reservation.save();

            slot.reservedCount += 1;
            if (slot.reservedCount >= slot.capacity) slot.status = 'full';

            // Add reference ID
            if (!slot.reservations) slot.reservations = [];
            if (!slot.reservations.includes(reservation._id)) {
                slot.reservations.push(reservation._id);
            }

            await slot.save();
        } else {
            // Update notes
            reservation.notes = notes || reservation.notes || '';
            await reservation.save();
        }

        const populatedSlot = await Slot.findById(slot._id).populate('gigId');
        res.status(200).json({ slot: populatedSlot, reservation });
    } catch (error) {
        res.status(500).json({ message: 'Error upserting slot', error: error.message });
    }
};

/**
 * Delete a slot
 * DELETE /api/slots/:id
 */
export const deleteSlot = async (req, res) => {
    const { id } = req.params;
    try {
        // Also cancel/delete reservations for this slot?
        // User didn't specify, but safer to at least mark them as cancelled or delete them.
        await ReservationSlot.deleteMany({ slotId: id });
        const result = await Slot.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ message: 'Slot not found' });
        res.status(200).json({ message: 'Slot and its reservations deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting slot', error: error.message });
    }
};


