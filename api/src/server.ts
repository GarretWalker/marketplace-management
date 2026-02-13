import app from './app';
import { config } from './config/environment';
import { logger } from './config/pino';

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(
    {
      port: PORT,
      env: config.NODE_ENV,
      supabaseUrl: config.SUPABASE_URL,
    },
    'Shop Local API server started'
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
