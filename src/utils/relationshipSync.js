import Agent from '../models/Agent.js';
import Gig from '../models/Gig.js';
import Company from '../models/Company.js';

/**
 * Synchronise la relation Agent-Gig dans les deux collections
 * @param {String} agentId - ID de l'agent
 * @param {String} gigId - ID du gig
 * @param {String} status - Statut de la relation (invited, requested, enrolled, rejected, expired, cancelled)
 * @param {Object} options - Options additionnelles (enrollmentDate, invitationDate)
 */
export const syncAgentGigRelationship = async (agentId, gigId, status, options = {}) => {
  try {
    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (options.enrollmentDate) {
      updateData.enrollmentDate = options.enrollmentDate;
    }
    if (options.invitationDate) {
      updateData.invitationDate = options.invitationDate;
    }

    // Mettre à jour dans Agent.gigs
    await Agent.findOneAndUpdate(
      { _id: agentId, 'gigs.gigId': gigId },
      {
        $set: {
          'gigs.$': {
            gigId,
            ...updateData
          }
        }
      }
    );

    // Si le gig n'existe pas encore dans l'array, l'ajouter
    const agent = await Agent.findById(agentId);
    const gigExists = agent?.gigs?.some(g => g.gigId.toString() === gigId.toString());
    
    if (!gigExists) {
      await Agent.findByIdAndUpdate(
        agentId,
        {
          $push: {
            gigs: {
              gigId,
              ...updateData
            }
          }
        }
      );
    }

    // Mettre à jour dans Gig.agents
    await Gig.findOneAndUpdate(
      { _id: gigId, 'agents.agentId': agentId },
      {
        $set: {
          'agents.$': {
            agentId,
            ...updateData
          }
        }
      }
    );

    // Si l'agent n'existe pas encore dans l'array, l'ajouter
    const gig = await Gig.findById(gigId);
    const agentExists = gig?.agents?.some(a => a.agentId.toString() === agentId.toString());
    
    if (!agentExists) {
      await Gig.findByIdAndUpdate(
        gigId,
        {
          $push: {
            agents: {
              agentId,
              ...updateData
            }
          }
        }
      );
    }

    console.log(`✅ Relationship synced: Agent ${agentId} <-> Gig ${gigId} (Status: ${status})`);
    return { success: true };

  } catch (error) {
    console.error('❌ Error syncing relationship:', error);
    throw error;
  }
};

/**
 * Supprime la relation Agent-Gig dans les deux collections
 * @param {String} agentId - ID de l'agent
 * @param {String} gigId - ID du gig
 */
export const removeAgentGigRelationship = async (agentId, gigId) => {
  try {
    // Supprimer de Agent.gigs
    await Agent.findByIdAndUpdate(
      agentId,
      {
        $pull: {
          gigs: { gigId }
        }
      }
    );

    // Supprimer de Gig.agents
    await Gig.findByIdAndUpdate(
      gigId,
      {
        $pull: {
          agents: { agentId }
        }
      }
    );

    console.log(`✅ Relationship removed: Agent ${agentId} <-> Gig ${gigId}`);
    return { success: true };

  } catch (error) {
    console.error('❌ Error removing relationship:', error);
    throw error;
  }
};

/**
 * Récupère tous les gigs d'un agent avec leurs détails complets
 * @param {String} agentId - ID de l'agent
 * @param {String} statusFilter - Filtrer par statut (optionnel)
 */
export const getAgentGigsWithDetails = async (agentId, statusFilter = null) => {
  try {
    const agent = await Agent.findById(agentId)
      .populate({
        path: 'gigs.gigId',
        populate: [
          { path: 'commission.currency' },
          { path: 'destination_zone' },
          { path: 'availability.time_zone' },
          { path: 'companyId' },
          { path: 'industries' },
          { path: 'activities' },
          { path: 'team.territories' },
          { path: 'skills.technical.skill' },
          { path: 'skills.professional.skill' },
          { path: 'skills.soft.skill' },
          { path: 'skills.languages.language' }
        ]
      });

    if (!agent) {
      throw new Error('Agent not found');
    }

    let gigs = agent.gigs || [];

    // Filtrer par statut si spécifié
    if (statusFilter) {
      gigs = gigs.filter(g => g.status === statusFilter);
    }

    // Transformer les données pour un format plus lisible
    const gigsWithDetails = gigs.map(gigEntry => ({
      gig: gigEntry.gigId,
      status: gigEntry.status,
      enrollmentDate: gigEntry.enrollmentDate,
      invitationDate: gigEntry.invitationDate,
      updatedAt: gigEntry.updatedAt
    }));

    return gigsWithDetails;

  } catch (error) {
    console.error('❌ Error getting agent gigs:', error);
    throw error;
  }
};

/**
 * Récupère tous les agents d'un gig avec leurs détails complets
 * @param {String} gigId - ID du gig
 * @param {String} statusFilter - Filtrer par statut (optionnel)
 */
export const getGigAgentsWithDetails = async (gigId, statusFilter = null) => {
  try {
    const gig = await Gig.findById(gigId)
      .populate({
        path: 'agents.agentId',
        populate: [
          { path: 'personalInfo.country' },
          { path: 'personalInfo.languages.language' },
          { path: 'professionalSummary.industries' },
          { path: 'professionalSummary.activities' },
          { path: 'skills.technical.skill' },
          { path: 'skills.professional.skill' },
          { path: 'skills.soft.skill' },
          { path: 'availability.timeZone' }
        ]
      });

    if (!gig) {
      throw new Error('Gig not found');
    }

    let agents = gig.agents || [];

    // Filtrer par statut si spécifié
    if (statusFilter) {
      agents = agents.filter(a => a.status === statusFilter);
    }

    // Transformer les données pour un format plus lisible
    const agentsWithDetails = agents.map(agentEntry => ({
      agent: agentEntry.agentId,
      status: agentEntry.status,
      enrollmentDate: agentEntry.enrollmentDate,
      invitationDate: agentEntry.invitationDate,
      updatedAt: agentEntry.updatedAt
    }));

    return agentsWithDetails;

  } catch (error) {
    console.error('❌ Error getting gig agents:', error);
    throw error;
  }
};

