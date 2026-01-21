import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import gigRoutes from './routes/gigRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import gigAgentRoutes from './routes/gigAgentRoutes.js';
import gigMatchingWeightsRoutes from './routes/gigMatchingWeightsRoutes.js';
import enrollmentRoutes from './routes/enrollmentRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Set up trust proxy for secure handling of headers
app.set('trust proxy', true);

const corsOptions = {
  origin: [
    'https://harx25pageslinks.netlify.app',
    'https://harx25pageslinks.netlify.app',
    'https://harxv25matchingfrontend.netlify.app/',
    'http://localhost:5181',
    'https://harxv25matchingfrontend.netlify.app/',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Routes
app.use('/api/gigs', gigRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/gig-agents', gigAgentRoutes);
app.use('/api/gig-matching-weights', gigMatchingWeightsRoutes);
app.use('/api/enrollment', enrollmentRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 