import mongoose from 'mongoose';

/**
 * TimeSlot model - Represents a reservation by an agent for a Slot
 * Multiple TimeSlots can reference the same Slot if Slot.capacity > 1
 */
const timeSlotSchema = new mongoose.Schema({
    agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
        required: true
    },
    slotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Slot',
        required: false // Optional for backward compatibility
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
    status: {
        type: String,
        enum: ['available', 'reserved', 'cancelled'],
        default: 'reserved'
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for quick lookup and preventing duplicates (one reservation per agent per slot)
timeSlotSchema.index({ agentId: 1, slotId: 1 }, { unique: true, sparse: true });
// Legacy index for backward compatibility
timeSlotSchema.index({ agentId: 1, gigId: 1, date: 1, startTime: 1 }, { unique: true, sparse: true });

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

export default TimeSlot;
