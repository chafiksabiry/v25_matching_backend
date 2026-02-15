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
 * Reserve a slot (create TimeSlot and increment Slot.reservedCount)
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

        // Check if slot can be reserved
        if (!slot.canReserve()) {
            return res.status(400).json({
                message: 'Slot is full or unavailable',
                available: slot.capacity - slot.reservedCount
            });
        }

        // Check if agent already has a reservation for this slot
        const existingReservation = await TimeSlot.findOne({
            agentId: finalAgentId,
            slotId: slotId
        });

        if (existingReservation) {
            return res.status(400).json({ message: 'You already have a reservation for this slot' });
        }

        // Check for overlapping reservations (same date and overlapping time)
        // Two slots overlap if: slot1.start < slot2.end AND slot1.end > slot2.start
        const allReservations = await TimeSlot.find({
            agentId: finalAgentId,
            gigId: slot.gigId,
            date: slot.date,
            status: { $ne: 'cancelled' }
        });

        const overlappingReservation = allReservations.find(res => {
            // Convert HH:mm to minutes for comparison
            const resStart = parseInt(res.startTime.split(':')[0]) * 60 + parseInt(res.startTime.split(':')[1]);
            const resEnd = parseInt(res.endTime.split(':')[0]) * 60 + parseInt(res.endTime.split(':')[1]);
            const slotStart = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1]);
            const slotEnd = parseInt(slot.endTime.split(':')[0]) * 60 + parseInt(slot.endTime.split(':')[1]);

            // Overlap: resStart < slotEnd && resEnd > slotStart
            return resStart < slotEnd && resEnd > slotStart;
        });

        if (overlappingReservation) {
            return res.status(400).json({
                message: 'You have an overlapping reservation',
                conflictingSlot: {
                    date: overlappingReservation.date,
                    startTime: overlappingReservation.startTime,
                    endTime: overlappingReservation.endTime
                }
            });
        }

        // Create reservation
        const reservation = new TimeSlot({
            agentId: finalAgentId,
            slotId: slotId,
            gigId: slot.gigId,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            duration: slot.duration,
            status: 'reserved',
            notes: notes || ''
        });

        await reservation.save();

        // Increment slot reservation count
        await slot.incrementReservation();

        const populatedReservation = await TimeSlot.findById(reservation._id)
            .populate('agentId')
            .populate('slotId')
            .populate('gigId');

        res.status(201).json({
            message: 'Slot reserved successfully',
            reservation: populatedReservation
        });
    } catch (error) {
        res.status(500).json({ message: 'Error reserving slot', error: error.message });
    }
};

/**
 * Cancel a reservation (delete TimeSlot and decrement Slot.reservedCount)
 * DELETE /api/slots/reservations/:reservationId
 */
export const cancelReservation = async (req, res) => {
    const { reservationId } = req.params;

    try {
        const reservation = await TimeSlot.findById(reservationId);
        if (!reservation) {
            return res.status(404).json({ message: 'Reservation not found' });
        }

        // Decrement slot reservation count if slotId exists
        if (reservation.slotId) {
            const slot = await Slot.findById(reservation.slotId);
            if (slot) {
                await slot.decrementReservation();
            }
        }

        // Delete or mark reservation as cancelled
        reservation.status = 'cancelled';
        await reservation.save();

        res.status(200).json({
            message: 'Reservation cancelled successfully',
            reservation
        });
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling reservation', error: error.message });
    }
};

/**
 * Get reservations for an agent
 * GET /api/slots/reservations?agentId=...&gigId=...
 */
export const getReservations = async (req, res) => {
    const { agentId, repId, gigId } = req.query;
    const finalAgentId = agentId || repId;

    try {
        const filter = { status: { $ne: 'cancelled' } };
        if (finalAgentId) filter.agentId = finalAgentId;
        if (gigId) filter.gigId = gigId;

        const reservations = await TimeSlot.find(filter)
            .populate('agentId')
            .populate('slotId')
            .populate('gigId')
            .sort({ date: 1, startTime: 1 });

        res.status(200).json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reservations', error: error.message });
    }
};
