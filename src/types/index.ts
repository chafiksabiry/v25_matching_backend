export interface Rep {
  _id?: string;
  name: string;
  experience: number; // 1-10
  skills: Skill[];
  industries: Industry[];
  languages: Language[];
  availability: Availability[];
  timezone: string;
  conversionRate: number; // 0-1
  reliability: number; // 1-10
  rating: number; // 1-5
  completedGigs: number;
  region: string;
}

export interface Gig {
  _id?: string;
  companyId: string;
  companyName: string;
  title: string;
  description: string;
  industry: Industry;
  requiredSkills: Skill[];
  preferredLanguages: Language[];
  requiredExperience: number; // 1-10
  expectedConversionRate: number; // 0-1
  compensation: {
    base: number;
    commission: number;
  };
  duration: {
    startDate: string;
    endDate: string;
  };
  timezone: string;
  targetRegion: string;
  status?: 'open' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Match {
  minimumScoreApplied: number;
  _id?: string;
  repId: string;
  gigId: string;
  score: number;
  matchDetails: {
    experienceScore: number;
    skillsScore: number;
    industryScore: number;
    languageScore: number;
    availabilityScore: number;
    timezoneScore: number;
    performanceScore: number;
    regionScore: number;
  };
  status?: 'pending' | 'accepted' | 'rejected' | 'completed';
}

export type Skill = 
  | 'Cold Calling'
  | 'Lead Generation'
  | 'Sales Closing'
  | 'Customer Service'
  | 'Product Demonstration'
  | 'Negotiation'
  | 'Relationship Building'
  | 'Technical Support'
  | 'Market Research'
  | 'Social Media Marketing';

export type Industry = 
  | 'Technology'
  | 'Healthcare'
  | 'Finance'
  | 'Retail'
  | 'Manufacturing'
  | 'Education'
  | 'Real Estate'
  | 'Hospitality'
  | 'Automotive'
  | 'Entertainment';

export type Language = 
  | 'English'
  | 'Spanish'
  | 'French'
  | 'German'
  | 'Mandarin'
  | 'Japanese'
  | 'Portuguese'
  | 'Arabic'
  | 'Hindi'
  | 'Russian';

export interface Availability {
  day: string;
  startTime: string;
  endTime: string;
}

export interface MatchingWeights {
  experience: number;
  skills: number;
  industry: number;
  language: number;
  availability: number;
  timezone: number;
  performance: number;
  region: number;
}