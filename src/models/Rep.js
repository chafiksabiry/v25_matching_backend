import mongoose from 'mongoose';

// Schéma pour les langues
const languageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: [
      'English',
      'Spanish',
      'French',
      'German',
      'Mandarin',
      'Japanese',
      'Portuguese',
      'Arabic',
      'Hindi',
      'Russian'
    ]
  },
  proficiency: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Native']
  },
  assessmentResults: {
    score: Number,
    date: Date,
    certificate: String
  }
});

// Schéma pour les compétences
const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  level: {
    type: String,
    required: true,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
  },
  yearsOfExperience: Number,
  verified: {
    type: Boolean,
    default: false
  }
});

// Schéma pour les réalisations
const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  date: Date,
  metrics: {
    type: Map,
    of: Number
  },
  verified: {
    type: Boolean,
    default: false
  }
});

// Schéma pour l'expérience
const experienceSchema = new mongoose.Schema({
  company: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: Date,
  current: {
    type: Boolean,
    default: false
  },
  description: String,
  achievements: [String],
  skills: [String],
  verified: {
    type: Boolean,
    default: false
  }
});

// Schéma pour les évaluations du centre de contact
const contactCenterAssessmentSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  category: {
    type: String,
    required: true,
    enum: ['Communication', 'Problem Solving', 'Customer Service', 'Technical Knowledge']
  },
  feedback: String,
  evaluator: String
});

// Sous-schéma pour la disponibilité
const availabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
});

// Schéma principal des représentants (Reps)
const repSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["draft", "in_progress", "completed"],
      default: "draft",
    },

    completionSteps: {
      basicInfo: { type: Boolean, default: false },
      experience: { type: Boolean, default: false },
      skills: { type: Boolean, default: false },
      languages: { type: Boolean, default: false },
      assessment: { type: Boolean, default: false },
    },

    personalInfo: {
      name: String,
      location: String,
      email: String,
      phone: String,
      languages: [languageSchema],
    },

    professionalSummary: {
      yearsOfExperience: String,
      currentRole: String,
      industries: [String],
      keyExpertise: [String],
      notableCompanies: [String],
      generatedSummary: String,
    },

    skills: {
      technical: [skillSchema],
      professional: [skillSchema],
      soft: [skillSchema],
    },

    achievements: [achievementSchema],

    experience: [experienceSchema],

    assessments: {
      contactCenter: [contactCenterAssessmentSchema],
    },

    // Champs spécifiques aux reps
    availability: [availabilitySchema],
    timezone: {
      type: String,
      required: true,
    },

    conversionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },

    reliability: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    completedGigs: {
      type: Number,
      required: true,
      default: 0,
    },

    region: {
      type: String,
      required: true,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Middleware pour mettre à jour lastUpdated à chaque enregistrement
repSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

// Méthode pour mettre à jour le statut de complétion
repSchema.methods.updateCompletionStatus = function () {
  const steps = this.completionSteps;

  steps.basicInfo = !!(this.personalInfo.name && this.personalInfo.email);
  steps.experience = this.experience.length > 0;
  steps.skills = !!(
    this.skills.technical.length ||
    this.skills.professional.length ||
    this.skills.soft.length
  );
  steps.languages = this.personalInfo.languages.length > 0;

  steps.assessment =
    this.personalInfo.languages.some((lang) => lang.assessmentResults) ||
    this.assessments.contactCenter.length > 0;

  const completedSteps = Object.values(steps).filter(Boolean).length;

  if (completedSteps === 0) {
    this.status = "draft";
  } else if (completedSteps === Object.keys(steps).length) {
    this.status = "completed";
  } else {
    this.status = "in_progress";
  }
};

const Rep = mongoose.model("Rep", repSchema);

export default Rep;
