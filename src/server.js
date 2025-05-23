// src/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { testConnection, closePool } from './config/database.js';
import logger from './utils/logger.js';
import errorHandler from './middleware/errorHandler.js';
import notFound from './middleware/notFound.js';

// Import routes
import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import contactRoutes from './routes/contacts.js';
import policyRoutes from './routes/policies.js';
import claimRoutes from './routes/claims.js';
import taskRoutes from './routes/tasks.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Gzip compression
app.use(limiter); // Rate limiting
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/companies`, companyRoutes);
app.use(`/api/${API_VERSION}/contacts`, contactRoutes);
app.use(`/api/${API_VERSION}/policies`, policyRoutes);
app.use(`/api/${API_VERSION}/claims`, claimRoutes);
app.use(`/api/${API_VERSION}/tasks`, taskRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API documentation endpoint
app.get(`/api/${API_VERSION}`, (req, res) => {
  res.json({
    message: 'Insurance CRM API',
    version: API_VERSION,
    endpoints: {
      auth: `/api/${API_VERSION}/auth`,
      companies: `/api/${API_VERSION}/companies`,
      contacts: `/api/${API_VERSION}/contacts`,
      policies: `/api/${API_VERSION}/policies`,
      claims: `/api/${API_VERSION}/claims`,
      tasks: `/api/${API_VERSION}/tasks`,
      reports: `/api/${API_VERSION}/reports`,
      dashboard: `/api/${API_VERSION}/dashboard`,
    },
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received. Starting graceful shutdown...`);
  
  server.close(async (err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('HTTP server closed.');
    
    // Close database connections
    await closePool();
    
    console.log('Graceful shutdown completed.');
    process.exit(0);
  });
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/api/${API_VERSION}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;