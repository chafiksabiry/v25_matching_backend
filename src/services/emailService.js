import nodemailer from 'nodemailer';
import config from '../config/config.js';

/** Shared HARX brand styles for transactional emails */
const HARX_EMAIL_STYLES = `
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, #fff5f5 0%, #fdf2f8 100%);
    margin: 0;
    padding: 0;
  }
  .email-container {
    max-width: 520px;
    margin: 40px auto;
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 8px 32px rgba(255, 77, 77, 0.14);
    overflow: hidden;
    border: 1px solid #ffe0e0;
  }
  .header {
    background: linear-gradient(90deg, #ff4d4d 0%, #ec4899 100%);
    color: #ffffff;
    padding: 36px 30px 24px 30px;
    text-align: center;
  }
  .header h1 {
    font-size: 1.75rem;
    margin: 0 0 10px 0;
    letter-spacing: 0.5px;
    font-weight: 700;
  }
  .header p {
    font-size: 1.1rem;
    margin: 0;
    opacity: 0.98;
  }
  .intro, .content {
    padding: 0 30px;
    margin-top: 24px;
    font-size: 1.05rem;
    color: #4a1d34;
    line-height: 1.6;
    text-align: center;
  }
  .content {
    text-align: left;
    padding: 30px;
    margin-top: 0;
  }
  .gig-section {
    padding: 32px 30px 18px 30px;
    text-align: center;
  }
  .gig-title {
    font-size: 1.6rem;
    font-weight: 700;
    color: #500724;
    margin-bottom: 8px;
  }
  .gig-subtitle, .gig-description {
    color: #9d174d;
    font-size: 1.05rem;
    font-style: italic;
    margin-bottom: 18px;
    line-height: 1.6;
  }
  .gig-description {
    font-style: normal;
    text-align: left;
  }
  .cta-section {
    text-align: center;
    margin: 32px 0 24px 0;
  }
  .cta-button {
    display: inline-block;
    background: linear-gradient(90deg, #ff4d4d 0%, #ec4899 100%);
    color: #ffffff !important;
    padding: 15px 38px;
    text-decoration: none;
    border-radius: 9999px;
    font-weight: 700;
    font-size: 1.08rem;
    margin: 0 8px 12px 8px;
    box-shadow: 0 4px 16px rgba(255, 77, 77, 0.28);
  }
  .expiry-notice {
    background: #fff5f5;
    border: 1px solid #ffc2c2;
    border-radius: 12px;
    padding: 15px;
    margin: 20px 0;
    color: #be185d;
    font-size: 0.95rem;
  }
  .status-section {
    text-align: center;
    margin: 30px 0;
    padding: 20px;
    border-radius: 12px;
  }
  .status-text {
    font-size: 1.2rem;
    font-weight: 700;
  }
  .footer {
    background: #fff5f5;
    padding: 22px 30px;
    text-align: center;
    color: #831843;
    font-size: 0.98rem;
    border-top: 1px solid #ffe0e0;
  }
  .footer p {
    margin: 6px 0;
  }
  .highlight {
    color: #ff4d4d;
    font-weight: 700;
  }
  @media (max-width: 600px) {
    .email-container { margin: 10px; border-radius: 12px; }
    .header, .gig-section, .footer, .intro, .content { padding-left: 12px; padding-right: 12px; }
  }
`;

// Transporter configuration helper
const getTransporter = () => {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

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

    const languageScore = matchDetails.languageMatch?.score || 0;
    const skillsScore = matchDetails.skillsMatch?.details?.matchStatus === 'perfect_match' ? 1 : 0;
    const scheduleScore = matchDetails.scheduleMatch?.score || 0;

    const globalScore = Math.round(((languageScore + skillsScore + scheduleScore) / 3) * 100);

    const transporter = getTransporter();
    const gigId = gig._id || gig.id;

    const mailOptions = {
      from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
      to: agentEmail,
      subject: `🎯 Exclusive Invitation to Join a New Gig: ${gigTitle}`,
      html: createEmailContent(agentName, gigTitle, gigDescription, matchDetails, globalScore, gigId),
      text: createTextVersion(agentName, gigTitle, gigDescription, matchDetails, globalScore, gigId)
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully via SMTP:', {
      messageId: info.messageId,
      to: agentEmail,
      subject: mailOptions.subject
    });

    return {
      success: true,
      messageId: info.messageId,
      to: agentEmail,
      method: 'smtp'
    };

  } catch (error) {
    console.error('SMTP error in sendMatchingNotification:', error.message);
    return {
      success: false,
      error: error.message,
      to: agent.personalInfo?.email,
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
      <style>${HARX_EMAIL_STYLES}</style>
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

export const verifyEmailConfiguration = async () => {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('SMTP configuration verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP configuration error:', error.message);
    return false;
  }
};

export const sendEnrollmentInvitation = async (agent, gig, invitationToken, expiryDate) => {
  try {
    const agentName = agent.personalInfo?.firstName || agent.personalInfo?.name || 'Agent';
    const agentEmail = agent.personalInfo?.email;

    if (!agentEmail) {
      throw new Error('Email de l\'agent non trouvé');
    }

    const gigTitle = gig.title || 'Nouveau Gig';
    const gigDescription = gig.description || 'Aucune description disponible';

    const formattedExpiryDate = expiryDate.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const transporter = getTransporter();
    const mailOptions = {
      from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
      to: agentEmail,
      subject: `🎯 Invitation d'enrôlement: ${gigTitle}`,
      html: createEnrollmentEmailContent(agentName, gigTitle, gigDescription, invitationToken, formattedExpiryDate),
      text: createEnrollmentTextVersion(agentName, gigTitle, gigDescription, invitationToken, formattedExpiryDate)
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Enrollment invitation sent successfully via SMTP:', {
      messageId: info.messageId,
      to: agentEmail
    });

    return {
      success: true,
      messageId: info.messageId,
      to: agentEmail,
      method: 'smtp'
    };

  } catch (error) {
    console.error('SMTP error in sendEnrollmentInvitation:', error.message);
    return {
      success: false,
      error: error.message,
      to: agent.personalInfo?.email,
      method: 'failed'
    };
  }
};

export const sendEnrollmentNotification = async (agent, gig, status) => {
  try {
    const agentName = agent.personalInfo?.firstName || agent.personalInfo?.name || 'Agent';
    const agentEmail = agent.personalInfo?.email;

    if (!agentEmail) {
      throw new Error('Email de l\'agent non trouvé');
    }

    const gigTitle = gig.title || 'Gig';
    const transporter = getTransporter();

    const mailOptions = {
      from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM_EMAIL}>`,
      to: agentEmail,
      subject: `📧 Confirmation d'enrôlement: ${gigTitle}`,
      html: createEnrollmentNotificationContent(agentName, gigTitle, status),
      text: createEnrollmentNotificationTextVersion(agentName, gigTitle, status)
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Enrollment notification sent successfully via SMTP:', {
      messageId: info.messageId,
      to: agentEmail
    });

    return {
      success: true,
      messageId: info.messageId,
      to: agentEmail,
      method: 'smtp'
    };

  } catch (error) {
    console.error('SMTP error in sendEnrollmentNotification:', error.message);
    return {
      success: false,
      error: error.message,
      to: agent.personalInfo?.email,
      method: 'failed'
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
      <style>${HARX_EMAIL_STYLES}</style>
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
          <p><span class="highlight">HARX Technologies Inc</span> - Plateforme de matching intelligent</p>
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
  const statusIcon = status === 'accepted' ? '✅' : '❌';
  const statusSectionStyle =
    status === 'accepted'
      ? 'background: #fff5f5; border: 1px solid #ffc2c2;'
      : 'background: #fdf2f8; border: 1px solid #fbcfe8;';
  const statusTextColor = status === 'accepted' ? '#ff3333' : '#db2777';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation d'enrôlement</title>
      <style>${HARX_EMAIL_STYLES}</style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>📧 Confirmation d'enrôlement</h1>
        </div>
        <div class="content">
          <p>Bonjour ${agentName},</p>
          
          <div class="status-section" style="${statusSectionStyle}">
            <div class="status-text" style="color: ${statusTextColor};">${statusIcon} Votre enrôlement a été ${statusText}</div>
          </div>
          
          <div class="gig-title">${gigTitle}</div>
          
          <p>Merci pour votre réponse. Notre équipe vous contactera bientôt pour la suite.</p>
        </div>
        <div class="footer">
          <p><span class="highlight">HARX Technologies Inc</span> - Plateforme de matching intelligent</p>
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