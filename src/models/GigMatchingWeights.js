import mongoose from 'mongoose';

const gigMatchingWeightsSchema = new mongoose.Schema({
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true,
    unique: true,
    index: true
  },
  categoryWeights: {
    skills: { type: Number, default: 0.5, min: 0, max: 1 },
    activities: { type: Number, default: 0.5, min: 0, max: 1 },
    industries: { type: Number, default: 0.5, min: 0, max: 1 },
    languages: { type: Number, default: 0.5, min: 0, max: 1 },
    destination: { type: Number, default: 0.5, min: 0, max: 1 },
    seniority: { type: Number, default: 0.5, min: 0, max: 1 }
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

// Method to get all category weights
gigMatchingWeightsSchema.methods.getCategoryWeights = function() {
  return this.categoryWeights;
};

// Method to update category weights
gigMatchingWeightsSchema.methods.updateCategoryWeights = function(newWeights) {
  this.categoryWeights = { ...this.categoryWeights, ...newWeights };
  return this.save();
};

// Method to reset weights to defaults
gigMatchingWeightsSchema.methods.resetToDefaults = function() {
  this.categoryWeights = {
    skills: 0.5,
    activities: 0.5,
    industries: 0.5,
    languages: 0.5,
    destination: 0.5,
    seniority: 0.5
  };
  return this.save();
};

const GigMatchingWeights = mongoose.model('GigMatchingWeights', gigMatchingWeightsSchema);
export default GigMatchingWeights; 