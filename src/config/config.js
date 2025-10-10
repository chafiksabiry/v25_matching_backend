// Zoho CRM Configuration
import dotenv from 'dotenv';
dotenv.config();

const IS_PREPROD = process.env.IS_PREPROD === 'true';

export default {
  ZOHO_API_URL: process.env.ZOHO_API_URL || 'https://www.zohoapis.com/crm/v2',
  ZOHO_ACCESS_TOKEN: process.env.ZOHO_ACCESS_TOKEN || '1000.277f60c77e946bcc55d3e3cf90ff9e3d.08af6a6bd08b40f97a6854720c164a86',
  
  // Brevo Configuration (anciennement Sendinblue)
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_FROM_EMAIL: process.env.BREVO_FROM_EMAIL || 'chafik.sabiry@harx.ai',
  BREVO_FROM_NAME: process.env.BREVO_FROM_NAME || 'Harx AI',
  
  // Application URL Configuration
  IS_PREPROD: IS_PREPROD,
  JOIN_URL: IS_PREPROD ? 'https://v25-preprod.harx.ai/app11' : 'https://v25.harx.ai/app11'
};

// Log de vérification des variables d'environnement
console.log('Configuration Brevo:', {
  apiKey: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.substring(0, 10) + '...' : '***missing***',
  fromEmail: process.env.BREVO_FROM_EMAIL || 'chafik.sabiry@harx.ai',
  fromName: process.env.BREVO_FROM_NAME || 'Harx AI'
});

console.log('Configuration Application:', {
  isPreprod: IS_PREPROD,
  joinUrl: IS_PREPROD ? 'https://v25-preprod.harx.ai/app11' : 'https://v25.harx.ai/app11'
}); 