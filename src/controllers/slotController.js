import Slot from '../models/Slot.js';
import TimeSlot from '../models/TimeSlot.js';
import { format, parse, addMinutes, addDays } from 'date-fns';

/**
 * Generate slots automatically for a Gig based on parameters
 * POST /api/slots/generate
 * Body: { gigId, startDate, endDate, slotDuration, capacity, startHour, endHour }
 */
export const generateSlots = async (req, res) => {
    const { gigId, startDate, endDate, slotDuration, capacity, startHour, endHour } = req.body;

    if (!gigId || !startDate || !endDate || !slotDuration || !capacity) {
        return res.status(400).json({
            message: 'Missing required fields: gigId, startDate, endDate, slotDuration, capacity are required'
        });
    }

    try {
        const start = parse(startDate, 'yyyy-MM-dd', new Date());
        const end = parse(endDate, 'yyyy-MM-dd', new Date());
        const durationMinutes = slotDuration * 60; // Convert hours to minutes
        const startH = startHour || 9;
        const endH = endHour || 18;

        const slotsToCreate = [];
        let currentDate = start;

        // Generate slots for each day
        while (currentDate <= end) {
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            let currentTime = new Date(currentDate);
            currentTime.setHours(startH, 0, 0, 0);
            const dayEnd = new Date(currentDate);
            dayEnd.setHours(endH, 0, 0, 0);

            // Generate slots for this day
            while (currentTime < dayEnd) {
                const slotStart = format(currentTime, 'HH:mm');
                const slotEnd = format(addMinutes(currentTime, durationMinutes), 'HH:mm');

                // Check if slot already exists
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
                        status: 'available'
                    });
                }

                currentTime = addMinutes(currentTime, durationMinutes);
            }

            currentDate = addDays(currentDate, 1);
        }

        if (slotsToCreate.length === 0) {
            return res.status(200).json({
                message: 'No new slots to create (all slots already exist)',
                slots: []
            });
        }

        const createdSlots = await Slot.insertMany(slotsToCreate);

        res.status(201).json({
            message: `Successfully generated ${createdSlots.length} slots`,
            slots: createdSlots
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating slots', error: error.message });
    }
};

/**
 * Get all slots for a gig, optionally filtered by date
 * GET /api/slots?gigId=...&date=...
 */
export const getSlots = async (req, res) => {
    const { gigId, date } = req.query;

    try {
        const filter = {};
        if (gigId) filter.gigId = gigId;
        if (date) filter.date = date;

        const slots = await Slot.find(filter)
            .populate('gigId')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching slots', error: error.message });
    }
};

/**
 * Reserve a slot (add to Slot.reservations array)
 * POST /api/slots/:slotId/reserve
 * Body: { agentId, notes }
 */
export const reserveSlot = async (req, res) => {
    const { slotId } = req.params;
    const { agentId, repId, notes } = req.body;
    const finalAgentId = agentId || repId;

    if (!finalAgentId) {
        return res.status(400).json({ message: 'agentId or repId is required' });
    }

    try {
        const slot = await Slot.findById(slotId);
        if (!slot) {
            return res.status(404).json({ message: 'Slot not found' });
        }

        // Check for overlapping reservations in other slots
        const overlappingSlot = await Slot.findOne({
            _id: { $ne: slotId },
            date: slot.date,
            'reservations.agentId': finalAgentId,
            status: { $ne: 'cancelled' }
        });

        if (overlappingSlot) {
            // Further time comparison if needed, but for simplicity we block same date same agent in multiple slots
            // (Unless capacity logic allows specific time overlaps, but usually HH:mm is unique per gig)
            const resStart = parseInt(overlappingSlot.startTime.split(':')[0]) * 60 + parseInt(overlappingSlot.startTime.split(':')[1]);
            const resEnd = parseInt(overlappingSlot.endTime.split(':')[0]) * 60 + parseInt(overlappingSlot.endTime.split(':')[1]);
            const slotStart = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
            const slotEnd = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);

            if (resStart < slotEnd && resEnd > slotStart) {
                return res.status(400).json({
                    message: 'You have an overlapping reservation',
                    conflictingSlot: {
                        date: overlappingSlot.date,
                        startTime: overlappingSlot.startTime,
                        endTime: overlappingSlot.endTime
                    }
                });
            }
        }

        // Use the model method to reserve
        await slot.incrementReservation(finalAgentId, notes);

        const populatedSlot = await Slot.findById(slotId)
            .populate('gigId')
            .populate('reservations.agentId');

        res.status(200).json({
            message: 'Slot reserved successfully',
            slot: populatedSlot
        });
    } catch (error) {
        res.status(500).json({ message: 'Error reserving slot', error: error.message });
    }
};

/**
 * Cancel a reservation (remove from Slot.reservations array)
 * DELETE /api/slots/reservations/:reservationId
 * OR DELETE /api/slots/:slotId/reserve/:agentId
 */
export const cancelReservation = async (req, res) => {
    const { reservationId, slotId, agentId } = req.params;

    try {
        let slot;
        let finalAgentId = agentId;

        if (slotId && agentId) {
            slot = await Slot.findById(slotId);
        } else if (reservationId) {
            // Find slot containing this reservation ID
            slot = await Slot.findOne({ 'reservations._id': reservationId });
            if (slot) {
                const resv = slot.reservations.id(reservationId);
                finalAgentId = resv.agentId;
            }
        }

        if (!slot || !finalAgentId) {
            return res.status(404).json({ message: 'Reservation or Slot not found' });
        }

        await slot.decrementReservation(finalAgentId);

        res.status(200).json({
            message: 'Reservation cancelled successfully',
            slot
        });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling reservation', error: error.message });
    }
};

/**
 * Get reservations for an agent (Slots where agent is in reservations array)
 * GET /api/slots/reservations?agentId=...&gigId=...
 */
export const getReservations = async (req, res) => {
    const { agentId, repId, gigId } = req.query;
    const finalAgentId = agentId || repId;

    try {
        const filter = { 'reservations.agentId': finalAgentId };
        if (gigId) filter.gigId = gigId;

        const slots = await Slot.find(filter)
            .populate('gigId')
            .populate('reservations.agentId')
            .sort({ date: 1, startTime: 1 });

        // Map back to a compatible "reservation" format if frontend expects it
        const formatted = slots.map(s => {
            const resv = s.reservations.find(r => r.agentId?._id?.toString() === finalAgentId || r.agentId?.toString() === finalAgentId);
            return {
                ...s.toObject(),
                _id: resv ? resv._id : s._id, // compatible with previous reservationId
                slotId: s._id,
                isMember: true
            };
        });

        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reservations', error: error.message });
    }
};

/**
 * Create or update a manual slot assignment (equivalent to upsertTimeSlot but using Slot model)
 * POST /api/slots/upsert
 */
export const upsertSlot = async (req, res) => {
    const { agentId, repId, gigId, date, startTime, endTime, duration, status, notes } = req.body;
    const finalAgentId = agentId || repId;

    if (!finalAgentId || !gigId || !date || !startTime || !endTime) {
        return res.status(400).json({
            message: 'Missing required fields: agentId/repId, gigId, date, startTime, endTime are required'
        });
    }

    try {
        // Find existing slot for this gig/date/time
        let slot = await Slot.findOne({ gigId, date, startTime });

        if (!slot) {
            // Create new slot if it doesn't exist
            slot = new Slot({
                gigId,
                date,
                startTime,
                endTime,
                duration: duration || 1,
                capacity: 1,
                status: 'available'
            });
        }

        // Ensure agent is reserved in this slot
        const exists = slot.reservations.find(r => r.agentId.toString() === finalAgentId.toString());
        if (!exists) {
            await slot.incrementReservation(finalAgentId, notes);
        } else {
            // Update notes if already exists
            const resv = slot.reservations.find(r => r.agentId.toString() === finalAgentId.toString());
            resv.notes = notes || resv.notes || '';
            await slot.save();
        }

        const populated = await Slot.findById(slot._id).populate('gigId').populate('reservations.agentId');
        res.status(200).json(populated);
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
        const result = await Slot.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ message: 'Slot not found' });
        }
        res.status(200).json({ message: 'Slot deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting slot', error: error.message });
    }
};

