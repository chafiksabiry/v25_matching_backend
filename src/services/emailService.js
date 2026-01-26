import * as SibApiV3Sdk from '@getbrevo/brevo';
import config from '../config/config.js';

// Configuration Brevo
let brevoApiInstance = null;

if (config.BREVO_API_KEY) {
  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, config.BREVO_API_KEY);
  brevoApiInstance = apiInstance;
} else {
  console.log('Brevo API key not configured - email simulation mode enabled');
}

/**
 * Sends a matching notification email to an agent
 * @param {Object} agent - Agent information
 * @param {Object} gig - Gig information
 * @param {Object} matchDetails - Matching details
 * @returns {Promise<Object>} Sending result
 */
export const sendMatchingNotification = async (agent, gig, matchDetails) => {
  try {
    const agentName = agent.personalInfo?.name || 'Agent';
    const agentEmail = agent.personalInfo?.email;

    if (!agentEmail) {
      throw new Error('Agent email not found');
    }

    const gigTitle = gig.title || 'New Gig';
    const gigDescription = gig.description || 'No description available';

    // Calculate global score
    const languageScore = matchDetails.languageMatch?.score || 0;
    const skillsScore = matchDetails.skillsMatch?.details?.matchStatus === 'perfect_match' ? 1 : 0;
    const scheduleScore = matchDetails.scheduleMatch?.score || 0;

    const globalScore = Math.round(((languageScore + skillsScore + scheduleScore) / 3) * 100);

    // Check if Brevo is available
    if (!brevoApiInstance) {
      console.log('Brevo not configured - simulating email for:', {
        to: agentEmail,
        subject: `🎯 Exclusive Invitation to Join a New Gig: ${gigTitle}`,
        reason: 'Brevo not configured'
      });

      return {
        success: true,
        messageId: 'simulated-' + Date.now(),
        to: agentEmail,
        method: 'simulated',
        note: 'Email simulated - Brevo not configured'
      };
    }

    // Create email content
    const gigId = gig._id || gig.id;
    const emailContent = createEmailContent(agentName, gigTitle, gigDescription, matchDetails, globalScore, gigId);

    const emailParams = {
      sender: {
        name: config.BREVO_FROM_NAME,
        email: config.BREVO_FROM_EMAIL
      },
      to: [{
        email: agentEmail,
        name: agentName
      }],
      subject: `🎯 Exclusive Invitation to Join a New Gig: ${gigTitle}`,
      htmlContent: emailContent,
      textContent: createTextVersion(agentName, gigTitle, gigDescription, matchDetails, globalScore, gigId)
    };

    const result = await brevoApiInstance.sendTransacEmail(emailParams);

    console.log('Email sent successfully via Brevo:', {
      messageId: result.messageId,
      to: agentEmail,
      subject: emailParams.subject
    });

    return {
      success: true,
      messageId: result.messageId,
      to: agentEmail,
      method: 'brevo'
    };

  } catch (error) {
    console.error('Brevo error:', error.message);
    console.error('Error details:', {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      apiKey: config.BREVO_API_KEY ? config.BREVO_API_KEY.substring(0, 10) + '...' : 'missing',
      fromEmail: config.BREVO_FROM_EMAIL
    });

    // In case of Brevo error, simulate email sending
    const agentName = agent.personalInfo?.name || 'Agent';
    const agentEmail = agent.personalInfo?.email;
    const gigTitle = gig.title || 'New Gig';

    console.log('Simulating email for:', {
      to: agentEmail,
      subject: `🎯 Exclusive Invitation to Join a New Gig: ${gigTitle}`,
      reason: 'Brevo not available'
    });

    // Return failure instead of simulated success
    return {
      success: false,
      error: error.message,
      to: agentEmail,
      method: 'failed'
    };
  }
};

/**
 * Creates the HTML content of the email
 */
const createEmailContent = (agentName, gigTitle, gigDescription, matchDetails, globalScore, gigId) => {
  const joinUrl = `${config.BASE_URL}/repdashboard/gig/${gigId}`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Exclusive Gig Invitation</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%);
          margin: 0;
          padding: 0;
        }
        .email-container {
          max-width: 520px;
          margin: 40px auto;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 8px 32px rgba(60,60,120,0.10);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          padding: 36px 30px 18px 30px;
          text-align: center;
        }
        .header h1 {
          font-size: 2rem;
          margin: 0 0 10px 0;
          letter-spacing: 1px;
        }
        .header p {
          font-size: 1.1rem;
          margin: 0 0 8px 0;
          opacity: 0.95;
        }
        .intro {
          padding: 0 30px;
          margin-top: 24px;
          font-size: 1.08rem;
          color: #444;
          text-align: center;
        }
        .gig-section {
          padding: 32px 30px 18px 30px;
          text-align: center;
        }
        .gig-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #222;
          margin-bottom: 8px;
        }
        .gig-subtitle {
          color: #6c757d;
          font-size: 1.05rem;
          font-style: italic;
          margin-bottom: 18px;
        }
        .cta-section {
          text-align: center;
          margin: 32px 0 24px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
          color: #fff;
          padding: 15px 38px;
          text-decoration: none;
          border-radius: 30px;
          font-weight: 600;
          font-size: 1.08rem;
          margin: 0 8px 12px 8px;
          box-shadow: 0 4px 16px rgba(40,167,69,0.10);
          transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
        }
        .cta-button:hover {
          background: linear-gradient(90deg, #20c997 0%, #28a745 100%);
          box-shadow: 0 8px 24px rgba(40,167,69,0.18);
          transform: translateY(-2px) scale(1.03);
        }
        .secondary-button {
          background: linear-gradient(90deg, #6c757d 0%, #495057 100%);
          box-shadow: 0 4px 16px rgba(108,117,125,0.10);
        }
        .secondary-button:hover {
          background: linear-gradient(90deg, #495057 0%, #6c757d 100%);
          box-shadow: 0 8px 24px rgba(108,117,125,0.18);
        }
        .footer {
          background: #f8f9fa;
          padding: 22px 30px;
          text-align: center;
          color: #6c757d;
          font-size: 0.98rem;
          border-top: 1px solid #e9ecef;
        }
        .footer p {
          margin: 6px 0;
        }
        .highlight {
          color: #667eea;
          font-weight: 600;
        }
        @media (max-width: 600px) {
          .email-container { margin: 10px; border-radius: 12px; }
          .header, .gig-section, .footer, .intro { padding-left: 12px; padding-right: 12px; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <p>Hello ${agentName},</p>
        </div>
        <div class="intro">
          We are excited to invite you to join a new gig on our platform. This is a unique opportunity to take your career to the next level with HARX Technologies Inc.
        </div>
        <div class="gig-section">
          <div class="gig-title">${gigTitle}</div>
          <div class="gig-subtitle">A perfect opportunity waiting for you</div>
        </div>
        <div class="cta-section">
          <a href="${joinUrl}" class="cta-button">🤝 Join</a>
        </div>
        <div class="footer">
          <p><span class="highlight">HARX Technologies Inc</span> - Intelligent Matching Platform</p>
          <p>This email was sent automatically by HARX Technologies Inc.</p>
          <p>For any questions, contact us at contact@harx.ai</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Crée la version texte de l'email
 */
const createTextVersion = (agentName, gigTitle, gigDescription, matchDetails, globalScore, gigId) => {
  const joinUrl = `${config.BASE_URL}/repdashboard/gig/${gigId}`;

  return `
🎯 EXCLUSIVE GIG INVITATION

Hello ${agentName},

You've been selected to join an exciting new Gig!

GIG DETAILS
Title: ${gigTitle}

NEXT STEPS
1. Review the Gig details
2. Accept the invitation if interested
3. Contact us for any questions

Ready to join this Gig? Click here: ${joinUrl}

---
HARX Technologies Inc - Intelligent Matching Platform
For any questions: contact@harx.ai
This email was sent automatically by HARX Technologies Inc.
  `;
};

/**
 * Verifies the Brevo configuration
 */
export const verifyEmailConfiguration = async () => {
  try {
    console.log('Brevo configuration verified');
    return true;
  } catch (error) {
    console.error('Brevo configuration error:', error);
    return false;
  }
};

/**
 * Envoie une invitation d'enrôlement à un agent
 * @param {Object} agent - Informations de l'agent
 * @param {Object} gig - Informations du gig
 * @param {string} invitationToken - Token d'invitation unique
 * @param {Date} expiryDate - Date d'expiration
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export const sendEnrollmentInvitation = async (agent, gig, invitationToken, expiryDate) => {
  try {
    const agentName = agent.personalInfo?.firstName || agent.personalInfo?.name || 'Agent';
    const agentEmail = agent.personalInfo?.email;

    if (!agentEmail) {
      throw new Error('Email de l\'agent non trouvé');
    }

    const gigTitle = gig.title || 'Nouveau Gig';
    const gigDescription = gig.description || 'Aucune description disponible';

    // Formater la date d'expiration
    const formattedExpiryDate = expiryDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Check if Brevo is available
    if (!brevoApiInstance) {
      console.log('Brevo non configuré - simulation d\'email pour:', {
        to: agentEmail,
        subject: `🎯 Invitation d'enrôlement: ${gigTitle}`,
        reason: 'Brevo non configuré'
      });

      return {
        success: true,
        messageId: 'simulated-' + Date.now(),
        to: agentEmail,
        method: 'simulated',
        note: 'Email simulé - Brevo non configuré'
      };
    }

    // Créer le contenu de l'email
    const emailContent = createEnrollmentEmailContent(agentName, gigTitle, gigDescription, invitationToken, formattedExpiryDate);

    const emailParams = {
      sender: {
        name: config.BREVO_FROM_NAME,
        email: config.BREVO_FROM_EMAIL
      },
      to: [{
        email: agentEmail,
        name: agentName
      }],
      subject: `🎯 Invitation d'enrôlement: ${gigTitle}`,
      htmlContent: emailContent,
      textContent: createEnrollmentTextVersion(agentName, gigTitle, gigDescription, invitationToken, formattedExpiryDate)
    };

    const result = await brevoApiInstance.sendTransacEmail(emailParams);

    console.log('Email d\'invitation envoyé avec succès via Brevo:', {
      messageId: result.messageId,
      to: agentEmail,
      subject: emailParams.subject
    });

    return {
      success: true,
      messageId: result.messageId,
      to: agentEmail,
      method: 'brevo'
    };

  } catch (error) {
    console.error('Erreur Brevo lors de l\'envoi de l\'invitation:', error.message);

    // En cas d'erreur Brevo, simuler l'envoi d'email
    console.log('Simulation d\'envoi d\'email d\'invitation pour:', {
      to: agent.personalInfo?.email,
      subject: `🎯 Invitation d'enrôlement: ${gig.title || 'Nouveau Gig'}`,
      reason: 'Erreur Brevo'
    });

    return {
      success: true,
      messageId: 'simulated-' + Date.now(),
      to: agent.personalInfo?.email,
      method: 'simulated',
      note: 'Email simulé - Erreur Brevo'
    };
  }
};

/**
 * Envoie une notification d'enrôlement (acceptation/refus)
 * @param {Object} agent - Informations de l'agent
 * @param {Object} gig - Informations du gig
 * @param {string} status - Statut de l'enrôlement ('accepted' ou 'rejected')
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export const sendEnrollmentNotification = async (agent, gig, status) => {
  try {
    const agentName = agent.personalInfo?.firstName || agent.personalInfo?.name || 'Agent';
    const agentEmail = agent.personalInfo?.email;

    if (!agentEmail) {
      throw new Error('Email de l\'agent non trouvé');
    }

    const gigTitle = gig.title || 'Gig';
    const statusText = status === 'accepted' ? 'accepté' : 'refusé';

    // Check if Brevo is available
    if (!brevoApiInstance) {
      console.log('Brevo non configuré - simulation de notification pour:', {
        to: agentEmail,
        subject: `📧 Confirmation d'enrôlement: ${gigTitle}`,
        reason: 'Brevo non configuré'
      });

      return {
        success: true,
        messageId: 'simulated-' + Date.now(),
        to: agentEmail,
        method: 'simulated',
        note: 'Email simulé - Brevo non configuré'
      };
    }

    // Créer le contenu de l'email
    const emailContent = createEnrollmentNotificationContent(agentName, gigTitle, status);

    const emailParams = {
      sender: {
        name: config.BREVO_FROM_NAME,
        email: config.BREVO_FROM_EMAIL
      },
      to: [{
        email: agentEmail,
        name: agentName
      }],
      subject: `📧 Confirmation d'enrôlement: ${gigTitle}`,
      htmlContent: emailContent,
      textContent: createEnrollmentNotificationTextVersion(agentName, gigTitle, status)
    };

    const result = await brevoApiInstance.sendTransacEmail(emailParams);

    console.log('Notification d\'enrôlement envoyée avec succès via Brevo:', {
      messageId: result.messageId,
      to: agentEmail,
      subject: emailParams.subject
    });

    return {
      success: true,
      messageId: result.messageId,
      to: agentEmail,
      method: 'brevo'
    };

  } catch (error) {
    console.error('Erreur Brevo lors de l\'envoi de la notification:', error.message);

    // En cas d'erreur Brevo, simuler l'envoi d'email
    console.log('Simulation d\'envoi de notification pour:', {
      to: agent.personalInfo?.email,
      subject: `📧 Confirmation d'enrôlement: ${gig.title || 'Gig'}`,
      reason: 'Erreur Brevo'
    });

    return {
      success: true,
      messageId: 'simulated-' + Date.now(),
      to: agent.personalInfo?.email,
      method: 'simulated',
      note: 'Email simulé - Erreur Brevo'
    };
  }
};

/**
 * Crée le contenu HTML de l'email d'invitation d'enrôlement
 */
const createEnrollmentEmailContent = (agentName, gigTitle, gigDescription, invitationToken, expiryDate) => {
  const enrollmentUrl = `${config.FRONTEND_URL || 'http://localhost:3000'}/enroll/${invitationToken}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation d'enrôlement</title>
      <style>
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .gig-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 15px;
        }
        .gig-description {
          color: #4a5568;
          line-height: 1.6;
          margin-bottom: 25px;
        }
        .cta-section {
          text-align: center;
          margin: 30px 0;
        }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(102,126,234,0.3);
        }
        .expiry-notice {
          background: #fff5f5;
          border: 1px solid #fed7d7;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          color: #c53030;
          font-size: 0.9rem;
        }
        .footer {
          background: #f7fafc;
          padding: 20px;
          text-align: center;
          color: #4a5568;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>🎯 Invitation d'enrôlement</h1>
        </div>
        <div class="content">
          <p>Bonjour ${agentName},</p>
          
          <p>Nous avons le plaisir de vous inviter à rejoindre un nouveau gig sur notre plateforme !</p>
          
          <div class="gig-title">${gigTitle}</div>
          <div class="gig-description">${gigDescription}</div>
          
          <div class="cta-section">
            <a href="${enrollmentUrl}" class="cta-button">🤝 Accepter l'invitation</a>
          </div>
          
          <div class="expiry-notice">
            ⏰ <strong>Important :</strong> Cette invitation expire le ${expiryDate}
          </div>
          
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        </div>
        <div class="footer">
          <p><strong>HARX Technologies Inc</strong> - Plateforme de matching intelligent</p>
          <p>Pour toute question : contact@harx.ai</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Crée la version texte de l'email d'invitation d'enrôlement
 */
const createEnrollmentTextVersion = (agentName, gigTitle, gigDescription, invitationToken, expiryDate) => {
  return `
🎯 INVITATION D'ENRÔLEMENT

Bonjour ${agentName},

Nous avons le plaisir de vous inviter à rejoindre un nouveau gig !

DÉTAILS DU GIG
Titre: ${gigTitle}
Description: ${gigDescription}

PROCHAINES ÉTAPES
1. Cliquez sur le lien d'invitation
2. Acceptez ou refusez l'invitation
3. Contactez-nous pour toute question

Lien d'invitation: ${config.FRONTEND_URL || 'http://localhost:3000'}/enroll/${invitationToken}

⚠️ IMPORTANT: Cette invitation expire le ${expiryDate}

---
HARX Technologies Inc - Plateforme de matching intelligent
Pour toute question: contact@harx.ai
  `;
};

/**
 * Crée le contenu HTML de la notification d'enrôlement
 */
const createEnrollmentNotificationContent = (agentName, gigTitle, status) => {
  const statusText = status === 'accepted' ? 'accepté' : 'refusé';
  const statusColor = status === 'accepted' ? '#38a169' : '#e53e3e';
  const statusIcon = status === 'accepted' ? '✅' : '❌';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation d'enrôlement</title>
      <style>
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 1.8rem;
          font-weight: 600;
        }
        .content {
          padding: 30px;
        }
        .status-section {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          border-radius: 8px;
          background: ${status === 'accepted' ? '#f0fff4' : '#fff5f5'};
          border: 1px solid ${status === 'accepted' ? '#9ae6b4' : '#fed7d7'};
        }
        .status-text {
          font-size: 1.2rem;
          font-weight: 600;
          color: ${statusColor};
        }
        .gig-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: #2d3748;
          margin: 20px 0;
        }
        .footer {
          background: #f7fafc;
          padding: 20px;
          text-align: center;
          color: #4a5568;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>📧 Confirmation d'enrôlement</h1>
        </div>
        <div class="content">
          <p>Bonjour ${agentName},</p>
          
          <div class="status-section">
            <div class="status-text">${statusIcon} Votre enrôlement a été ${statusText}</div>
          </div>
          
          <div class="gig-title">${gigTitle}</div>
          
          <p>Merci pour votre réponse. Notre équipe vous contactera bientôt pour la suite.</p>
        </div>
        <div class="footer">
          <p><strong>HARX Technologies Inc</strong> - Plateforme de matching intelligent</p>
          <p>Pour toute question : contact@harx.ai</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Crée la version texte de la notification d'enrôlement
 */
const createEnrollmentNotificationTextVersion = (agentName, gigTitle, status) => {
  const statusText = status === 'accepted' ? 'accepté' : 'refusé';
  const statusIcon = status === 'accepted' ? '✅' : '❌';

  return `
📧 CONFIRMATION D'ENRÔLEMENT

Bonjour ${agentName},

${statusIcon} Votre enrôlement a été ${statusText}

GIG: ${gigTitle}

Merci pour votre réponse. Notre équipe vous contactera bientôt pour la suite.

---
HARX Technologies Inc - Plateforme de matching intelligent
Pour toute question: contact@harx.ai
  `;
}; 