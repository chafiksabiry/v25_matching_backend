import mongoose from 'mongoose';
import { findMatchesForGigById } from './src/controllers/matchController.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/matching_system';

// Mock request and response objects
const createMockRequest = (gigId, weights = {}) => ({
  params: { id: gigId },
  body: { weights }
});

const createMockResponse = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

async function testAvailabilityMatching() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test with the gig ID from the user's data
    const gigId = '688afb3023404e23d828feab';
    
    // Test weights with availability enabled
    const weights = {
      skills: 0.20,
      languages: 0.15,
      experience: 0.20,
      region: 0.15,
      timezone: 0.10,
      industry: 0.10,
      activity: 0.10,
      availability: 0.10  // Enable availability matching
    };

    const req = createMockRequest(gigId, weights);
    const res = createMockResponse();

    console.log('🧪 Testing availability matching...');
    console.log('📋 Gig ID:', gigId);
    console.log('⚖️ Weights:', weights);

    await findMatchesForGigById(req, res);

    if (res.statusCode === 200) {
      console.log('✅ Request successful!');
      console.log('📊 Total matches found:', res.data.matches?.length || 0);
      
      // Check if any matches have availabilityMatch
      const matchesWithAvailability = res.data.matches?.filter(match => 
        match.availabilityMatch && match.availabilityMatch.matchStatus
      ) || [];
      
      console.log('📅 Matches with availability data:', matchesWithAvailability.length);
      
      if (matchesWithAvailability.length > 0) {
        console.log('✅ Availability matching is working!');
        console.log('📋 Sample availability match:', matchesWithAvailability[0].availabilityMatch);
      } else {
        console.log('⚠️ No matches with availability data found');
      }
      
      // Show first few matches
      const firstMatches = res.data.matches?.slice(0, 3) || [];
      firstMatches.forEach((match, index) => {
        console.log(`\n📋 Match ${index + 1}:`);
        console.log(`   Agent: ${match.agentInfo?.name || 'Unknown'}`);
        console.log(`   Overall Status: ${match.matchStatus}`);
        console.log(`   Availability Status: ${match.availabilityMatch?.matchStatus || 'N/A'}`);
        console.log(`   Language Status: ${match.languageMatch?.details?.matchStatus || 'N/A'}`);
        console.log(`   Skills Status: ${match.skillsMatch?.details?.matchStatus || 'N/A'}`);
      });
      
    } else {
      console.log('❌ Request failed with status:', res.statusCode);
      console.log('📋 Response:', res.data);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testAvailabilityMatching(); 