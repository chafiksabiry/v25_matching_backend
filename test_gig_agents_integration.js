import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './src/app.js';
import Agent from './src/models/Agent.js';
import Gig from './src/models/Gig.js';
import GigAgent from './src/models/GigAgent.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Agent.deleteMany({});
  await Gig.deleteMany({});
  await GigAgent.deleteMany({});
});

describe('Gig Agents Integration', () => {
  let testAgent, testGig;

  beforeEach(async () => {
    // Créer un agent de test
    testAgent = new Agent({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      skills: [
        { skill: 'JavaScript', level: 4 },
        { skill: 'React', level: 3 }
      ]
    });
    await testAgent.save();

    // Créer un gig de test
    testGig = new Gig({
      title: 'Développeur Frontend React',
      description: 'Développement d\'une application web moderne',
      category: 'Développement',
      companyId: new mongoose.Types.ObjectId(),
      enrolledAgents: [] // ← Nouveau champ
    });
    await testGig.save();
  });

  describe('Agent Enrollment to Gig Integration', () => {
    it('should add agent to gig when enrollment is accepted', async () => {
      // 1. Agent fait une demande d'enrôlement
      const requestResponse = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Je suis très intéressé par ce projet.'
        });

      expect(requestResponse.status).toBe(201);
      const enrollmentId = requestResponse.body.gigAgent.id;

      // 2. Vérifier que l'agent n'est PAS encore dans le gig
      let gig = await Gig.findById(testGig._id);
      expect(gig.enrolledAgents).toHaveLength(0);

      // 3. Company accepte la demande
      const acceptResponse = await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: enrollmentId,
          notes: 'Bienvenue dans l\'équipe !'
        });

      expect(acceptResponse.status).toBe(200);

      // 4. Vérifier que l'agent est maintenant dans le gig
      gig = await Gig.findById(testGig._id);
      expect(gig.enrolledAgents).toHaveLength(1);
      expect(gig.enrolledAgents[0].toString()).toBe(testAgent._id.toString());

      // 5. Vérifier le statut GigAgent
      const gigAgent = await GigAgent.findById(enrollmentId);
      expect(gigAgent.enrollmentStatus).toBe('accepted');
      expect(gigAgent.status).toBe('accepted');
    });

    it('should add agent to gig when invitation is accepted', async () => {
      // 1. Company envoie une invitation
      const invitationResponse = await request(app)
        .post('/enrollment/invite')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Nous vous invitons à rejoindre notre équipe.'
        });

      expect(invitationResponse.status).toBe(201);
      const enrollmentId = invitationResponse.body.gigAgent.id;

      // 2. Vérifier que l'agent n'est PAS encore dans le gig
      let gig = await Gig.findById(testGig._id);
      expect(gig.enrolledAgents).toHaveLength(0);

      // 3. Agent accepte l'invitation
      const acceptResponse = await request(app)
        .post('/enrollment/accept')
        .send({
          enrollmentId: enrollmentId,
          notes: 'J\'accepte avec plaisir !'
        });

      expect(acceptResponse.status).toBe(200);

      // 4. Vérifier que l'agent est maintenant dans le gig
      gig = await Gig.findById(testGig._id);
      expect(gig.enrolledAgents).toHaveLength(1);
      expect(gig.enrolledAgents[0].toString()).toBe(testAgent._id.toString());
    });

    it('should not add duplicate agents to gig', async () => {
      // 1. Premier agent est enrôlé
      const agent1 = new Agent({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com'
      });
      await agent1.save();

      // 2. Premier agent fait une demande et est accepté
      const request1 = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: agent1._id,
          gigId: testGig._id,
          notes: 'Première demande'
        });

      await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: request1.body.gigAgent.id,
          notes: 'Accepté'
        });

      // 3. Deuxième agent fait une demande et est accepté
      const request2 = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Deuxième demande'
        });

      await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: request2.body.gigAgent.id,
          notes: 'Accepté aussi'
        });

      // 4. Vérifier que les deux agents sont dans le gig
      const gig = await Gig.findById(testGig._id);
      expect(gig.enrolledAgents).toHaveLength(2);
      expect(gig.enrolledAgents.map(id => id.toString())).toContain(agent1._id.toString());
      expect(gig.enrolledAgents.map(id => id.toString())).toContain(testAgent._id.toString());
    });
  });

  describe('Remove Agent from Gig', () => {
    let enrollmentId;

    beforeEach(async () => {
      // Créer un enrôlement accepté
      const requestResponse = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Demande initiale'
        });

      await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: requestResponse.body.gigAgent.id,
          notes: 'Accepté'
        });

      enrollmentId = requestResponse.body.gigAgent.id;
    });

    it('should remove agent from gig when removed', async () => {
      // 1. Vérifier que l'agent est dans le gig
      let gig = await Gig.findById(testGig._id);
      expect(gig.enrolledAgents).toHaveLength(1);
      expect(gig.enrolledAgents[0].toString()).toBe(testAgent._id.toString());

      // 2. Retirer l'agent du gig
      const removeResponse = await request(app)
        .post('/enrollment/gig/remove-agent')
        .send({
          gigId: testGig._id,
          agentId: testAgent._id
        });

      expect(removeResponse.status).toBe(200);

      // 3. Vérifier que l'agent n'est plus dans le gig
      gig = await Gig.findById(testGig._id);
      expect(gig.enrolledAgents).toHaveLength(0);

      // 4. Vérifier le statut GigAgent
      const gigAgent = await GigAgent.findById(enrollmentId);
      expect(gigAgent.enrollmentStatus).toBe('removed');
      expect(gigAgent.status).toBe('cancelled');
    });
  });

  describe('Get Gig Agents', () => {
    let agent1, agent2;

    beforeEach(async () => {
      // Créer deux agents
      agent1 = new Agent({
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@example.com'
      });
      agent2 = new Agent({
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob.brown@example.com'
      });
      await agent1.save();
      await agent2.save();

      // Enrôler les deux agents
      const request1 = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: agent1._id,
          gigId: testGig._id,
          notes: 'Demande 1'
        });

      const request2 = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: agent2._id,
          gigId: testGig._id,
          notes: 'Demande 2'
        });

      await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: request1.body.gigAgent.id,
          notes: 'Accepté'
        });

      await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: request2.body.gigAgent.id,
          notes: 'Accepté'
        });
    });

    it('should return all agents enrolled in a gig', async () => {
      const response = await request(app)
        .get(`/enrollment/gig/${testGig._id}/agents`);

      expect(response.status).toBe(200);
      expect(response.body.totalAgents).toBe(2);
      expect(response.body.agents).toHaveLength(2);
      
      const agentIds = response.body.agents.map(agent => agent._id);
      expect(agentIds).toContain(agent1._id);
      expect(agentIds).toContain(agent2._id);
    });

    it('should return empty array for gig with no agents', async () => {
      // Créer un nouveau gig sans agents
      const emptyGig = new Gig({
        title: 'Gig Vide',
        description: 'Aucun agent',
        companyId: new mongoose.Types.ObjectId()
      });
      await emptyGig.save();

      const response = await request(app)
        .get(`/enrollment/gig/${emptyGig._id}/agents`);

      expect(response.status).toBe(200);
      expect(response.body.totalAgents).toBe(0);
      expect(response.body.agents).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent gig gracefully', async () => {
      const fakeGigId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/enrollment/gig/${fakeGigId}/agents`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Gig non trouvé');
    });

    it('should handle removing non-existent agent gracefully', async () => {
      const fakeAgentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/enrollment/gig/remove-agent')
        .send({
          gigId: testGig._id,
          agentId: fakeAgentId
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Agent retiré du gig avec succès');
    });
  });
});
