import mongoose from 'mongoose';

const matchDetailsSchema = new mongoose.Schema({
  experienceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  skillsScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  industryScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  languageScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  availabilityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  timezoneScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  performanceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  regionScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  }
});

const matchSchema = new mongoose.Schema({
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
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  matchDetails: {
    type: matchDetailsSchema,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Ensure an agent can only have one active match per gig
matchSchema.index({ agentId: 1, gigId: 1 }, { unique: true });

const Match = mongoose.model('Match', matchSchema);

export default Match;