import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  name: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: false
  },
  founded: {
    type: String,
    required: false
  },
  headquarters: {
    type: String,
    required: false
  },
  overview: {
    type: String,
    required: false
  },
  companyIntro: {
    type: String,
    required: false
  },
  mission: {
    type: String,
    required: false
  },
  subscription: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  culture: {
    values: [String],
    benefits: [String],
    workEnvironment: String
  },
  opportunities: {
    roles: [String],
    growthPotential: String,
    training: String
  },
  technology: {
    stack: [String],
    innovation: String
  },
  contact: {
    email: String,
    phone: String,
    address: String,
    website: String
  },
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  },
  logo: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Indexes
companySchema.index({ name: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ userId: 1 });

const Company = mongoose.model('Company', companySchema);

export default Company;

