import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import type { Environment } from './config/env-schema.js';
import { createCorsOptions } from './config/cors.js';
import { healthRoutes } from './routes/health-routes.js';
import { v1Routes } from './routes/v1-routes.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';
import type { Database } from './db/index.js';
import { domainRoutes } from './routes/domain-routes.js';

export function createApp(config: Environment, db?: Database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  // Log the method and status only; URLs/query strings can contain sensitive information.
  if (config.NODE_ENV !== 'test') app.use(morgan(':method :status :response-time ms'));
  app.use(cors(createCorsOptions(config)));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', healthRoutes);
  app.use('/api/v1', v1Routes);
  if (db) app.use('/api/v1', domainRoutes(db, config));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
