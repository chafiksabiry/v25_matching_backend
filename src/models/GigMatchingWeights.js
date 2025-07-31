import mongoose from 'mongoose';

const gigMatchingWeightsSchema = new mongoose.Schema({
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true,
    unique: true,
    index: true
  },
  matchingWeights: {
    experience: { type: Number, default: 0.20, min: 0, max: 1 },
    skills: { type: Number, default: 0.20, min: 0, max: 1 },
    industry: { type: Number, default: 0.15, min: 0, max: 1 },
    languages: { type: Number, default: 0.15, min: 0, max: 1 },
    availability: { type: Number, default: 0.10, min: 0, max: 1 },
    timezone: { type: Number, default: 0.10, min: 0, max: 1 },
    activities: { type: Number, default: 0.10, min: 0, max: 1 },
    region: { type: Number, default: 0.10, min: 0, max: 1 }
  },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    description: { type: String }
  }
}, {
  timestamps: true,
  indexes: [
    { gigId: 1 }
  ]
});

gigMatchingWeightsSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Method to get all matching weights
gigMatchingWeightsSchema.methods.getMatchingWeights = function() {
  return this.matchingWeights;
};

// Method to update matching weights
gigMatchingWeightsSchema.methods.updateMatchingWeights = function(newWeights) {
  this.matchingWeights = { ...this.matchingWeights, ...newWeights };
  return this.save();
};

// Method to reset weights to defaults
gigMatchingWeightsSchema.methods.resetToDefaults = function() {
  this.matchingWeights = {
    experience: 0.20,
    skills: 0.20,
    industry: 0.15,
    languages: 0.15,
    availability: 0.10,
    timezone: 0.10,
    activities: 0.10,
    region: 0.10
  };
  return this.save();
};

const GigMatchingWeights = mongoose.model('GigMatchingWeights', gigMatchingWeightsSchema);
export default GigMatchingWeights; 