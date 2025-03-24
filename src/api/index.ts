import axios from 'axios';
import { Rep, Gig, Match, MatchingWeights } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5011/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Rep API calls
export const getReps = async (): Promise<Rep[]> => {
  const response = await api.get('/reps');
  return response.data;
};

export const getRepById = async (id: string): Promise<Rep> => {
  const response = await api.get(`/reps/${id}`);
  return response.data;
};

export const createRep = async (rep: Omit<Rep, '_id'>): Promise<Rep> => {
  const response = await api.post('/reps', rep);
  return response.data;
};

export const updateRep = async (id: string, rep: Partial<Rep>): Promise<Rep> => {
  const response = await api.put(`/reps/${id}`, rep);
  return response.data;
};

export const deleteRep = async (id: string): Promise<void> => {
  await api.delete(`/reps/${id}`);
};

// Gig API calls
export const getGigs = async (): Promise<Gig[]> => {
  const response = await api.get('/gigs');
  return response.data;
};

export const getGigById = async (id: string): Promise<Gig> => {
  const response = await api.get(`/gigs/${id}`);
  return response.data;
};

export const createGig = async (gig: Omit<Gig, '_id'>): Promise<Gig> => {
  const response = await api.post('/gigs', gig);
  return response.data;
};

export const updateGig = async (id: string, gig: Partial<Gig>): Promise<Gig> => {
  const response = await api.put(`/gigs/${id}`, gig);
  return response.data;
};

export const deleteGig = async (id: string): Promise<void> => {
  await api.delete(`/gigs/${id}`);
};

// Match API calls
export const getMatches = async (): Promise<Match[]> => {
  const response = await api.get('/matches');
  return response.data;
};

export const getMatchById = async (id: string): Promise<Match> => {
  const response = await api.get(`/matches/${id}`);
  return response.data;
};

export const createMatch = async (match: Omit<Match, '_id'>): Promise<Match> => {
  const response = await api.post('/matches', match);
  return response.data;
};

export const updateMatch = async (id: string, match: Partial<Match>): Promise<Match> => {
  const response = await api.put(`/matches/${id}`, match);
  return response.data;
};

export const deleteMatch = async (id: string): Promise<void> => {
  await api.delete(`/matches/${id}`);
};

// Matching algorithm API calls
export const findMatchesForGig = async (
  gigId: string, 
  weights: MatchingWeights, 
  limit: number = 10
): Promise<Match[]> => {
  const response = await api.post(`/matches/gig/${gigId}/matches`, { weights, limit });
  return response.data;
};

export const findGigsForRep = async (
  repId: string, 
  weights: MatchingWeights, 
  limit: number = 10
): Promise<Match[]> => {
  const response = await api.post(`/matches/rep/${repId}/gigs`, { weights, limit });
  return response.data;
};

export const generateOptimalMatches = async (weights: MatchingWeights): Promise<Match[]> => {
  const response = await api.post('/matches/optimize', { weights });
  return response.data;
};

export default api;