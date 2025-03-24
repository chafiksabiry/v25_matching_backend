const API_BASE_URL = 'http://localhost:5011/api';

// Fonction pour récupérer tous les reps
export const getReps = async () => {
  console.log('getReps called');
  try {
    // Récupérer le token depuis votre stockage (localStorage, sessionStorage, etc.)
    const token = "1000.4e1963773c659a07e4cffceb278a1073.fa11c6710e0f7a7516a58185fd38289e"; // ou tout autre moyen de stockage que vous utilisez

    const response = await fetch(`http://localhost:5005/api/zoho/leads/pipeline`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // Si la réponse n'est pas 2xx, lancer une erreur
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erreur lors de la récupération des données');
    }

    const data = await response.json();
    console.log('Parsed getReps response:', data.data.data);
    
    // Si vous voulez accéder directement aux deals
    return data.data.data || []; // Zoho renvoie généralement les données dans data.data
  } catch (error) {
    console.error('Error in getReps:', error);
    throw error;
  }
};

// Fonction pour récupérer tous les gigs
export const getGigs = async () => {
  console.log('getGigs called');
  try {
    const response = await fetch(`${API_BASE_URL}/gigs`);
    console.log('Raw getGigs response:', response);
    const data = await response.json();
    console.log('Parsed getGigs response:', data);
    return data;
  } catch (error) {
    console.error('Error in getGigs:', error);
    throw error;
  }
};

// Fonction pour trouver les matches pour un gig
export const findMatchesForGig = async (gigId: string, weights: any) => {
  console.log('findMatchesForGig called with:', { gigId, weights });
  try {
    const response = await fetch(`${API_BASE_URL}/matches/gig/${gigId}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    console.log('Raw API response:', response);
    const data = await response.json();
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error in findMatchesForGig:', error);
    throw error;
  }
};

// Fonction pour trouver les gigs pour un rep
export const findGigsForRep = async (repId: string, weights: any) => {
  console.log('findGigsForRep called with:', { repId, weights });
  try {
    const response = await fetch(`${API_BASE_URL}/matches/rep/${repId}/gigs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    console.log('Raw API response:', response);
    const data = await response.json();
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error in findGigsForRep:', error);
    throw error;
  }
};

// Fonction pour générer les matches optimaux
export const generateOptimalMatches = async (weights: any) => {
  console.log('generateOptimalMatches called with weights:', weights);
  try {
    const response = await fetch(`${API_BASE_URL}/matches/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weights }),
    });
    console.log('Raw API response:', response);
    const data = await response.json();
    console.log('Parsed API response:', data);
    return data;
  } catch (error) {
    console.error('Error in generateOptimalMatches:', error);
    throw error;
  }
}; 