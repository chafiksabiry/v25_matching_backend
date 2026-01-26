// Zoho CRM Configuration
import dotenv from 'dotenv';
dotenv.config();

const IS_PREPROD = process.env.IS_PREPROD === 'true';

export default {
  ZOHO_API_URL: process.env.ZOHO_API_URL || 'https://www.zohoapis.com/crm/v2',
  ZOHO_ACCESS_TOKEN: process.env.ZOHO_ACCESS_TOKEN || '1000.277f60c77e946bcc55d3e3cf90ff9e3d.08af6a6bd08b40f97a6854720c164a86',

  // SMTP Configuration (Nodemailer)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT) || 587,
  SMTP_USER: process.env.SMTP_USER || process.env.BREVO_FROM_EMAIL,
  SMTP_PASS: process.env.SMTP_PASS || process.env.BREVO_API_KEY,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || process.env.BREVO_FROM_EMAIL || 'chafik.sabiry@harx.ai',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Harx AI',

  // Application URL Configuration
  IS_PREPROD: IS_PREPROD,
  BASE_URL: IS_PREPROD ? 'https://harx25pageslinks.netlify.app' : 'https://harx25pageslinks.netlify.app'
};

// Log de vérification des variables d'environnement
console.log('Configuration Brevo:', {
  apiKey: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 10) + '...' : '***missing***',
  fromEmail: process.env.BREVO_FROM_EMAIL || 'chafik.sabiry@harx.ai',
  fromName: process.env.BREVO_FROM_NAME || 'Harx AI'
});

console.log('Configuration Application:', {
  isPreprod: IS_PREPROD,
  baseUrl: IS_PREPROD ? 'https://harx25pageslinks.netlify.app' : 'https://harx25pageslinks.netlify.app'
}); 