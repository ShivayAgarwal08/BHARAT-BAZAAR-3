import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error.js';

export const notFound: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'The requested API endpoint does not exist.', 'NOT_FOUND'));
};
