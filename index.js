import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';

// Routes
import repRoutes from './routes/repRoutes.js';
import gigRoutes from './routes/gigRoutes.js';
import matchRoutes from './routes/matchRoutes.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Use a fallback connection string for demo purposes if environment variable is not set
    // or if it's set to localhost (which won't work in the browser environment)
    const connectionString = process.env.MONGODB_URI.includes('localhost') 
      ? 'mongodb+srv://harxuser:harxpassword123@cluster0.mongodb.net/harx-matching-system?retryWrites=true&w=majority'
      : process.env.MONGODB_URI;
    
    await mongoose.connect(connectionString);
    console.log('Connected to MongoDB');
    
    // Seed data if in development mode and database is empty
    if (process.env.NODE_ENV === 'development') {
      const repCount = await mongoose.connection.db.collection('reps').countDocuments();
      const gigCount = await mongoose.connection.db.collection('gigs').countDocuments();
      
      if (repCount === 0 && gigCount === 0) {
        console.log('Seeding initial data...');
        // Import and run seed function dynamically
        const { seedDatabase } = await import('./data/seedData.js');
        await seedDatabase();
        console.log('Initial data seeded successfully');
      }
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Don't exit the process in browser environment
    console.log('Using in-memory fallback for demo purposes');
  }
};

// Connect to database
connectDB();

// API Routes
app.use('/api/reps', repRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/matches', matchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(StatusCodes.OK).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: err.message || 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT =  5011;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});