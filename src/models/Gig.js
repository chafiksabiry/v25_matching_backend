import { model, Schema } from 'mongoose';
import mongoose from 'mongoose';

const GigSchema = new Schema(
  {
    title: { type: String, required: false },
    description: { type: String, required: false },
    category: { type: String, required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    destination_zone: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Country', 
      required: false 
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
      time_zone: { type: mongoose.Schema.Types.ObjectId, ref: 'Timezone', required: false },
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
      currency: { type: mongoose.Schema.Types.ObjectId, ref: 'Currency', required: false },
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
      territories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: false }],
    },
    highlights: [{ type: String, required: false }],
    deliverables: [{ type: String, required: false }],
    // 🆕 Agents tracking with status
    agents: [{
      agentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agent',
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
    status: { 
      type: String, 
      enum: ['to_activate', 'active', 'inactive', 'archived'], 
      default: 'to_activate',
      required: true 
    },
  },
  { timestamps: true }
);


const Gig = model('Gig', GigSchema);

export default Gig;
export { GigSchema };