import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: false
  },
  category: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour optimiser les recherches (name déjà indexé via unique: true)
activitySchema.index({ category: 1 });
activitySchema.index({ isActive: 1 });

// Middleware pour mettre à jour lastUpdated
activitySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;
