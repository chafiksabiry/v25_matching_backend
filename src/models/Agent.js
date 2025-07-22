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
    type: String,
    required: true
  },
  level: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  }
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
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  experience: {
    type: Number,
    required: true
  },
  skills: {
    technical: [skillSchema],
    professional: [skillSchema],
    soft: [skillSchema],
    contactCenter: [contactCenterSkillSchema]
  },
  personalInfo: {
    name: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    photo: {
      type: String,
      required: true
    },
    languages: [{
      language: String,
      proficiency: String,
      iso639_1: String,
    }]
  },
  availability: {
    schedule: [scheduleSchema],
    timeZone: {
      type: String,
      required: true
    },
    flexibility: [{
      type: String,
      enum: ['Remote Work Available', 'Part-Time Options', 'Flexible Hours', 'Weekend Work']
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  professionalSummary: {
    industries: [String],
    activities: [String],
    yearsOfExperience: String
  },
  completionSteps: {
    basicInfo: { type: Boolean, default: false },
    experience: { type: Boolean, default: false },
    skills: { type: Boolean, default: false },
    languages: { type: Boolean, default: false },
    assessment: { type: Boolean, default: false },
  },
  assessments: {
    contactCenter: [contactCenterAssessmentSchema],
  },
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