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

describe('Agent Enrollment Request API', () => {
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
      ],
      experience: [
        {
          title: 'Frontend Developer',
          company: 'Tech Corp',
          startDate: '2020-01',
          endDate: '2023-12',
          responsibilities: ['Développement frontend', 'Maintenance'],
          achievements: ['Projet e-commerce réussi']
        }
      ]
    });
    await testAgent.save();

    // Créer un gig de test
    testGig = new Gig({
      title: 'Développeur Frontend React',
      description: 'Développement d\'une application web moderne',
      category: 'Développement',
      companyId: new mongoose.Types.ObjectId(),
      skills: {
        technical: [
          { skill: 'React', level: 3, details: 'Framework principal' },
          { skill: 'JavaScript', level: 4, details: 'Langage de base' }
        ],
        professional: [
          { skill: 'Communication', level: 3, details: 'Travail en équipe' }
        ]
      },
      availability: {
        schedule: [
          {
            day: 'monday',
            hours: { start: '09:00', end: '17:00' }
          }
        ],
        time_zone: 'UTC+1',
        flexibility: ['remote', 'hybrid']
      }
    });
    await testGig.save();
  });

  describe('POST /enrollment/request', () => {
    it('should allow an agent to request enrollment to a gig', async () => {
      const response = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Je suis très intéressé par ce projet et j\'ai une expérience pertinente.'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Demande d\'enrôlement envoyée avec succès');
      expect(response.body.gigAgent.enrollmentStatus).toBe('requested');
      expect(response.body.gigAgent.status).toBe('pending');
      expect(response.body.gigAgent.enrollmentNotes).toBe('Je suis très intéressé par ce projet et j\'ai une expérience pertinente.');

      // Vérifier que l'enrôlement a été créé en base
      const gigAgent = await GigAgent.findById(response.body.gigAgent.id);
      expect(gigAgent).toBeTruthy();
      expect(gigAgent.enrollmentStatus).toBe('requested');
    });

    it('should prevent duplicate enrollment requests', async () => {
      // Première demande
      await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Première demande'
        });

      // Deuxième demande pour le même agent-gig
      const response = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Deuxième demande'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Une demande d\'enrôlement existe déjà');
    });

    it('should allow new request after rejection', async () => {
      // Créer un enrôlement rejeté
      const gigAgent = new GigAgent({
        agentId: testAgent._id,
        gigId: testGig._id,
        status: 'rejected',
        enrollmentStatus: 'rejected'
      });
      await gigAgent.save();

      // Nouvelle demande après rejet
      const response = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Nouvelle tentative après rejet'
        });

      expect(response.status).toBe(201);
      expect(response.body.gigAgent.enrollmentStatus).toBe('requested');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id
          // gigId manquant
        });

      expect(response.status).toBe(400);
    });

    it('should handle non-existent agent', async () => {
      const fakeAgentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: fakeAgentId,
          gigId: testGig._id,
          notes: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Agent not found');
    });

    it('should handle non-existent gig', async () => {
      const fakeGigId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: fakeGigId,
          notes: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Gig not found');
    });
  });

  describe('POST /enrollment/request/accept', () => {
    let enrollmentRequest;

    beforeEach(async () => {
      // Créer une demande d'enrôlement
      enrollmentRequest = new GigAgent({
        agentId: testAgent._id,
        gigId: testGig._id,
        status: 'pending',
        enrollmentStatus: 'requested',
        notes: 'Demande initiale'
      });
      await enrollmentRequest.save();
    });

    it('should allow company to accept enrollment request', async () => {
      const response = await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: enrollmentRequest._id,
          notes: 'Bienvenue dans l\'équipe !'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Demande d\'enrôlement acceptée avec succès');
      expect(response.body.gigAgent.enrollmentStatus).toBe('accepted');
      expect(response.body.gigAgent.status).toBe('accepted');
      expect(response.body.gigAgent.enrollmentNotes).toBe('Bienvenue dans l\'équipe !');

      // Vérifier en base
      const updatedGigAgent = await GigAgent.findById(enrollmentRequest._id);
      expect(updatedGigAgent.enrollmentStatus).toBe('accepted');
      expect(updatedGigAgent.status).toBe('accepted');
    });

    it('should only accept requested enrollments', async () => {
      // Changer le statut à accepted
      enrollmentRequest.enrollmentStatus = 'accepted';
      await enrollmentRequest.save();

      const response = await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: enrollmentRequest._id,
          notes: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Seules les demandes d\'enrôlement peuvent être acceptées');
    });

    it('should handle non-existent enrollment', async () => {
      const fakeEnrollmentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: fakeEnrollmentId,
          notes: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Demande d\'enrôlement non trouvée');
    });
  });

  describe('POST /enrollment/request/reject', () => {
    let enrollmentRequest;

    beforeEach(async () => {
      // Créer une demande d'enrôlement
      enrollmentRequest = new GigAgent({
        agentId: testAgent._id,
        gigId: testGig._id,
        status: 'pending',
        enrollmentStatus: 'requested',
        notes: 'Demande initiale'
      });
      await enrollmentRequest.save();
    });

    it('should allow company to reject enrollment request', async () => {
      const response = await request(app)
        .post('/enrollment/request/reject')
        .send({
          enrollmentId: enrollmentRequest._id,
          notes: 'Merci pour votre intérêt, mais nous avons déjà sélectionné un autre candidat.'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Demande d\'enrôlement refusée');
      expect(response.body.gigAgent.enrollmentStatus).toBe('rejected');
      expect(response.body.gigAgent.status).toBe('rejected');
      expect(response.body.gigAgent.enrollmentNotes).toBe('Merci pour votre intérêt, mais nous avons déjà sélectionné un autre candidat.');

      // Vérifier en base
      const updatedGigAgent = await GigAgent.findById(enrollmentRequest._id);
      expect(updatedGigAgent.enrollmentStatus).toBe('rejected');
      expect(updatedGigAgent.status).toBe('rejected');
    });

    it('should only reject requested enrollments', async () => {
      // Changer le statut à accepted
      enrollmentRequest.enrollmentStatus = 'accepted';
      await enrollmentRequest.save();

      const response = await request(app)
        .post('/enrollment/request/reject')
        .send({
          enrollmentId: enrollmentRequest._id,
          notes: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Seules les demandes d\'enrôlement peuvent être refusées');
    });

    it('should handle non-existent enrollment', async () => {
      const fakeEnrollmentId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post('/enrollment/request/reject')
        .send({
          enrollmentId: fakeEnrollmentId,
          notes: 'Test'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Demande d\'enrôlement non trouvée');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow: request -> accept', async () => {
      // 1. Agent demande un enrôlement
      const requestResponse = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Je suis parfaitement qualifié pour ce projet.'
        });

      expect(requestResponse.status).toBe(201);
      const enrollmentId = requestResponse.body.gigAgent.id;

      // 2. Company accepte la demande
      const acceptResponse = await request(app)
        .post('/enrollment/request/accept')
        .send({
          enrollmentId: enrollmentId,
          notes: 'Bienvenue dans l\'équipe !'
        });

      expect(acceptResponse.status).toBe(200);
      expect(acceptResponse.body.gigAgent.enrollmentStatus).toBe('accepted');

      // 3. Vérifier l'état final en base
      const finalGigAgent = await GigAgent.findById(enrollmentId);
      expect(finalGigAgent.enrollmentStatus).toBe('accepted');
      expect(finalGigAgent.status).toBe('accepted');
      expect(finalGigAgent.enrollmentDate).toBeTruthy();
    });

    it('should handle complete workflow: request -> reject', async () => {
      // 1. Agent demande un enrôlement
      const requestResponse = await request(app)
        .post('/enrollment/request')
        .send({
          agentId: testAgent._id,
          gigId: testGig._id,
          notes: 'Je suis parfaitement qualifié pour ce projet.'
        });

      expect(requestResponse.status).toBe(201);
      const enrollmentId = requestResponse.body.gigAgent.id;

      // 2. Company refuse la demande
      const rejectResponse = await request(app)
        .post('/enrollment/request/reject')
        .send({
          enrollmentId: enrollmentId,
          notes: 'Merci pour votre intérêt, mais nous avons déjà sélectionné un autre candidat.'
        });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.gigAgent.enrollmentStatus).toBe('rejected');

      // 3. Vérifier l'état final en base
      const finalGigAgent = await GigAgent.findById(enrollmentId);
      expect(finalGigAgent.enrollmentStatus).toBe('rejected');
      expect(finalGigAgent.status).toBe('rejected');
    });
  });
});
