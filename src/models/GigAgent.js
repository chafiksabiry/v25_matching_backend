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
    languageMatch: {
      score: Number,
      details: {
        matchingLanguages: [{
          language: String,
          requiredLevel: String,
          agentLevel: String
        }],
        missingLanguages: [String],
        insufficientLanguages: [{
          language: String,
          requiredLevel: String,
          agentLevel: String
        }],
        matchStatus: {
          type: String,
          enum: ['perfect_match', 'partial_match', 'no_match']
        }
      }
    },
    skillsMatch: {
      details: {
        matchingSkills: [{
          skill: String,
          requiredLevel: Number,
          agentLevel: Number,
          type: String
        }],
        missingSkills: [{
          skill: String,
          type: String
        }],
        insufficientSkills: [{
          skill: String,
          requiredLevel: Number,
          agentLevel: Number,
          type: String
        }],
        matchStatus: {
          type: String,
          enum: ['perfect_match', 'partial_match', 'no_match']
        }
      }
    },
    scheduleMatch: {
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
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  agentResponse: {
    type: String,
    enum: ['accepted', 'rejected', 'pending'],
    default: 'pending'
  },
  agentResponseAt: {
    type: Date
  },
  notes: {
    type: String
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

const GigAgent = mongoose.model('GigAgent', gigAgentSchema);

export default GigAgent; 