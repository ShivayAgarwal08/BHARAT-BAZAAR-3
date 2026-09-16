import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';
import type { ApiError } from '../types/api.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  let status = 500;
  let payload: ApiError = {
    success: false,
    message: 'Something went wrong. Please try again later.',
    error: { code: 'INTERNAL_ERROR' },
  };

  if (error instanceof ZodError) {
    status = 400;
    payload = {
      success: false,
      message: 'Please check the submitted information.',
      error: {
        code: 'VALIDATION_ERROR',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
  } else if (error instanceof AppError) {
    status = error.statusCode;
    payload = { success: false, message: error.message, error: { code: error.code } };
  } else if (typeof error === 'object' && error !== null && 'type' in error) {
    // body-parser errors must not expose raw request data or appear as server failures.
    if (error.type === 'entity.parse.failed') {
      status = 400;
      payload = {
        success: false,
        message: 'The request body must be valid JSON.',
        error: { code: 'INVALID_JSON' },
      };
    } else if (error.type === 'entity.too.large') {
      status = 413;
      payload = {
        success: false,
        message: 'The request body is too large.',
        error: { code: 'PAYLOAD_TOO_LARGE' },
      };
    } else if (error.type === 'charset.unsupported' || error.type === 'encoding.unsupported') {
      status = 415;
      payload = {
        success: false,
        message: 'Unsupported request encoding.',
        error: { code: 'UNSUPPORTED_ENCODING' },
      };
    }
  }

  if (status === 500)
    console.error('Unhandled API error. Request failed; details suppressed to protect secrets.');
  response.status(status).json(payload);
};
