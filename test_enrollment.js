import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GigAgent from './src/models/GigAgent.js';
import Agent from './src/models/Agent.js';
import Gig from './src/models/Gig.js';

// Charger les variables d'environnement
dotenv.config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB');
    runTests();
  })
  .catch((error) => {
    console.error('❌ Erreur de connexion MongoDB:', error);
    process.exit(1);
  });

async function runTests() {
  console.log('\n🚀 Démarrage des tests du système d\'enrôlement...\n');

  try {
    // Test 1: Vérifier la structure du modèle
    await testModelStructure();
    
    // Test 2: Tester la génération de token
    await testTokenGeneration();
    
    // Test 3: Tester l'acceptation d'enrôlement
    await testEnrollmentAcceptance();
    
    // Test 4: Tester le refus d'enrôlement
    await testEnrollmentRejection();
    
    // Test 5: Tester l'expiration d'invitation
    await testInvitationExpiration();
    
    // Test 6: Tester les méthodes utilitaires
    await testUtilityMethods();
    
    console.log('\n✅ Tous les tests sont passés avec succès !');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error);
  } finally {
    // Fermer la connexion
    await mongoose.connection.close();
    console.log('\n🔌 Connexion MongoDB fermée');
    process.exit(0);
  }
}

async function testModelStructure() {
  console.log('📋 Test 1: Vérification de la structure du modèle...');
  
  // Vérifier que les nouveaux champs existent
  const gigAgentSchema = GigAgent.schema.obj;
  
  const requiredFields = [
    'enrollmentStatus',
    'invitationSentAt',
    'invitationExpiresAt',
    'invitationToken',
    'enrollmentNotes',
    'enrollmentDate'
  ];
  
  for (const field of requiredFields) {
    if (!gigAgentSchema[field]) {
      throw new Error(`Champ manquant: ${field}`);
    }
  }
  
  console.log('   ✅ Structure du modèle validée');
}

async function testTokenGeneration() {
  console.log('🔑 Test 2: Test de génération de token...');
  
  // Créer un GigAgent de test
  const testGigAgent = new GigAgent({
    agentId: new mongoose.Types.ObjectId(),
    gigId: new mongoose.Types.ObjectId(),
    status: 'pending',
    enrollmentStatus: 'invited'
  });
  
  // Générer un token
  const token = testGigAgent.generateInvitationToken();
  
  if (!token || typeof token !== 'string' || token.length !== 64) {
    throw new Error('Token invalide généré');
  }
  
  if (!testGigAgent.invitationSentAt) {
    throw new Error('Date d\'envoi non définie');
  }
  
  if (!testGigAgent.invitationExpiresAt) {
    throw new Error('Date d\'expiration non définie');
  }
  
  // Vérifier que l'expiration est dans 7 jours
  const expectedExpiry = new Date();
  expectedExpiry.setDate(expectedExpiry.getDate() + 7);
  
  const timeDiff = Math.abs(testGigAgent.invitationExpiresAt.getTime() - expectedExpiry.getTime());
  if (timeDiff > 60000) { // 1 minute de tolérance
    throw new Error('Date d\'expiration incorrecte');
  }
  
  console.log('   ✅ Génération de token validée');
}

async function testEnrollmentAcceptance() {
  console.log('✅ Test 3: Test d\'acceptation d\'enrôlement...');
  
  // Créer un GigAgent de test
  const testGigAgent = new GigAgent({
    agentId: new mongoose.Types.ObjectId(),
    gigId: new mongoose.Types.ObjectId(),
    status: 'pending',
    enrollmentStatus: 'invited',
    invitationToken: 'test-token-123'
  });
  
  // Accepter l'enrôlement
  await testGigAgent.acceptEnrollment('Test d\'acceptation');
  
  // Vérifier les changements
  if (testGigAgent.enrollmentStatus !== 'accepted') {
    throw new Error('Statut d\'enrôlement incorrect après acceptation');
  }
  
  if (testGigAgent.status !== 'accepted') {
    throw new Error('Statut général incorrect après acceptation');
  }
  
  if (testGigAgent.agentResponse !== 'accepted') {
    throw new Error('Réponse de l\'agent incorrecte après acceptation');
  }
  
  if (!testGigAgent.enrollmentDate) {
    throw new Error('Date d\'enrôlement non définie');
  }
  
  if (testGigAgent.enrollmentNotes !== 'Test d\'acceptation') {
    throw new Error('Notes d\'enrôlement incorrectes');
  }
  
  console.log('   ✅ Acceptation d\'enrôlement validée');
}

async function testEnrollmentRejection() {
  console.log('❌ Test 4: Test de refus d\'enrôlement...');
  
  // Créer un GigAgent de test
  const testGigAgent = new GigAgent({
    agentId: new mongoose.Types.ObjectId(),
    gigId: new mongoose.Types.ObjectId(),
    status: 'pending',
    enrollmentStatus: 'invited',
    invitationToken: 'test-token-456'
  });
  
  // Refuser l'enrôlement
  await testGigAgent.rejectEnrollment('Test de refus');
  
  // Vérifier les changements
  if (testGigAgent.enrollmentStatus !== 'rejected') {
    throw new Error('Statut d\'enrôlement incorrect après refus');
  }
  
  if (testGigAgent.status !== 'rejected') {
    throw new Error('Statut général incorrect après refus');
  }
  
  if (testGigAgent.agentResponse !== 'rejected') {
    throw new Error('Réponse de l\'agent incorrecte après refus');
  }
  
  if (testGigAgent.enrollmentNotes !== 'Test de refus') {
    throw new Error('Notes d\'enrôlement incorrectes');
  }
  
  console.log('   ✅ Refus d\'enrôlement validé');
}

async function testInvitationExpiration() {
  console.log('⏰ Test 5: Test d\'expiration d\'invitation...');
  
  // Créer un GigAgent de test avec une invitation expirée
  const testGigAgent = new GigAgent({
    agentId: new mongoose.Types.ObjectId(),
    gigId: new mongoose.Types.ObjectId(),
    status: 'pending',
    enrollmentStatus: 'invited',
    invitationExpiresAt: new Date(Date.now() - 86400000) // Expiré hier
  });
  
  // Vérifier que l'invitation est expirée
  if (!testGigAgent.isInvitationExpired()) {
    throw new Error('Invitation expirée non détectée');
  }
  
  // Vérifier que l'enrôlement ne peut pas être effectué
  if (testGigAgent.canEnroll()) {
    throw new Error('Enrôlement possible sur invitation expirée');
  }
  
  // Expirer l'invitation
  await testGigAgent.expireInvitation();
  
  if (testGigAgent.enrollmentStatus !== 'expired') {
    throw new Error('Statut d\'expiration incorrect');
  }
  
  if (testGigAgent.status !== 'expired') {
    throw new Error('Statut général incorrect après expiration');
  }
  
  console.log('   ✅ Expiration d\'invitation validée');
}

async function testUtilityMethods() {
  console.log('🛠️  Test 6: Test des méthodes utilitaires...');
  
  // Créer un GigAgent de test
  const testGigAgent = new GigAgent({
    agentId: new mongoose.Types.ObjectId(),
    gigId: new mongoose.Types.ObjectId(),
    status: 'pending',
    enrollmentStatus: 'invited',
    invitationExpiresAt: new Date(Date.now() + 86400000) // Expire demain
  });
  
  // Vérifier que l'enrôlement peut être effectué
  if (!testGigAgent.canEnroll()) {
    throw new Error('Enrôlement impossible sur invitation valide');
  }
  
  // Vérifier que l'invitation n'est pas expirée
  if (testGigAgent.isInvitationExpired()) {
    throw new Error('Invitation valide détectée comme expirée');
  }
  
  console.log('   ✅ Méthodes utilitaires validées');
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
  process.exit(1);
});
