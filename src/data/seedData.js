import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';

// Load environment variables
dotenv.config();

// Sample data for agents
const agents = [
  {
    userId: new mongoose.Types.ObjectId(),
    status: "completed",
    completionSteps: {
      basicInfo: true,
      experience: true,
      skills: true,
      languages: true,
      assessment: true
    },
    personalInfo: {
    name: "Alex Johnson",
      location: "New York",
      email: "alex.johnson@example.com",
      phone: "+1 234 567 8900",
      languages: [
        {
          language: "English",
          proficiency: "First Language"
        },
        {
          language: "Spanish",
          proficiency: "B2 - Advanced"
        }
      ]
    },
    professionalSummary: {
      yearsOfExperience: "8 years",
      currentRole: "Senior Sales Representative",
    industries: ["Technology", "Finance"],
      keyExpertise: ["Enterprise Sales", "Account Management"],
      notableCompanies: ["TechCorp", "FinancePro"]
    },
    skills: {
      technical: [
        {
          skill: "Sales CRM",
          level: 0.9,
          details: "Salesforce, HubSpot"
        },
        {
          skill: "Data Analysis",
          level: 0.8,
          details: "Excel, PowerBI"
        }
      ],
      professional: [
        {
          skill: "Sales Closing",
          level: 0.9,
          details: "Enterprise Sales"
        },
        {
          skill: "Negotiation",
          level: 0.9,
          details: "Complex Deals"
        }
      ],
      soft: [
        {
          skill: "Communication",
          level: 0.9,
          details: "Client Presentations"
        },
        {
          skill: "Leadership",
          level: 0.8,
          details: "Team Management"
        }
      ]
    },
    achievements: [
      {
        description: "Exceeded sales quota by 150%",
        impact: "Generated $2M in new revenue",
        context: "TechCorp - Senior Sales Representative",
        skills: ["Sales Closing", "Account Management"]
      },
      {
        description: "Led team of 5 sales representatives",
        impact: "Team achieved 120% of target",
        context: "FinancePro - Sales Manager",
        skills: ["Leadership", "Team Management"]
      }
    ],
    experience: [
      {
        title: "Senior Sales Representative",
        company: "TechCorp",
        startDate: "01/2020",
        endDate: "Present",
        responsibilities: [
          "Manage enterprise accounts",
          "Develop sales strategies",
          "Lead sales team"
        ],
        achievements: [
          "Exceeded sales quota by 150%",
          "Developed new sales process"
        ]
      },
      {
        title: "Sales Manager",
        company: "FinancePro",
        startDate: "01/2018",
        endDate: "12/2019",
        responsibilities: [
          "Led sales team",
          "Developed sales training",
          "Managed key accounts"
        ],
        achievements: [
          "Team achieved 120% of target",
          "Implemented new CRM system"
        ]
      }
    ],
    assessments: {
      contactCenter: [
        {
          date: new Date(),
          score: 95,
          category: "Communication",
          feedback: "Excellent communication skills",
          evaluator: "John Smith"
        }
      ]
    }
  },
  {
    userId: new mongoose.Types.ObjectId(),
    status: "completed",
    completionSteps: {
      basicInfo: true,
      experience: true,
      skills: true,
      languages: true,
      assessment: true
    },
    personalInfo: {
    name: "Samantha Lee",
      location: "San Francisco",
      email: "samantha.lee@example.com",
      phone: "+1 234 567 8901",
      languages: [
        {
          language: "English",
          proficiency: "First Language"
        },
        {
          language: "Mandarin",
          proficiency: "C1 - Advanced"
        }
      ]
    },
    professionalSummary: {
      yearsOfExperience: "5 years",
      currentRole: "Sales Development Representative",
    industries: ["Healthcare", "Education"],
      keyExpertise: ["Lead Generation", "Customer Service"],
      notableCompanies: ["HealthCare Plus", "EduTech Solutions"]
    },
    skills: {
      technical: [
        {
          skill: "Sales CRM",
          level: 0.8,
          details: "Salesforce, HubSpot"
        },
        {
          skill: "Data Analysis",
          level: 0.7,
          details: "Excel, PowerBI"
        }
      ],
      professional: [
        {
          skill: "Lead Generation",
          level: 0.9,
          details: "B2B Sales"
        },
        {
          skill: "Customer Service",
          level: 0.9,
          details: "Client Support"
        }
      ],
      soft: [
        {
          skill: "Communication",
          level: 0.9,
          details: "Client Presentations"
        },
        {
          skill: "Problem Solving",
          level: 0.8,
          details: "Client Issues"
        }
      ]
    },
    achievements: [
      {
        description: "Generated 200+ qualified leads",
        impact: "Increased sales pipeline by 40%",
        context: "HealthCare Plus - Sales Development Representative",
        skills: ["Lead Generation", "Sales CRM"]
      },
      {
        description: "Improved customer satisfaction score",
        impact: "Achieved 95% satisfaction rate",
        context: "EduTech Solutions - Customer Service Manager",
        skills: ["Customer Service", "Problem Solving"]
      }
    ],
    experience: [
      {
        title: "Sales Development Representative",
        company: "HealthCare Plus",
        startDate: "01/2021",
        endDate: "Present",
        responsibilities: [
          "Generate qualified leads",
          "Qualify sales opportunities",
          "Manage sales pipeline"
        ],
        achievements: [
          "Generated 200+ qualified leads",
          "Increased pipeline by 40%"
        ]
      },
      {
        title: "Customer Service Manager",
        company: "EduTech Solutions",
        startDate: "01/2018",
        endDate: "12/2020",
        responsibilities: [
          "Manage customer support team",
          "Handle escalated issues",
          "Develop support processes"
        ],
        achievements: [
          "Achieved 95% satisfaction rate",
          "Reduced response time by 30%"
        ]
      }
    ],
    assessments: {
      contactCenter: [
        {
          date: new Date(),
          score: 92,
          category: "Customer Service",
          feedback: "Excellent customer service skills",
          evaluator: "Jane Doe"
        }
      ]
    }
  }
];

// Sample data for gigs
const gigs = [
  {
    companyId: "comp1",
    companyName: "TechNova Solutions",
    title: "Enterprise SaaS Sales Campaign",
    description: "Looking for experienced agents to promote our new cloud-based project management solution to enterprise clients.",
    industry: "Technology",
    requiredSkills: ["Sales CRM", "Sales Closing", "Account Management"],
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
    description: "Seeking agents to connect with healthcare providers about our new patient management platform.",
    industry: "Healthcare",
    requiredSkills: ["Lead Generation", "Customer Service"],
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
  }
];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    try {
      // Clear existing data
      await Agent.deleteMany({});
      await Gig.deleteMany({});
      
      // Insert new data
      await Agent.insertMany(agents);
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