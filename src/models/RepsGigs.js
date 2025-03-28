import mongoose from 'mongoose';

const repsGigsSchema = new mongoose.Schema({
  // Références principales
  repId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rep',
    required: true
  },
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },

  // Statut de la candidature
  status: {
    type: String,
    enum: [
      'pending',           // En attente d'évaluation
      'matched',          // Match trouvé
      'interview_scheduled', // Entretien programmé
      'interviewed',      // Entretien effectué
      'accepted',         // Accepté par le rep
      'rejected',         // Rejeté
      'completed',        // Mission terminée
      'cancelled'         // Annulé
    ],
    default: 'pending'
  },

  // Métriques de matching
  matchingScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  matchingDetails: {
    skillsMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    experienceMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    languageMatch: {
      type: Number,
      min: 0,
      max: 100
    },
    timezoneMatch: {
      type: Boolean
    },
    regionMatch: {
      type: Boolean
    }
  },

  // Suivi de la candidature
  applicationDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  interviewDate: Date,
  startDate: Date,
  endDate: Date,

  // Évaluations et feedback
  evaluations: {
    repEvaluation: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String,
      date: Date
    },
    companyEvaluation: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      feedback: String,
      date: Date
    }
  },

  // Métriques de performance
  performance: {
    conversionRate: Number,
    completedTasks: Number,
    totalTasks: Number,
    reliability: Number
  },

  // Notes et commentaires
  notes: [{
    content: String,
    createdBy: {
      type: String,
      enum: ['system', 'rep', 'company']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index composé pour éviter les doublons
repsGigsSchema.index({ repId: 1, gigId: 1 }, { unique: true });

// Middleware pour mettre à jour lastUpdated
repsGigsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const RepsGigs = mongoose.model('RepsGigs', repsGigsSchema);

export default RepsGigs; 