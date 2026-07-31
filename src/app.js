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
import timeSlotRoutes from './routes/timeSlotRoutes.js';
import slotRoutes from './routes/slotRoutes.js';

// Load environment variables
dotenv.config();

const app = express();

// Set up trust proxy for secure handling of headers
app.set('trust proxy', true);

const allowedOrigins = [
  'https://harx.ai',
  'https://harxv25matchingfrontend.netlify.app',
  'https://harx26harxconnection-dev.netlify.app',
  'https://harx26harxconnection.netlify.app',
  'http://localhost:5181',
  'https://v25.harx.ai',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:8100',
  'capacitor://localhost',
  'ionic://localhost',
];

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.harx.ai')
    ) {
      return callback(null, true);
    }
    console.log('CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
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
app.use('/api/time-slots', timeSlotRoutes);
app.use('/api/slots', slotRoutes);

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