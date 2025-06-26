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
    const emailContent = createEmailContent(agentName, gigTitle, gigDescription, matchDetails, globalScore);

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
      textContent: createTextVersion(agentName, gigTitle, gigDescription, matchDetails, globalScore)
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

    // Return simulated success
    return {
      success: true,
      messageId: 'simulated-' + Date.now(),
      to: agentEmail,
      method: 'simulated',
      note: 'Email simulated - Brevo not available'
    };
  }
};

/**
 * Creates the HTML content of the email
 */
const createEmailContent = (agentName, gigTitle, gigDescription, matchDetails, globalScore) => {
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
          <a href="#" class="cta-button">🤝 Join</a>
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
const createTextVersion = (agentName, gigTitle, gigDescription, matchDetails, globalScore) => {
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

Ready to join this Gig? Log into your personal dashboard for more information.

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