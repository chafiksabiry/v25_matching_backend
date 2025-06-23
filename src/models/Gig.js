import mongoose from 'mongoose';
import countries from 'i18n-iso-countries';
import fr from 'i18n-iso-countries/langs/fr.json' assert { type: "json" };

// Initialiser les pays en français
countries.registerLocale(fr);

// Fonction de validation pour les codes pays alpha-2
const validateCountryCode = (value) => {
  return countries.isValid(value) && value.length === 2;
};

const gigSchema = new mongoose.Schema({
  title: { type: String, required: false },
  description: { type: String, required: false },
  category: { type: String, required: false },
  userId: { type: mongoose.Schema.Types.ObjectId, default: null },
  companyId: { type: mongoose.Schema.Types.ObjectId, default: null },
  destination_zone: { 
    type: String,
    validate: {
      validator: validateCountryCode,
      message: 'Le code pays doit être un code alpha-2 valide (ex: FR, US, DE)'
    }
  },
  seniority: {
    level: { type: String, required: false },
    yearsExperience: { type: String, required: false },
  },
  skills: {
    professional: [{
      skill: { type: String, required: true },
      level: { type: Number, required: true },
      details: { type: String, required: false }
    }],
    technical: [{
      skill: { type: String, required: true },
      level: { type: Number, required: true },
      details: { type: String, required: false }
    }],
    soft: [{
      skill: { type: String, required: true },
      level: { type: Number, required: true },
      details: { type: String, required: false }
    }],
    languages: [{
      language: { type: String, required: true },
      proficiency: { type: String, required: true },
      iso639_1: { type: String, required: true }
    }]
  },
  availability: {
    schedule: [{
      day: { type: String, required: true },
      hours: {
        start: { type: String, required: true },
        end: { type: String, required: true }
      }
    }],
    timeZone: { type: String, required: true },
    flexibility: [{ type: String }],
    minimumHours: {
      daily: { type: Number },
      weekly: { type: Number },
      monthly: { type: Number }
    }
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