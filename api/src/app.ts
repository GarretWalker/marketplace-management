import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { errorHandler } from './middleware/error-handler.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import routes from './routes';

const app: Application = express();

// Security & Performance Middleware
app.use(helmet());
app.use(cors());
app.use(compression());

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(requestLogger);

// Routes
app.use('/api', routes);

// Error Handler (must be last)
app.use(errorHandler);

export default app;
