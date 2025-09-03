import { Document, model, Schema } from 'mongoose';
import mongoose from 'mongoose';
import countries from 'i18n-iso-countries';
import frLocale from 'i18n-iso-countries/langs/fr.json' assert { type: 'json' };

// Initialiser les pays en français
countries.registerLocale(frLocale);

// Fonction de validation pour les codes pays alpha-2
const validateCountryCode = (value) => {
  return countries.isValid(value) && value.length === 2;
};

const GigSchema = new Schema(
  {
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
    activities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Activity', required: false }],
    industries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: false }],
  seniority: {
    level: { type: String, required: false },
    yearsExperience: { type: String, required: false },
  },
  skills: {
    professional: [{
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfessionalSkill', required: false },
        level: { type: Number, required: false },
      details: { type: String, required: false }
    }],
    technical: [{
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'TechnicalSkill', required: false },
        level: { type: Number, required: false },
      details: { type: String, required: false }
    }],
    soft: [{
        skill: { type: mongoose.Schema.Types.ObjectId, ref: 'SoftSkill', required: false },
        level: { type: Number, required: false },
      details: { type: String, required: false }
    }],
    languages: [{
        language: { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: false },
        proficiency: { type: String, required: false },
        iso639_1: { type: String, required: false }
      }]
    },
  availability: {
    schedule: [{
        day: { type: String, required: false },
      hours: {
          start: { type: String, required: false },
          end: { type: String, required: false }
      }
    }],
      time_zone: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeZone', required: false },
    flexibility: [{ type: String }],
    minimumHours: {
        daily: { type: Number, required: false },
        weekly: { type: Number, required: false },
        monthly: { type: Number, required: false }
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
      additionalDetails: { type: String, required: false },
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
    status: { 
      type: String, 
      enum: ['to_activate', 'active', 'inactive', 'archived'], 
      default: 'to_activate',
      required: true 
    },
    // Agents enrôlés dans ce gig
    enrolledAgents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent'
    }],
  },
  { timestamps: true }
);

// Méthode statique pour populate tous les champs de référence
GigSchema.statics.findWithPopulate = function(filter = {}) {
  return this.find(filter)
    .populate('activities', 'name description category')
    .populate('industries', 'name description sector')
    .populate('skills.professional.skill', 'name description category level')
    .populate('skills.technical.skill', 'name description category level')
    .populate('skills.soft.skill', 'name description category level')
    .populate('skills.languages.language', 'name nativeName iso639_1 iso639_2')
    .populate('availability.time_zone', 'name utcOffset abbreviation')
    .populate('enrolledAgents', 'personalInfo.name personalInfo.email personalInfo.country status')
    .populate({
      path: 'enrolledAgents',
      populate: {
        path: 'personalInfo.country',
        select: 'name code alpha2 alpha3'
      }
    });
};

// Méthode statique pour populate un gig spécifique par ID
GigSchema.statics.findByIdWithPopulate = function(id) {
  return this.findById(id)
    .populate('activities', 'name description category')
    .populate('industries', 'name description sector')
    .populate('skills.professional.skill', 'name description category level')
    .populate('skills.technical.skill', 'name description category level')
    .populate('skills.soft.skill', 'name description category level')
    .populate('skills.languages.language', 'name nativeName iso639_1 iso639_2')
    .populate('availability.time_zone', 'name utcOffset abbreviation')
    .populate('enrolledAgents', 'personalInfo.name personalInfo.email personalInfo.country status')
    .populate({
      path: 'enrolledAgents',
      populate: {
        path: 'personalInfo.country',
        select: 'name code alpha2 alpha3'
      }
    });
};

// Méthode statique pour populate seulement les skills
GigSchema.statics.findWithSkillsPopulate = function(filter = {}) {
  return this.find(filter)
    .populate('skills.professional.skill', 'name description category level')
    .populate('skills.technical.skill', 'name description category level')
    .populate('skills.soft.skill', 'name description category level')
    .populate('skills.languages.language', 'name nativeName iso639_1 iso639_2');
};

// Méthode statique pour populate seulement les agents
GigSchema.statics.findWithAgentsPopulate = function(filter = {}) {
  return this.find(filter)
    .populate({
      path: 'enrolledAgents',
      select: 'personalInfo.name personalInfo.email personalInfo.country personalInfo.languages status professionalSummary skills',
      populate: [
        {
          path: 'personalInfo.country',
          select: 'name code alpha2 alpha3'
        },
        {
          path: 'personalInfo.languages.language',
          select: 'name nativeName iso639_1 iso639_2'
        },
        {
          path: 'skills.technical.skill',
          select: 'name description category'
        },
        {
          path: 'skills.professional.skill',
          select: 'name description category'
        },
        {
          path: 'skills.soft.skill',
          select: 'name description category'
        }
      ]
    });
};

// Méthode statique pour populate industries et activities seulement
GigSchema.statics.findWithCategoriesPopulate = function(filter = {}) {
  return this.find(filter)
    .populate('activities', 'name description category')
    .populate('industries', 'name description sector');
};

export const Gig = model('Gig', GigSchema);