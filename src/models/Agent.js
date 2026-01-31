import mongoose from 'mongoose';

// Schema for languages
const languageSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true
  },
  proficiency: {
    type: String,
    required: true
  }
});

// Schema for skills
const skillSchema = new mongoose.Schema({
  skill: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 0,
    max: 5
  },
  details: String
});

// Schema for contact center skills
const contactCenterSkillSchema = new mongoose.Schema({
  skill: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Problem Solving', 'Communication', 'Customer Service', 'Technical Knowledge']
  },
  proficiency: {
    type: String,
    required: true,
    enum: ['Novice', 'Intermediate', 'Advanced', 'Expert']
  },
  assessmentResults: {
    score: Number,
    strengths: [String],
    improvements: [String],
    feedback: String,
    tips: [String],
    keyMetrics: {
      professionalism: Number,
      effectiveness: Number,
      customerFocus: Number
    },
    completedAt: Date
  }
});

// Schema for achievements
const achievementSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  impact: String,
  context: String,
  skills: [String]
});

// Schema for experience
const experienceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  startDate: String,
  endDate: String,
  responsibilities: [String],
  achievements: [String]
});

// Schema for contact center assessments
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

// Schema for schedule hours
const scheduleHoursSchema = new mongoose.Schema({
  start: {
    type: String,
    required: true
  },
  end: {
    type: String,
    required: true
  }
});

// Schema for schedule
const scheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  hours: {
    type: scheduleHoursSchema,
    required: true
  }
});

// Main Agent schema
const agentSchema = new mongoose.Schema({
  // Nouveaux champs en premier (comme dans vos données)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  plan: {
    type: String,
    required: false,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive'],
    default: 'draft'
  },
  isBasicProfileCompleted: {
    type: Boolean,
    default: false
  },
  onboardingProgress: {
    phases: {
      phase1: {
        requiredActions: {
          accountCreated: { type: Boolean, default: false },
          emailVerified: { type: Boolean, default: false }
        },
        optionalActions: {
          locationConfirmed: { type: Boolean, default: false },
          identityVerified: { type: Boolean, default: false },
          twoFactorEnabled: { type: Boolean, default: false }
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'completed'],
          default: 'not_started'
        },
        completedAt: Date
      },
      phase2: {
        requiredActions: {
          experienceAdded: { type: Boolean, default: false },
          skillsAdded: { type: Boolean, default: false },
          industriesAdded: { type: Boolean, default: false },
          activitiesAdded: { type: Boolean, default: false },
          availabilitySet: { type: Boolean, default: false },
          videoUploaded: { type: Boolean, default: false }
        },
        optionalActions: {
          photoUploaded: { type: Boolean, default: false },
          bioCompleted: { type: Boolean, default: false }
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'completed'],
          default: 'not_started'
        },
        completedAt: Date
      },
      phase3: {
        requiredActions: {
          languageAssessmentDone: { type: Boolean, default: false },
          contactCenterAssessmentDone: { type: Boolean, default: false }
        },
        optionalActions: {
          technicalEvaluationDone: { type: Boolean, default: false },
          bestPracticesReviewed: { type: Boolean, default: false }
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'completed'],
          default: 'not_started'
        },
        completedAt: Date
      },
      phase4: {
        requiredActions: {
          subscriptionActivated: { type: Boolean, default: false }
        },
        status: {
          type: String,
          enum: ['not_started', 'in_progress', 'completed'],
          default: 'not_started'
        },
        completedAt: Date
      }
    },
    currentPhase: {
      type: Number,
      default: 1
    },
    lastUpdated: Date
  },
  // Availability en haut (comme dans vos données)
  availability: {
    schedule: [scheduleSchema],
    timeZone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timezone',
      required: false,
      default: null
    },
    flexibility: [{
      type: String,
      enum: ['Remote Work Available', 'Part-Time Options', 'Flexible Hours', 'Weekend Work']
    }]
  },
  // Skills (comme dans vos données)
  skills: {
    technical: [skillSchema],
    professional: [skillSchema],
    soft: [skillSchema],
    contactCenter: [contactCenterSkillSchema]
  },
  personalInfo: {
    name: {
      type: String,
      required: false
    },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Country',
      required: false
    },
    email: {
      type: String,
      required: false
    },
    phone: {
      type: String,
      required: false
    },
    profilePicture: {
      type: String,
      required: false
    },
    photo: {
      url: String,
      publicId: String
    },
    languages: [{
      language: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Language',
        required: false
      },
      proficiency: String,
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        auto: true
      }
    }],
    presentationVideo: {
      recordedAt: {
        type: Date,
        required: false
      }
    }
  },
  professionalSummary: {
    yearsOfExperience: {
      type: Number,
      required: false
    },
    currentRole: {
      type: String,
      required: false
    },
    industries: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Industry'
    }],
    activities: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity'
    }],
    keyExpertise: [{
      type: String
    }],
    notableCompanies: [{
      type: String
    }],
    profileDescription: {
      type: String,
      required: false
    }
  },

  // Experience array (comme dans vos données)
  experience: [experienceSchema],
  favoriteGigs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig'
  }],
  // 🆕 Gigs tracking with status
  gigs: [{
    gigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gig',
      required: true
    },
    gigAgentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GigAgent',
      required: false
    },
    status: {
      type: String,
      enum: ['invited', 'requested', 'enrolled', 'rejected', 'expired', 'cancelled'],
      required: true
    },
    enrollmentDate: Date,
    invitationDate: Date,
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  achievements: [achievementSchema],
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// Middleware to update lastUpdated on save
agentSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

// Method to update completion status
agentSchema.methods.updateCompletionStatus = function () {
  const steps = this.completionSteps;

  steps.basicInfo = !!(this.firstName && this.lastName && this.email);
  steps.experience = this.experience > 0;
  steps.skills = this.skills.length > 0;
  steps.languages = this.personalInfo.languages.length > 0;

  steps.assessment =
    this.personalInfo.languages.some((lang) => lang.assessmentResults) ||
    this.assessments.contactCenter.length > 0;

  const completedSteps = Object.values(steps).filter(Boolean).length;

  if (completedSteps === 0) {
    this.status = "inactive";
  } else if (completedSteps === Object.keys(steps).length) {
    this.status = "active";
  } else {
    this.status = "inactive";
  }
};

const Agent = mongoose.model('Agent', agentSchema);

export default Agent; 