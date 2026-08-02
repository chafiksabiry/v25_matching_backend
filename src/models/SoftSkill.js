import mongoose from 'mongoose';

const softSkillSchema = new mongoose.Schema({
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
softSkillSchema.index({ category: 1 });
softSkillSchema.index({ isActive: 1 });

// Middleware pour mettre à jour lastUpdated
softSkillSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const SoftSkill = mongoose.model('SoftSkill', softSkillSchema);

export default SoftSkill;
