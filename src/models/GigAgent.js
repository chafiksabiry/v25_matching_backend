import mongoose from 'mongoose';

const gigAgentSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  gigId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gig',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  matchScore: {
    type: Number,
    min: 0,
    max: 1,
    required: true
  },
  matchDetails: {
    // Language matching
    languageMatch: {
      score: Number,
      details: {
        matchingLanguages: [{
          language: String,
          languageName: String,
          requiredLevel: String,
          agentLevel: String
        }],
        missingLanguages: [{
          language: String,
          languageName: String,
          requiredLevel: String
        }],
        insufficientLanguages: [{
          language: String,
          languageName: String,
          requiredLevel: String,
          agentLevel: String
        }],
        matchStatus: {
          type: String,
          enum: ['perfect_match', 'partial_match', 'no_match']
        }
      }
    },
    // Skills matching
    skillsMatch: {
      score: Number,
      details: {
        matchingSkills: [{
          skill: String,
          skillName: String,
          requiredLevel: Number,
          agentLevel: Number,
          type: {
            type: String,
            enum: ['technical', 'professional', 'soft', 'contactCenter']
          }
        }],
        missingSkills: [{
          skill: String,
          skillName: String,
          type: {
            type: String,
            enum: ['technical', 'professional', 'soft', 'contactCenter']
          },
          requiredLevel: Number
        }],
        insufficientSkills: [{
          skill: String,
          skillName: String,
          requiredLevel: Number,
          agentLevel: Number,
          type: {
            type: String,
            enum: ['technical', 'professional', 'soft', 'contactCenter']
          }
        }],
        matchStatus: {
          type: String,
          enum: ['perfect_match', 'partial_match', 'no_match']
        }
      }
    },
    // Industry matching
    industryMatch: {
      score: Number,
      details: {
        matchingIndustries: [{
          industry: String,
          industryName: String,
          agentIndustryName: String
        }],
        missingIndustries: [{
          industry: String,
          industryName: String
        }],
        matchStatus: {
          type: String,
          enum: ['perfect_match', 'partial_match', 'no_match', 'neutral_match']
        }
      }
    },
    // Activity matching
    activityMatch: {
      score: Number,
      details: {
        matchingActivities: [{
          activity: String,
          activityName: String,
          agentActivityName: String
        }],
        missingActivities: [{
          activity: String,
          activityName: String
        }],
        matchStatus: {
          type: String,
          enum: ['perfect_match', 'partial_match', 'no_match', 'neutral_match']
        }
      }
    },
    // Experience matching
    experienceMatch: {
      score: Number,
      details: {
        gigRequiredExperience: Number,
        agentExperience: Number,
        difference: Number,
        reason: String
      },
      matchStatus: {
        type: String,
        enum: ['perfect_match', 'partial_match', 'no_match']
      }
    },
    // Timezone matching
    timezoneMatch: {
      score: Number,
      details: {
        gigTimezone: String,
        agentTimezone: String,
        gigGmtOffset: Number,
        agentGmtOffset: Number,
        gmtOffsetDifference: Number,
        reason: String
      },
      matchStatus: {
        type: String,
        enum: ['perfect_match', 'partial_match', 'no_match']
      }
    },
    // Region matching
    regionMatch: {
      score: Number,
      details: {
        gigDestinationZone: String,
        agentCountryCode: String,
        reason: String
      },
      matchStatus: {
        type: String,
        enum: ['perfect_match', 'partial_match', 'no_match']
      }
    },
    // Availability/Schedule matching
    availabilityMatch: {
      score: Number,
      details: {
        matchingDays: [{
          day: String,
          gigHours: {
            start: String,
            end: String
          },
          agentHours: {
            start: String,
            end: String
          }
        }],
        missingDays: [String],
        insufficientHours: [{
          day: String,
          gigHours: {
            start: String,
            end: String
          },
          agentHours: {
            start: String,
            end: String
          }
        }]
      },
      matchStatus: {
        type: String,
        enum: ['perfect_match', 'partial_match', 'no_match']
      }
    }
  },
  // Global match status
  matchStatus: {
    type: String,
    enum: ['perfect_match', 'partial_match', 'no_match'],
    required: true
  },
  // Email tracking
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  // Agent response tracking
  agentResponse: {
    type: String,
    enum: ['accepted', 'rejected', 'pending'],
    default: 'pending'
  },
  agentResponseAt: {
    type: Date
  },
  // Additional fields
  notes: {
    type: String
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  deadline: {
    type: Date
  },
  // Matching weights used for this assignment
  matchingWeights: {
    experience: { type: Number, default: 0.20 },
    skills: { type: Number, default: 0.20 },
    industry: { type: Number, default: 0.20 },
    languages: { type: Number, default: 0.15 },
    availability: { type: Number, default: 0.10 },
    timezone: { type: Number, default: 0.15 },
    activities: { type: Number, default: 0.0 },
    region: { type: Number, default: 0.0 }
  }
}, {
  timestamps: true
});

// Ensure an agent can only have one active gig assignment
gigAgentSchema.index({ agentId: 1, gigId: 1 }, { unique: true });

// Add methods to the schema
gigAgentSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'accepted' || newStatus === 'rejected') {
    this.agentResponse = newStatus;
    this.agentResponseAt = new Date();
  }
  return this.save();
};

gigAgentSchema.methods.markEmailSent = function() {
  this.emailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

// Method to calculate overall match status based on individual matches
gigAgentSchema.methods.calculateMatchStatus = function() {
  const matches = [
    this.matchDetails.languageMatch?.details?.matchStatus,
    this.matchDetails.skillsMatch?.details?.matchStatus,
    this.matchDetails.industryMatch?.details?.matchStatus,
    this.matchDetails.activityMatch?.details?.matchStatus,
    this.matchDetails.experienceMatch?.matchStatus,
    this.matchDetails.timezoneMatch?.matchStatus,
    this.matchDetails.regionMatch?.matchStatus,
    this.matchDetails.availabilityMatch?.matchStatus
  ].filter(Boolean);

  if (matches.length === 0) {
    this.matchStatus = 'no_match';
    return this.matchStatus;
  }

  const perfectMatches = matches.filter(m => m === 'perfect_match').length;
  const partialMatches = matches.filter(m => m === 'partial_match').length;
  const totalMatches = matches.length;

  if (perfectMatches === totalMatches) {
    this.matchStatus = 'perfect_match';
  } else if (perfectMatches > 0 || partialMatches > 0) {
    this.matchStatus = 'partial_match';
  } else {
    this.matchStatus = 'no_match';
  }

  return this.matchStatus;
};

// Method to get detailed match summary
gigAgentSchema.methods.getMatchSummary = function() {
  return {
    overallScore: this.matchScore,
    overallStatus: this.matchStatus,
    details: {
      language: {
        score: this.matchDetails.languageMatch?.score || 0,
        status: this.matchDetails.languageMatch?.details?.matchStatus || 'no_match'
      },
      skills: {
        score: this.matchDetails.skillsMatch?.score || 0,
        status: this.matchDetails.skillsMatch?.details?.matchStatus || 'no_match'
      },
      industry: {
        score: this.matchDetails.industryMatch?.score || 0,
        status: this.matchDetails.industryMatch?.details?.matchStatus || 'no_match'
      },
      activity: {
        score: this.matchDetails.activityMatch?.score || 0,
        status: this.matchDetails.activityMatch?.details?.matchStatus || 'no_match'
      },
      experience: {
        score: this.matchDetails.experienceMatch?.score || 0,
        status: this.matchDetails.experienceMatch?.matchStatus || 'no_match'
      },
      timezone: {
        score: this.matchDetails.timezoneMatch?.score || 0,
        status: this.matchDetails.timezoneMatch?.matchStatus || 'no_match'
      },
      region: {
        score: this.matchDetails.regionMatch?.score || 0,
        status: this.matchDetails.regionMatch?.matchStatus || 'no_match'
      },
      availability: {
        score: this.matchDetails.availabilityMatch?.score || 0,
        status: this.matchDetails.availabilityMatch?.matchStatus || 'no_match'
      }
    }
  };
};

const GigAgent = mongoose.model('GigAgent', gigAgentSchema);

export default GigAgent; 