import mongoose from 'mongoose';

const industrySchema = new mongoose.Schema({
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
industrySchema.index({ category: 1 });
industrySchema.index({ isActive: 1 });

// Middleware pour mettre à jour lastUpdated
industrySchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const Industry = mongoose.model('Industry', industrySchema);

export default Industry;
