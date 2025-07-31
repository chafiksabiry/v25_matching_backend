import mongoose from 'mongoose';

const gigCriteriaSchema = new mongoose.Schema({
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true,
    index: true
  },
  criteriaCodes: {
    // Codes pour les compétences professionnelles
    professionalSkills: [{
      skillCode: { type: String, required: true },
      level: { type: Number, required: true },
      weight: { type: Number, default: 1 }
    }],
    // Codes pour les compétences techniques
    technicalSkills: [{
      skillCode: { type: String, required: true },
      level: { type: Number, required: true },
      weight: { type: Number, default: 1 }
    }],
    // Codes pour les compétences soft
    softSkills: [{
      skillCode: { type: String, required: true },
      level: { type: Number, required: true },
      weight: { type: Number, default: 1 }
    }],
    // Codes pour les langues
    languages: [{
      languageCode: { type: String, required: true },
      proficiency: { type: String, required: true },
      weight: { type: Number, default: 1 }
    }],
    // Codes pour les industries
    industries: [{
      industryCode: { type: String, required: true },
      weight: { type: Number, default: 1 }
    }],
    // Codes pour les activités
    activities: [{
      activityCode: { type: String, required: true },
      weight: { type: Number, default: 1 }
    }],
    // Code pour la destination
    destinationCode: {
      type: String,
      weight: { type: Number, default: 1 }
    },
    // Code pour le niveau de séniorité
    seniorityCode: {
      type: String,
      weight: { type: Number, default: 1 }
    }
  },
  // Métadonnées
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    version: { type: String, default: '1.0' },
    description: { type: String }
  }
}, { 
  timestamps: true,
  // Index pour optimiser les requêtes
  indexes: [
    { gigId: 1 },
    { 'criteriaCodes.professionalSkills.skillCode': 1 },
    { 'criteriaCodes.technicalSkills.skillCode': 1 },
    { 'criteriaCodes.softSkills.skillCode': 1 },
    { 'criteriaCodes.languages.languageCode': 1 },
    { 'criteriaCodes.industries.industryCode': 1 },
    { 'criteriaCodes.activities.activityCode': 1 }
  ]
});

// Middleware pour mettre à jour updatedAt
gigCriteriaSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Méthode pour obtenir tous les codes de critères
gigCriteriaSchema.methods.getAllCriteriaCodes = function() {
  const codes = {
    professionalSkills: this.criteriaCodes.professionalSkills.map(s => s.skillCode),
    technicalSkills: this.criteriaCodes.technicalSkills.map(s => s.skillCode),
    softSkills: this.criteriaCodes.softSkills.map(s => s.skillCode),
    languages: this.criteriaCodes.languages.map(l => l.languageCode),
    industries: this.criteriaCodes.industries.map(i => i.industryCode),
    activities: this.criteriaCodes.activities.map(a => a.activityCode),
    destination: this.criteriaCodes.destinationCode,
    seniority: this.criteriaCodes.seniorityCode
  };
  return codes;
};

// Méthode pour ajouter un critère
gigCriteriaSchema.methods.addCriteria = function(category, criteria) {
  if (this.criteriaCodes[category]) {
    this.criteriaCodes[category].push(criteria);
  }
  return this.save();
};

// Méthode pour supprimer un critère
gigCriteriaSchema.methods.removeCriteria = function(category, criteriaId) {
  if (this.criteriaCodes[category]) {
    this.criteriaCodes[category] = this.criteriaCodes[category].filter(
      item => item._id.toString() !== criteriaId
    );
  }
  return this.save();
};

const GigCriteria = mongoose.model('GigCriteria', gigCriteriaSchema);

export default GigCriteria; 