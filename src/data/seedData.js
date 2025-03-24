import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Rep from '../models/Rep.js';
import Gig from '../models/Gig.js';

// Load environment variables
dotenv.config();

// Sample data for reps
const reps = [
  {
    name: "Alex Johnson",
    experience: 8,
    skills: ["Cold Calling", "Sales Closing", "Negotiation"],
    industries: ["Technology", "Finance"],
    languages: ["English", "Spanish"],
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
    name: "Samantha Lee",
    experience: 5,
    skills: ["Lead Generation", "Customer Service", "Relationship Building"],
    industries: ["Healthcare", "Education"],
    languages: ["English", "Mandarin"],
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
    name: "Marcus Williams",
    experience: 10,
    skills: ["Sales Closing", "Negotiation", "Product Demonstration"],
    industries: ["Technology", "Automotive", "Manufacturing"],
    languages: ["English", "German"],
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
  }
];

// Sample data for gigs
const gigs = [
  {
    companyId: "comp1",
    companyName: "TechNova Solutions",
    title: "Enterprise SaaS Sales Campaign",
    description: "Looking for experienced reps to promote our new cloud-based project management solution to enterprise clients.",
    industry: "Technology",
    requiredSkills: ["Cold Calling", "Sales Closing", "Product Demonstration"],
    preferredLanguages: ["English"],
    requiredExperience: 7,
    expectedConversionRate: 0.3,
    compensation: {
      base: 25,
      commission: 100
    },
    duration: {
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-06-30")
    },
    timezone: "America/New_York",
    targetRegion: "North America"
  },
  {
    companyId: "comp2",
    companyName: "MediCare Plus",
    title: "Healthcare Provider Outreach",
    description: "Seeking reps to connect with healthcare providers about our new patient management platform.",
    industry: "Healthcare",
    requiredSkills: ["Lead Generation", "Relationship Building"],
    preferredLanguages: ["English", "Spanish"],
    requiredExperience: 4,
    expectedConversionRate: 0.25,
    compensation: {
      base: 20,
      commission: 75
    },
    duration: {
      startDate: new Date("2025-06-15"),
      endDate: new Date("2025-07-15")
    },
    timezone: "America/Chicago",
    targetRegion: "North America"
  },
  {
    companyId: "comp3",
    companyName: "AutoTech Innovations",
    title: "Automotive Software Demo Campaign",
    description: "Need technical sales reps to demonstrate our new diagnostic software to auto repair shops and dealerships.",
    industry: "Automotive",
    requiredSkills: ["Product Demonstration", "Technical Support", "Sales Closing"],
    preferredLanguages: ["German", "English"],
    requiredExperience: 6,
    expectedConversionRate: 0.35,
    compensation: {
      base: 30,
      commission: 120
    },
    duration: {
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-07-31")
    },
    timezone: "Europe/Berlin",
    targetRegion: "Europe"
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Clear existing data
      await Rep.deleteMany({});
      await Gig.deleteMany({});
      
      // Insert new data
      await Rep.insertMany(reps);
      await Gig.insertMany(gigs);
      
      console.log('Data seeded successfully');
    } catch (error) {
      console.error('Error seeding data:', error);
    } finally {
      mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });