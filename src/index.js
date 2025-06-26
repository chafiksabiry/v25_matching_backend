import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import gigRoutes from './routes/gigRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import gigAgentRoutes from './routes/gigAgentRoutes.js';

dotenv.config();

const app = express();

// Middleware
const corsOptions = {
  origin: [
    'https://v25.harx.ai',
    'https://v25-preprod.harx.ai',
    'https://matching.harx.ai/'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/gigs', gigRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/reps', agentRoutes);
app.use('/api/gig-agents', gigAgentRoutes);

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/matching';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Start server
const PORT = process.env.PORT || 5011;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 