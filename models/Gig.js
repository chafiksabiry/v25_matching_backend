import mongoose from 'mongoose';

const gigSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  industry: {
    type: String,
    required: true,
    enum: [
      'Technology',
      'Healthcare',
      'Finance',
      'Retail',
      'Manufacturing',
      'Education',
      'Real Estate',
      'Hospitality',
      'Automotive',
      'Entertainment'
    ]
  },
  requiredSkills: [{
    type: String,
    enum: [
      'Cold Calling',
      'Lead Generation',
      'Sales Closing',
      'Customer Service',
      'Product Demonstration',
      'Negotiation',
      'Relationship Building',
      'Technical Support',
      'Market Research',
      'Social Media Marketing'
    ]
  }],
  preferredLanguages: [{
    type: String,
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
  }],
  requiredExperience: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  expectedConversionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  compensation: {
    base: {
      type: Number,
      required: true
    },
    commission: {
      type: Number,
      required: true
    }
  },
  duration: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  timezone: {
    type: String,
    required: true
  },
  targetRegion: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  }
}, {
  timestamps: true
});

const Gig = mongoose.model('Gig', gigSchema);

export default Gig;