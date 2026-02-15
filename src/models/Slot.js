import mongoose from 'mongoose';

/**
 * Slot model - Represents an available time slot for a Gig with capacity
 * Multiple agents can reserve the same slot if capacity > 1
 */
const slotSchema = new mongoose.Schema({
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
        type: Number, // in hours
        required: true,
        default: 1
    },
    capacity: {
        type: Number, // number of reps that can reserve this slot
        required: true,
        default: 1,
        min: 1
    },
    reservedCount: {
        type: Number, // current number of reservations
        default: 0,
        min: 0
    },
    status: {
        type: String,
        enum: ['available', 'full', 'cancelled'],
        default: 'available'
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for quick lookup and preventing duplicates
slotSchema.index({ gigId: 1, date: 1, startTime: 1 }, { unique: true });

// Virtual to check if slot is available
slotSchema.virtual('isAvailable').get(function () {
    return this.status === 'available' && this.reservedCount < this.capacity;
});

// Method to check if slot can be reserved
slotSchema.methods.canReserve = function () {
    return this.status === 'available' && this.reservedCount < this.capacity;
};

const Slot = mongoose.model('Slot', slotSchema);

export default Slot;
