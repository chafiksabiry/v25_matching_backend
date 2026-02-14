import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['available', 'reserved', 'cancelled'],
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
timeSlotSchema.index({ agentId: 1, gigId: 1, date: 1, startTime: 1 }, { unique: true });

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

export default TimeSlot;
