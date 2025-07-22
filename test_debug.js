const mongoose = require('mongoose');
const Agent = require('./src/models/Agent');
const Gig = require('./src/models/Gig');

// Configuration MongoDB
mongoose.connect('mongodb://localhost:27017/your_database_name', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugMatching() {
  try {
    console.log('🔍 Debugging matching algorithm...');
    
    // 1. Vérifier si le gig existe
    const gigId = '687ef19389a519df44e1601f';
    const gig = await Gig.findById(gigId);
    console.log('Gig trouvé:', gig ? {
      id: gig._id,
      title: gig.title,
      experience: gig.seniority?.yearsExperience,
      languages: gig.skills?.languages?.length || 0,
      skills: {
        technical: gig.skills?.technical?.length || 0,
        professional: gig.skills?.professional?.length || 0,
        soft: gig.skills?.soft?.length || 0
      }
    } : 'Gig non trouvé');
    
    // 2. Vérifier si l'agent existe
    const agentId = '687ccf4d96d2b5a2c321c811';
    const agent = await Agent.findById(agentId);
    console.log('Agent trouvé:', agent ? {
      id: agent._id,
      name: agent.personalInfo?.name,
      experience: agent.professionalSummary?.yearsOfExperience,
      languages: agent.personalInfo?.languages?.length || 0,
      skills: {
        technical: agent.skills?.technical?.length || 0,
        professional: agent.skills?.professional?.length || 0,
        soft: agent.skills?.soft?.length || 0
      }
    } : 'Agent non trouvé');
    
    // 3. Compter tous les agents
    const totalAgents = await Agent.countDocuments();
    console.log('Nombre total d\'agents dans la base:', totalAgents);
    
    // 4. Lister quelques agents pour vérifier
    const sampleAgents = await Agent.find().limit(3).select('personalInfo.name professionalSummary.yearsOfExperience');
    console.log('Exemples d\'agents:', sampleAgents.map(a => ({
      name: a.personalInfo?.name,
      experience: a.professionalSummary?.yearsOfExperience
    })));
    
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugMatching(); 