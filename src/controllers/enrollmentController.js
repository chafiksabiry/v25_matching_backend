import GigAgent from '../models/GigAgent.js';
import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import { StatusCodes } from 'http-status-codes';
import { sendEnrollmentInvitation as sendEmailInvitation, sendEnrollmentNotification as sendEmailNotification } from '../services/emailService.js';

// Envoyer une invitation d'enrôlement à un agent
export const sendEnrollmentInvitation = async (req, res) => {
  try {
    const { agentId, gigId, notes, expiryDays = 7 } = req.body;

    // Vérifier que l'agent et le gig existent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }

    // Vérifier si une assignation existe déjà
    let gigAgent = await GigAgent.findOne({ agentId, gigId });
    
    if (!gigAgent) {
      // Créer une nouvelle assignation avec statut d'enrôlement
      gigAgent = new GigAgent({
        agentId,
        gigId,
        status: 'pending',
        enrollmentStatus: 'invited',
        notes: notes || ''
      });
    } else {
      // Mettre à jour l'assignation existante
      gigAgent.enrollmentStatus = 'invited';
      gigAgent.notes = notes || gigAgent.notes;
    }

    // Générer un token d'invitation unique
    const invitationToken = gigAgent.generateInvitationToken();
    
    // Définir la date d'expiration
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    gigAgent.invitationExpiresAt = expiryDate;

    await gigAgent.save();

    // Envoyer l'email d'invitation
    try {
      await sendEmailInvitation(agent, gig, invitationToken, expiryDate);
      await gigAgent.markEmailSent();
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email d\'invitation:', emailError);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: 'Invitation créée mais erreur lors de l\'envoi de l\'email' 
      });
    }

    res.status(StatusCodes.CREATED).json({
      message: 'Invitation d\'enrôlement envoyée avec succès',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        invitationExpiresAt: gigAgent.invitationExpiresAt,
        invitationToken: gigAgent.invitationToken
      }
    });

  } catch (error) {
    console.error('Error in sendEnrollmentInvitation:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Accepter une invitation d'enrôlement via token OU via ID
export const acceptEnrollment = async (req, res) => {
  try {
    const { token, enrollmentId, notes } = req.body;

    let gigAgent;

    // Option 1: Accepter via token (lien direct)
    if (token) {
      gigAgent = await GigAgent.findOne({ invitationToken: token })
        .populate('agentId')
        .populate('gigId');
    }
    // Option 2: Accepter via ID (depuis la plateforme)
    else if (enrollmentId) {
      gigAgent = await GigAgent.findById(enrollmentId)
        .populate('agentId')
        .populate('gigId');
    }
    else {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Token d\'invitation OU ID d\'enrôlement requis' 
      });
    }

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Invitation invalide' });
    }

    // Vérifier si l'invitation a expiré
    if (gigAgent.isInvitationExpired()) {
      await gigAgent.expireInvitation();
      return res.status(StatusCodes.GONE).json({ message: 'Cette invitation a expiré' });
    }

    // Vérifier si l'enrôlement peut être effectué
    if (!gigAgent.canEnroll()) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Cette invitation ne peut plus être utilisée' 
      });
    }

    // Accepter l'enrôlement
    await gigAgent.acceptEnrollment(notes);

    // Envoyer une notification de confirmation
    try {
      await sendEmailNotification(gigAgent.agentId, gigAgent.gigId, 'accepted');
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de la notification:', emailError);
    }

    res.status(StatusCodes.OK).json({
      message: 'Enrôlement accepté avec succès',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status,
        enrollmentDate: gigAgent.enrollmentDate
      }
    });

  } catch (error) {
    console.error('Error in acceptEnrollment:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Refuser une invitation d'enrôlement via token OU via ID
export const rejectEnrollment = async (req, res) => {
  try {
    const { token, enrollmentId, notes } = req.body;

    let gigAgent;

    // Option 1: Refuser via token (lien direct)
    if (token) {
      gigAgent = await GigAgent.findOne({ invitationToken: token })
        .populate('agentId')
        .populate('gigId');
    }
    // Option 2: Refuser via ID (depuis la plateforme)
    else if (enrollmentId) {
      gigAgent = await GigAgent.findById(enrollmentId)
        .populate('agentId')
        .populate('gigId');
    }
    else {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Token d\'invitation OU ID d\'enrôlement requis' 
      });
    }

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Invitation invalide' });
    }

    // Vérifier si l'invitation a expiré
    if (gigAgent.isInvitationExpired()) {
      await gigAgent.expireInvitation();
      return res.status(StatusCodes.GONE).json({ message: 'Cette invitation a expiré' });
    }

    // Vérifier si l'enrôlement peut être effectué
    if (!gigAgent.canEnroll()) {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Cette invitation ne peut plus être utilisée' 
      });
    }

    // Refuser l'enrôlement
    await gigAgent.rejectEnrollment(notes);

    // Envoyer une notification de refus
    try {
      await sendEmailNotification(gigAgent.agentId, gigAgent.gigId, 'rejected');
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de la notification:', emailError);
    }

    res.status(StatusCodes.OK).json({
      message: 'Enrôlement refusé',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status,
        enrollmentNotes: gigAgent.enrollmentNotes
      }
    });

  } catch (error) {
    console.error('Error in rejectEnrollment:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Obtenir les invitations d'enrôlement pour un agent
export const getAgentEnrollments = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    let query = { agentId };
    
    if (status) {
      query.enrollmentStatus = status;
    }

    const enrollments = await GigAgent.find(query)
      .populate('gigId', 'title description category destination_zone')
      .populate('agentId', 'personalInfo.firstName personalInfo.lastName personalInfo.email')
      .sort({ invitationSentAt: -1 });

    res.status(StatusCodes.OK).json({
      count: enrollments.length,
      enrollments: enrollments.map(enrollment => ({
        id: enrollment._id,
        gig: enrollment.gigId,
        enrollmentStatus: enrollment.enrollmentStatus,
        invitationSentAt: enrollment.invitationSentAt,
        invitationExpiresAt: enrollment.invitationExpiresAt,
        isExpired: enrollment.isInvitationExpired(),
        canEnroll: enrollment.canEnroll(),
        notes: enrollment.notes,
        matchScore: enrollment.matchScore,
        matchStatus: enrollment.matchStatus
      }))
    });

  } catch (error) {
    console.error('Error in getAgentEnrollments:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Obtenir les invitations d'enrôlement pour un gig
export const getGigEnrollments = async (req, res) => {
  try {
    const { gigId } = req.params;
    const { status } = req.query;

    let query = { gigId };
    
    if (status) {
      query.enrollmentStatus = status;
    }

    const enrollments = await GigAgent.find(query)
      .populate('agentId', 'personalInfo.firstName personalInfo.lastName personalInfo.email personalInfo.phone')
      .populate('gigId', 'title description category')
      .sort({ invitationSentAt: -1 });

    res.status(StatusCodes.OK).json({
      count: enrollments.length,
      enrollments: enrollments.map(enrollment => ({
        id: enrollment._id,
        agent: enrollment.agentId,
        enrollmentStatus: enrollment.enrollmentStatus,
        invitationSentAt: enrollment.invitationSentAt,
        invitationExpiresAt: enrollment.invitationExpiresAt,
        isExpired: enrollment.isInvitationExpired(),
        notes: enrollment.notes,
        matchScore: enrollment.matchScore,
        matchStatus: enrollment.matchStatus
      }))
    });

  } catch (error) {
    console.error('Error in getGigEnrollments:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Renvoyer une invitation d'enrôlement
export const resendEnrollmentInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { expiryDays = 7 } = req.body;

    const gigAgent = await GigAgent.findById(id)
      .populate('agentId')
      .populate('gigId');

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Enrôlement non trouvé' });
    }

    if (gigAgent.enrollmentStatus !== 'invited') {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Seules les invitations en attente peuvent être renvoyées' 
      });
    }

    // Générer un nouveau token et mettre à jour les dates
    const newToken = gigAgent.generateInvitationToken();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    gigAgent.invitationExpiresAt = expiryDate;

    await gigAgent.save();

    // Envoyer le nouvel email d'invitation
    try {
      await sendEmailInvitation(gigAgent.agentId, gigAgent.gigId, newToken, expiryDate);
      await gigAgent.markEmailSent();
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de l\'email d\'invitation:', emailError);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: 'Invitation mise à jour mais erreur lors de l\'envoi de l\'email' 
      });
    }

    res.status(StatusCodes.OK).json({
      message: 'Invitation d\'enrôlement renvoyée avec succès',
      gigAgent: {
        id: gigAgent._id,
        invitationToken: gigAgent.invitationToken,
        invitationExpiresAt: gigAgent.invitationExpiresAt
      }
    });

  } catch (error) {
    console.error('Error in resendEnrollmentInvitation:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Annuler une invitation d'enrôlement
export const cancelEnrollmentInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const gigAgent = await GigAgent.findById(id);

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Enrôlement non trouvé' });
    }

    if (gigAgent.enrollmentStatus !== 'invited') {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Seules les invitations en attente peuvent être annulées' 
      });
    }

    // Annuler l'invitation
    gigAgent.enrollmentStatus = 'cancelled';
    gigAgent.status = 'cancelled';
    gigAgent.notes = notes || gigAgent.notes;
    gigAgent.invitationToken = undefined;

    await gigAgent.save();

    res.status(StatusCodes.OK).json({
      message: 'Invitation d\'enrôlement annulée avec succès',
      gigAgent: {
        id: gigAgent._id,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status
      }
    });

  } catch (error) {
    console.error('Error in cancelEnrollmentInvitation:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Accepter un enrôlement directement via son ID (pour la plateforme)
export const acceptEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const gigAgent = await GigAgent.findById(id)
      .populate('agentId')
      .populate('gigId');

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Enrôlement non trouvé' });
    }

    if (gigAgent.enrollmentStatus !== 'invited') {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Seuls les enrôlements en attente peuvent être acceptés' 
      });
    }

    // Accepter l'enrôlement
    await gigAgent.acceptEnrollment(notes);

    // Envoyer une notification de confirmation
    try {
      await sendEmailNotification(gigAgent.agentId, gigAgent.gigId, 'accepted');
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de la notification:', emailError);
    }

    res.status(StatusCodes.OK).json({
      message: 'Enrôlement accepté avec succès',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status,
        enrollmentDate: gigAgent.enrollmentDate
      }
    });

  } catch (error) {
    console.error('Error in acceptEnrollmentById:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Récupérer tous les gigs où l'agent est enrôlé (avec détails complets)
export const getAgentEnrolledGigs = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    let query = { agentId };
    
    // Filtrer par statut si spécifié
    if (status) {
      query.enrollmentStatus = status;
    }

    const enrollments = await GigAgent.find(query)
      .populate({
        path: 'gigId',
        select: 'title description budget deadline location skills required category status createdAt'
      })
      .populate({
        path: 'agentId',
        select: 'firstName lastName email phone skills experience'
      })
      .sort({ invitationSentAt: -1 });

    if (!enrollments || enrollments.length === 0) {
      return res.status(StatusCodes.OK).json({
        message: 'Aucun enrôlement trouvé pour cet agent',
        enrollments: []
      });
    }

    // Formater la réponse pour plus de clarté
    const formattedEnrollments = enrollments.map(enrollment => ({
      enrollmentId: enrollment._id,
      gig: enrollment.gigId,
      agent: enrollment.agentId,
      enrollmentStatus: enrollment.enrollmentStatus,
      status: enrollment.status,
      invitationSentAt: enrollment.invitationSentAt,
      invitationExpiresAt: enrollment.invitationExpiresAt,
      enrollmentDate: enrollment.enrollmentDate,
      enrollmentNotes: enrollment.enrollmentNotes,
      canEnroll: enrollment.canEnroll ? enrollment.canEnroll() : false,
      isExpired: enrollment.isInvitationExpired ? enrollment.isInvitationExpired() : false
    }));

    res.status(StatusCodes.OK).json({
      message: `${formattedEnrollments.length} enrôlement(s) trouvé(s)`,
      agentId,
      enrollments: formattedEnrollments
    });

  } catch (error) {
    console.error('Error in getAgentEnrolledGigs:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Refuser un enrôlement directement via son ID (pour la plateforme)
export const rejectEnrollmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const gigAgent = await GigAgent.findById(id)
      .populate('agentId')
      .populate('gigId');

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Enrôlement non trouvé' });
    }

    if (gigAgent.enrollmentStatus !== 'invited') {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Seuls les enrôlements en attente peuvent être refusés' 
      });
    }

    // Refuser l'enrôlement
    await gigAgent.rejectEnrollment(notes);

    // Envoyer une notification de refus
    try {
      await sendEmailNotification(gigAgent.agentId, gigAgent.gigId, 'rejected');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error);
    }

    res.status(StatusCodes.OK).json({
      message: 'Enrôlement refusé',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status,
        enrollmentNotes: gigAgent.enrollmentNotes
      }
    });

  } catch (error) {
    console.error('Error in rejectEnrollmentById:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Demander un enrôlement à un gig (pour un agent)
export const requestEnrollment = async (req, res) => {
  try {
    const { agentId, gigId, notes } = req.body;

    // Vérifier que l'agent et le gig existent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Agent not found' });
    }

    const gig = await Gig.findById(gigId);
    if (!gig) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Gig not found' });
    }

    // Vérifier si une assignation existe déjà
    let gigAgent = await GigAgent.findOne({ agentId, gigId });
    
    if (!gigAgent) {
      // Créer une nouvelle assignation avec statut de demande
      gigAgent = new GigAgent({
        agentId,
        gigId,
        status: 'pending',
        enrollmentStatus: 'requested',
        notes: notes || ''
      });
    } else {
      // Vérifier si l'agent peut faire une nouvelle demande
      if (!gigAgent.canRequestEnrollment()) {
        return res.status(StatusCodes.BAD_REQUEST).json({ 
          message: 'Une demande d\'enrôlement existe déjà et ne peut pas être modifiée' 
        });
      }
      
      // Mettre à jour l'assignation existante
      gigAgent.enrollmentStatus = 'requested';
      gigAgent.notes = notes || gigAgent.notes;
    }

    await gigAgent.save();

    res.status(StatusCodes.CREATED).json({
      message: 'Demande d\'enrôlement envoyée avec succès',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status,
        enrollmentNotes: gigAgent.enrollmentNotes
      }
    });

  } catch (error) {
    console.error('Error in requestEnrollment:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Accepter une demande d'enrôlement (pour la company)
export const acceptEnrollmentRequest = async (req, res) => {
  try {
    const { enrollmentId, notes } = req.body;

    const gigAgent = await GigAgent.findById(enrollmentId)
      .populate('agentId')
      .populate('gigId');

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Demande d\'enrôlement non trouvée' });
    }

    if (gigAgent.enrollmentStatus !== 'requested') {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Seules les demandes d\'enrôlement peuvent être acceptées' 
      });
    }

    // Accepter la demande d'enrôlement
    await gigAgent.acceptEnrollment(notes);

    // Envoyer une notification de confirmation
    try {
      await sendEmailNotification(gigAgent.agentId, gigAgent.gigId, 'accepted');
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de la notification:', emailError);
    }

    res.status(StatusCodes.OK).json({
      message: 'Demande d\'enrôlement acceptée avec succès',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status,
        enrollmentDate: gigAgent.enrollmentDate,
        enrollmentNotes: gigAgent.enrollmentNotes
      }
    });

  } catch (error) {
    console.error('Error in acceptEnrollmentRequest:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

// Refuser une demande d'enrôlement (pour la company)
export const rejectEnrollmentRequest = async (req, res) => {
  try {
    const { enrollmentId, notes } = req.body;

    const gigAgent = await GigAgent.findById(enrollmentId)
      .populate('agentId')
      .populate('gigId');

    if (!gigAgent) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Demande d\'enrôlement non trouvée' });
    }

    if (gigAgent.enrollmentStatus !== 'requested') {
      return res.status(StatusCodes.BAD_REQUEST).json({ 
        message: 'Seules les demandes d\'enrôlement peuvent être refusées' 
      });
    }

    // Refuser la demande d'enrôlement
    await gigAgent.rejectEnrollment(notes);

    // Envoyer une notification de refus
    try {
      await sendEmailNotification(gigAgent.agentId, gigAgent.gigId, 'rejected');
    } catch (emailError) {
      console.error('Erreur lors de l\'envoi de la notification:', emailError);
    }

    res.status(StatusCodes.OK).json({
      message: 'Demande d\'enrôlement refusée',
      gigAgent: {
        id: gigAgent._id,
        agentId: gigAgent.agentId,
        gigId: gigAgent.gigId,
        enrollmentStatus: gigAgent.enrollmentStatus,
        status: gigAgent.status,
        enrollmentNotes: gigAgent.enrollmentNotes
      }
    });

  } catch (error) {
    console.error('Error in rejectEnrollmentRequest:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};
