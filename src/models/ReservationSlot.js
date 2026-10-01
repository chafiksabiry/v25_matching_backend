import mongoose from 'mongoose';

/**
 * ReservationSlot model - Represents a specific reservation of a Slot by an Agent
 */
const reservationSlotSchema = new mongoose.Schema({
    slotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot',
        required: true
    },
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    gigId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Gig',
        required: true
    },
    date: {
        type: String, // format yyyy-MM-dd or Day Name (e.g., 'Monday') for recurring weekly schedules
        required: true
    },
    /**
     * Date du jour réservé (jour du slot), distincte de createdAt (date de création de la réservation).
     * Format attendu: yyyy-MM-dd (ou day name pour les slots hebdo legacy).
     */
    reservationDate: {
        type: String,
        required: true
    },
    startTime: {
        type: String, // format HH:mm
        required: true
    },
    endTime: {
        type: String, // format HH:mm
        required: true
    },
    duration: {
        type: Number,
        required: true,
        default: 1
    },
    notes: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['reserved', 'cancelled'],
        default: 'reserved'
    }
}, {
    timestamps: true
});

// One reservation per agent per slot occurrence (recurring templates share slotId
// across weeks — reservationDate distinguishes Mon week N from Mon week N+1).
reservationSlotSchema.index(
    { slotId: 1, agentId: 1, reservationDate: 1 },
    { unique: true, name: 'slot_agent_reservationDate_unique' }
);
// Lookups for overlap checks on a given calendar day
reservationSlotSchema.index({ agentId: 1, reservationDate: 1, startTime: 1 });
reservationSlotSchema.index({ agentId: 1, date: 1, startTime: 1 });

const ReservationSlot = mongoose.model('ReservationSlot', reservationSlotSchema);

export default ReservationSlot;
