const mongoose = require('mongoose');

// Configuration MongoDB - ajustez l'URL selon votre configuration
mongoose.connect('mongodb://localhost:27017/your_database_name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Définir les schémas simplifiés
const agentSchema = new mongoose.Schema({
  userId: String,
  personalInfo: {
    name: String,
    languages: [{
      language: mongoose.Schema.Types.ObjectId,
      proficiency: String
    }]
  },
  professionalSummary: {
    yearsOfExperience: Number
  },
  skills: {
    technical: [{
      skill: mongoose.Schema.Types.ObjectId,
      level: Number
    }],
    professional: [{
      skill: mongoose.Schema.Types.ObjectId,
      level: Number
    }],
    soft: [{
      skill: mongoose.Schema.Types.ObjectId,
      level: Number
    }]
  },
  availability: {
    timeZone: mongoose.Schema.Types.ObjectId,
    schedule: Array
  }
});

const gigSchema = new mongoose.Schema({
  title: String,
  seniority: {
    yearsExperience: String
  },
  skills: {
    technical: [{
      skill: mongoose.Schema.Types.ObjectId,
      level: Number
    }],
    professional: [{
      skill: mongoose.Schema.Types.ObjectId,
      level: Number
    }],
    soft: [{
      skill: mongoose.Schema.Types.ObjectId,
      level: Number
    }],
    languages: [{
      language: mongoose.Schema.Types.ObjectId,
      proficiency: String
    }]
  },
  availability: {
    time_zone: mongoose.Schema.Types.ObjectId,
    schedule: Array
  },
  destination_zone: String
});

const Agent = mongoose.model('Agent', agentSchema);
const Gig = mongoose.model('Gig', gigSchema);

async function testDatabase() {
  try {
    console.log('🔍 Test de la base de données...');
    
    // 1. Compter tous les agents
    const totalAgents = await Agent.countDocuments();
    console.log('Nombre total d\'agents:', totalAgents);
    
    // 2. Compter tous les gigs
    const totalGigs = await Gig.countDocuments();
    console.log('Nombre total de gigs:', totalGigs);
    
    // 3. Chercher l'agent spécifique
    const agentId = '687ccf4d96d2b5a2c321c811';
    const agent = await Agent.findById(agentId);
    console.log('Agent trouvé:', agent ? {
      id: agent._id,
      name: agent.personalInfo?.name,
      experience: agent.professionalSummary?.yearsOfExperience,
      languages: agent.personalInfo?.languages?.length || 0
    } : 'Agent non trouvé');
    
    // 4. Chercher le gig spécifique
    const gigId = '687ef19389a519df44e1601f';
    const gig = await Gig.findById(gigId);
    console.log('Gig trouvé:', gig ? {
      id: gig._id,
      title: gig.title,
      experience: gig.seniority?.yearsExperience,
      languages: gig.skills?.languages?.length || 0
    } : 'Gig non trouvé');
    
    // 5. Lister quelques agents
    const sampleAgents = await Agent.find().limit(3);
    console.log('Exemples d\'agents:');
    sampleAgents.forEach((agent, index) => {
      console.log(`  ${index + 1}. ${agent.personalInfo?.name || 'Sans nom'} (${agent._id})`);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDatabase(); 