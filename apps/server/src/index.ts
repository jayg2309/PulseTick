import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectDatabase } from './config/database';
import { configureCloudinary } from './config/cloudinary';
import { authenticateSocket } from './sockets/socketAuth';
import { SocketHandlers } from './sockets/socketHandlers';
import { CleanupService } from './services/cleanupService';
import { logger } from './config/logger';

const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();
    
    // Configure Cloudinary
    configureCloudinary();

    // Create Express app and Socket.io server
    const { app, server, io } = createApp();

    // Socket.io authentication middleware
    io.use(authenticateSocket);

    // Initialize socket handlers
    const socketHandlers = new SocketHandlers(io);
    io.on('connection', socketHandlers.handleConnection);

    // Start cleanup service
    CleanupService.scheduleCleanup();

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔌 Socket.io ready for connections`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
