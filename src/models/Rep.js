import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
});

const repSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    type: Number,
    required: true,
    min: 0,
    max: 10
  },
  skills: [{
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
  industries: [{
    type: String,
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
  }],
  languages: [{
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
  availability: [availabilitySchema],
  timezone: {
    type: String,
    required: true
  },
  conversionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  reliability: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  completedGigs: {
    type: Number,
    required: true,
    default: 0
  },
  region: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

const Rep = mongoose.model('Rep', repSchema);

export default Rep;