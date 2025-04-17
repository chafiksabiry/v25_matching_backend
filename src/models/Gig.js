import mongoose from 'mongoose';

const gigSchema = new mongoose.Schema({
  title: { type: String, required: false },
  description: { type: String, required: false },
  category: { type: String, required: false },
  seniority: {
    level: { type: String, required: false },
    yearsExperience: { type: String, required: false },
  },
  skills: {
    professional: [{ type: String }],
    technical: [{ type: String }],
    soft: [{ type: String }],
    languages: [{
      name: { type: String, required: true },
      level: { type: String, required: true }
    }]
  },
  schedule: {
    days: [{ type: String }],
    hours: { type: String, required: false },
    timeZones: [{ type: String }],
    flexibility: [{ type: String }],
    minimumHours: {
      daily: Number,
      weekly: Number,
      monthly: Number,
    },
  },
  commission: {
    base: { type: String, required: false },
    baseAmount: { type: String, required: false },
    bonus: String,
    bonusAmount: String,
    structure: String,
    currency: { type: String, required: false },
    minimumVolume: {
      amount: { type: String, required: false },
      period: { type: String, required: false },
      unit: { type: String, required: false },
    },
    transactionCommission: {
      type: { type: String, required: false },
      amount: { type: String, required: false },
    },
  },
  leads: {
    types: [
      {
        type: { type: String, enum: ['hot', 'warm', 'cold'] },
        percentage: Number,
        description: String,
        conversionRate: Number,
      },
    ],
    sources: [{ type: String }],
  },
  team: {
    size: { type: String, required: false },
    structure: [
      {
        roleId: String,
        count: Number,
        seniority: {
          level: String,
          yearsExperience: String,
        },
      },
    ],
    territories: [{ type: String }],
  },
  documentation: {
    product: [
      {
        name: { type: String, required: false },
        url: { type: String, required: false },
      },
    ],
    process: [
      {
        name: { type: String, required: false },
        url: { type: String, required: false },
      },
    ],
    training: [
      {
        name: { type: String, required: false },
        url: { type: String, required: false },
      },
    ],
  },
}, { timestamps: true });

const Gig = mongoose.model('Gig', gigSchema);

export default Gig; 