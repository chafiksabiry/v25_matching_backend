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
    reservations: [{
        agentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Agent',
            required: true
        },
        notes: {
            type: String,
            default: ''
        },
        reservedAt: {
            type: Date,
            default: Date.now
        }
    }],
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

// Method to increment reservation count and add agent
slotSchema.methods.incrementReservation = async function (agentId, notes) {
    if (this.reservedCount >= this.capacity) {
        throw new Error('Slot is full');
    }

    // Check if agent already reserved
    const exists = this.reservations.find(r => r.agentId.toString() === agentId.toString());
    if (exists) {
        throw new Error('Agent already reserved this slot');
    }

    this.reservations.push({ agentId, notes: notes || '' });
    this.reservedCount = this.reservations.length;

    if (this.reservedCount >= this.capacity) {
        this.status = 'full';
    }
    return this.save();
};

// Method to decrement reservation count and remove agent
slotSchema.methods.decrementReservation = async function (agentId) {
    const initialCount = this.reservations.length;
    this.reservations = this.reservations.filter(r => r.agentId.toString() !== agentId.toString());

    if (this.reservations.length === initialCount) {
        return this; // No change if agent wasn't found
    }

    this.reservedCount = this.reservations.length;

    if (this.status === 'full' && this.reservedCount < this.capacity) {
        this.status = 'available';
    }
    return this.save();
};

const Slot = mongoose.model('Slot', slotSchema);

export default Slot;
