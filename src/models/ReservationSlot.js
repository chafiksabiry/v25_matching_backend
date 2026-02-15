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
        type: String, // format yyyy-MM-dd
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

// Index for quick lookup and preventing duplicates (one agent per slot)
reservationSlotSchema.index({ slotId: 1, agentId: 1 }, { unique: true });
// Index for finding agent's reservations on a specific date (for overlaps)
reservationSlotSchema.index({ agentId: 1, date: 1, startTime: 1 });

const ReservationSlot = mongoose.model('ReservationSlot', reservationSlotSchema);

export default ReservationSlot;
