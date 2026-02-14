import TimeSlot from '../models/TimeSlot.js';

/**
 * Get all time slots for an agent, optionally filtered by gig and date
 */
export const getTimeSlots = async (req, res) => {
    const { agentId, repId, gigId, date } = req.query;

    try {
        const filter = {};
        if (agentId || repId) filter.agentId = agentId || repId;
        if (gigId) filter.gigId = gigId;
        if (date) filter.date = date;

        const slots = await TimeSlot.find(filter).sort({ date: 1, startTime: 1 });
        res.status(200).json(slots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching time slots', error: error.message });
    }
};

/**
 * Create or update a time slot
 */
export const upsertTimeSlot = async (req, res) => {
    const { agentId, repId, gigId, date, startTime, endTime, duration, status, notes } = req.body;
    const finalAgentId = agentId || repId;

    try {
        const filter = { agentId: finalAgentId, gigId, date, startTime };
        const update = {
            endTime,
            duration,
            status,
            notes
        };

        const slot = await TimeSlot.findOneAndUpdate(
            filter,
            { $set: update },
            { new: true, upsert: true }
        );

        res.status(200).json(slot);
    } catch (error) {
        res.status(500).json({ message: 'Error saving time slot', error: error.message });
    }
};

/**
 * Delete a time slot
 */
export const deleteTimeSlot = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await TimeSlot.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ message: 'Time slot not found' });
        }
        res.status(200).json({ message: 'Time slot deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting time slot', error: error.message });
    }
};

/**
 * Cancel a time slot
 */
export const cancelTimeSlot = async (req, res) => {
    const { id } = req.params;

    try {
        const slot = await TimeSlot.findByIdAndUpdate(
            id,
            { $set: { status: 'cancelled' } },
            { new: true }
        );
        if (!slot) {
            return res.status(404).json({ message: 'Time slot not found' });
        }
        res.status(200).json(slot);
    } catch (error) {
        res.status(500).json({ message: 'Error cancelling time slot', error: error.message });
    }
};
