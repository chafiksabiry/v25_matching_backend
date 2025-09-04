import mongoose from 'mongoose';

const technicalSkillSchema = new mongoose.Schema({
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

// Index pour optimiser les recherches
technicalSkillSchema.index({ name: 1 });
technicalSkillSchema.index({ category: 1 });
technicalSkillSchema.index({ isActive: 1 });

// Middleware pour mettre à jour lastUpdated
technicalSkillSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const TechnicalSkill = mongoose.model('TechnicalSkill', technicalSkillSchema);

export default TechnicalSkill;
