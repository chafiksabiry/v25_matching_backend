import { Rep, Gig, Skill, Industry, Language } from '../types';

export const mockReps: Rep[] = [
  {
    id: "rep1",
    name: "Alex Johnson",
    experience: 8,
    skills: [Skill.ColdCalling, Skill.SalesClosing, Skill.Negotiation],
    industries: [Industry.Technology, Industry.Finance],
    languages: [Language.English, Language.Spanish],
    availability: [
      { day: "Monday", startTime: "09:00", endTime: "17:00" },
      { day: "Tuesday", startTime: "09:00", endTime: "17:00" },
      { day: "Wednesday", startTime: "09:00", endTime: "17:00" },
      { day: "Thursday", startTime: "09:00", endTime: "17:00" },
      { day: "Friday", startTime: "09:00", endTime: "17:00" },
    ],
    timezone: "America/New_York",
    conversionRate: 0.35,
    reliability: 9,
    rating: 4.8,
    completedGigs: 47,
    region: "North America"
  },
  {
    id: "rep2",
    name: "Samantha Lee",
    experience: 5,
    skills: [Skill.LeadGeneration, Skill.CustomerService, Skill.RelationshipBuilding],
    industries: [Industry.Healthcare, Industry.Education],
    languages: [Language.English, Language.Mandarin],
    availability: [
      { day: "Monday", startTime: "10:00", endTime: "18:00" },
      { day: "Wednesday", startTime: "10:00", endTime: "18:00" },
      { day: "Friday", startTime: "10:00", endTime: "18:00" },
    ],
    timezone: "America/Los_Angeles",
    conversionRate: 0.28,
    reliability: 8,
    rating: 4.5,
    completedGigs: 23,
    region: "North America"
  },
  {
    id: "rep3",
    name: "Marcus Williams",
    experience: 10,
    skills: [Skill.SalesClosing, Skill.Negotiation, Skill.ProductDemonstration],
    industries: [Industry.Technology, Industry.Automotive, Industry.Manufacturing],
    languages: [Language.English, Language.German],
    availability: [
      { day: "Monday", startTime: "08:00", endTime: "16:00" },
      { day: "Tuesday", startTime: "08:00", endTime: "16:00" },
      { day: "Wednesday", startTime: "08:00", endTime: "16:00" },
      { day: "Thursday", startTime: "08:00", endTime: "16:00" },
      { day: "Friday", startTime: "08:00", endTime: "16:00" },
    ],
    timezone: "Europe/Berlin",
    conversionRate: 0.42,
    reliability: 10,
    rating: 4.9,
    completedGigs: 89,
    region: "Europe"
  },
  {
    id: "rep4",
    name: "Priya Patel",
    experience: 3,
    skills: [Skill.CustomerService, Skill.MarketResearch, Skill.SocialMediaMarketing],
    industries: [Industry.Retail, Industry.Hospitality],
    languages: [Language.English, Language.Hindi],
    availability: [
      { day: "Tuesday", startTime: "12:00", endTime: "20:00" },
      { day: "Wednesday", startTime: "12:00", endTime: "20:00" },
      { day: "Thursday", startTime: "12:00", endTime: "20:00" },
      { day: "Saturday", startTime: "10:00", endTime: "18:00" },
    ],
    timezone: "Asia/Kolkata",
    conversionRate: 0.22,
    reliability: 7,
    rating: 4.2,
    completedGigs: 15,
    region: "Asia"
  },
  {
    id: "rep5",
    name: "Jean Dupont",
    experience: 7,
    skills: [Skill.ColdCalling, Skill.LeadGeneration, Skill.RelationshipBuilding],
    industries: [Industry.Finance, Industry.RealEstate],
    languages: [Language.French, Language.English],
    availability: [
      { day: "Monday", startTime: "09:00", endTime: "17:00" },
      { day: "Tuesday", startTime: "09:00", endTime: "17:00" },
      { day: "Thursday", startTime: "09:00", endTime: "17:00" },
      { day: "Friday", startTime: "09:00", endTime: "17:00" },
    ],
    timezone: "Europe/Paris",
    conversionRate: 0.31,
    reliability: 8,
    rating: 4.6,
    completedGigs: 38,
    region: "Europe"
  },
  {
    id: "rep6",
    name: "Carlos Rodriguez",
    experience: 6,
    skills: [Skill.SalesClosing, Skill.Negotiation, Skill.TechnicalSupport],
    industries: [Industry.Technology, Industry.Telecommunications],
    languages: [Language.Spanish, Language.English, Language.Portuguese],
    availability: [
      { day: "Monday", startTime: "10:00", endTime: "18:00" },
      { day: "Tuesday", startTime: "10:00", endTime: "18:00" },
      { day: "Wednesday", startTime: "10:00", endTime: "18:00" },
      { day: "Thursday", startTime: "10:00", endTime: "18:00" },
      { day: "Friday", startTime: "10:00", endTime: "18:00" },
    ],
    timezone: "America/Mexico_City",
    conversionRate: 0.33,
    reliability: 9,
    rating: 4.7,
    completedGigs: 42,
    region: "Latin America"
  }
];

export const mockGigs: Gig[] = [
  {
    id: "gig1",
    companyId: "comp1",
    companyName: "TechNova Solutions",
    title: "Enterprise SaaS Sales Campaign",
    description: "Looking for experienced reps to promote our new cloud-based project management solution to enterprise clients.",
    industry: Industry.Technology,
    requiredSkills: [Skill.ColdCalling, Skill.SalesClosing, Skill.ProductDemonstration],
    preferredLanguages: [Language.English],
    requiredExperience: 7,
    expectedConversionRate: 0.3,
    compensation: {
      base: 25,
      commission: 100
    },
    duration: {
      startDate: "2025-06-01",
      endDate: "2025-06-30"
    },
    timezone: "America/New_York",
    targetRegion: "North America"
  },
  {
    id: "gig2",
    companyId: "comp2",
    companyName: "MediCare Plus",
    title: "Healthcare Provider Outreach",
    description: "Seeking reps to connect with healthcare providers about our new patient management platform.",
    industry: Industry.Healthcare,
    requiredSkills: [Skill.LeadGeneration, Skill.RelationshipBuilding],
    preferredLanguages: [Language.English, Language.Spanish],
    requiredExperience: 4,
    expectedConversionRate: 0.25,
    compensation: {
      base: 20,
      commission: 75
    },
    duration: {
      startDate: "2025-06-15",
      endDate: "2025-07-15"
    },
    timezone: "America/Chicago",
    targetRegion: "North America"
  },
  {
    id: "gig3",
    companyId: "comp3",
    companyName: "AutoTech Innovations",
    title: "Automotive Software Demo Campaign",
    description: "Need technical sales reps to demonstrate our new diagnostic software to auto repair shops and dealerships.",
    industry: Industry.Automotive,
    requiredSkills: [Skill.ProductDemonstration, Skill.TechnicalSupport, Skill.SalesClosing],
    preferredLanguages: [Language.German, Language.English],
    requiredExperience: 6,
    expectedConversionRate: 0.35,
    compensation: {
      base: 30,
      commission: 120
    },
    duration: {
      startDate: "2025-06-01",
      endDate: "2025-07-31"
    },
    timezone: "Europe/Berlin",
    targetRegion: "Europe"
  },
  {
    id: "gig4",
    companyId: "comp4",
    companyName: "Global Hospitality Group",
    title: "Hotel Management System Sales",
    description: "Seeking reps to promote our all-in-one hotel management system to independent hotels and small chains.",
    industry: Industry.Hospitality,
    requiredSkills: [Skill.ColdCalling, Skill.LeadGeneration, Skill.CustomerService],
    preferredLanguages: [Language.English, Language.Mandarin, Language.Hindi],
    requiredExperience: 3,
    expectedConversionRate: 0.2,
    compensation: {
      base: 18,
      commission: 80
    },
    duration: {
      startDate: "2025-06-10",
      endDate: "2025-08-10"
    },
    timezone: "Asia/Singapore",
    targetRegion: "Asia"
  },
  {
    id: "gig5",
    companyId: "comp5",
    companyName: "FinSecure Banking",
    title: "Financial Services Outreach",
    description: "Looking for experienced reps to promote our premium banking services to high-net-worth individuals.",
    industry: Industry.Finance,
    requiredSkills: [Skill.RelationshipBuilding, Skill.Negotiation],
    preferredLanguages: [Language.French, Language.English],
    requiredExperience: 8,
    expectedConversionRate: 0.15,
    compensation: {
      base: 35,
      commission: 200
    },
    duration: {
      startDate: "2025-07-01",
      endDate: "2025-08-31"
    },
    timezone: "Europe/Paris",
    targetRegion: "Europe"
  }
];

export const defaultMatchingWeights = {
  experience: 0.15,
  skills: 0.20,
  industry: 0.15,
  language: 0.10,
  availability: 0.10,
  timezone: 0.05,
  performance: 0.20,
  region: 0.05
};