import { Router } from 'express';
import { healthRoutes } from './health-routes.js';
import { validateRequest } from '../middleware/validate-request.js';
import { emptyRequestSchema } from '../validators/request.js';

export const v1Routes = Router();
v1Routes.get('/', validateRequest(emptyRequestSchema), (_request, response) => {
  response.json({
    success: true,
    message: 'Bharat Bazaar API v1 — Phase 3',
    data: { phase: 3 },
  });
});
v1Routes.use('/health', healthRoutes);
