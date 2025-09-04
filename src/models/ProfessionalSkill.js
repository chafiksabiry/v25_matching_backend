import mongoose from 'mongoose';

const professionalSkillSchema = new mongoose.Schema({
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
professionalSkillSchema.index({ name: 1 });
professionalSkillSchema.index({ category: 1 });
professionalSkillSchema.index({ isActive: 1 });

// Middleware pour mettre à jour lastUpdated
professionalSkillSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const ProfessionalSkill = mongoose.model('ProfessionalSkill', professionalSkillSchema);

export default ProfessionalSkill;
