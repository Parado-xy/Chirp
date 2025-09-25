/**
 * @fileoverview Enhanced Error Handling Middleware
 *
 * This module provides centralized error handling for the Chirp API.
 * It processes errors thrown in route handlers and middleware,
 * formats them consistently, and sends appropriate HTTP responses with
 * helpful error messages and proper logging.
 *
 * @module errorMiddleware
 * @requires express
 */

import logger from '../lib/logger.lib.js';
import { NODE_ENV } from '../src/env.js';

/**
 * Express error handling middleware
 *
 * This middleware catches and processes all errors passed to Express's
 * error handling chain. It standardizes error responses and handles
 * specific error types with appropriate status codes.
 *
 * @function errorMiddleware
 * @param {Error} err - The error object passed from previous middleware or route handlers
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void}
 *
 * @example
 * // In server.js after all route registrations:
 * import errorMiddleware from './middlewares/error.middlewares.js';
 * app.use(errorMiddleware);
 */
/**
 * Express error handling middleware
 *
 * This middleware catches and processes all errors passed to Express's
 * error handling chain. It standardizes error responses and handles
 * specific error types with appropriate status codes and user-friendly messages.
 *
 * @function errorMiddleware
 * @param {Error} err - The error object passed from previous middleware or route handlers
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next middleware function
 * @returns {void}
 */
const errorMiddleware = (err, req, res, next) => {
  // Prevent multiple error responses
  if (res.headersSent) {
    return next(err);
  }

  try {
    let error = {
      message: err.message || 'An unexpected error occurred',
      status: err.status || err.statusCode || 500,
      type: err.name || 'Error',
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    };

    // Add correlation ID if available
    if (req.headers['x-correlation-id']) {
      error.correlationId = req.headers['x-correlation-id'];
    }

    // Handle specific error types with user-friendly messages
    switch (err.name) {
      case "ValidationError":
        error.message = "The provided data is invalid. Please check your input and try again.";
        error.status = 400;
        error.details = processValidationError(err);
        break;
        
      case "CastError":
        error.message = `The provided ID "${err.value}" is not valid. Please check the ID format.`;
        error.status = 400;
        break;
        
      case "JsonWebTokenError":
        error.message = "Invalid authentication token. Please check your credentials.";
        error.status = 401;
        break;
        
      case "TokenExpiredError":
        error.message = "Your authentication token has expired. Please sign in again.";
        error.status = 401;
        break;
        
      case "MulterError":
        error.message = "File upload error. " + getMulterErrorMessage(err.code);
        error.status = 400;
        break;
        
      case "MongoServerError":
      case "MongoError":
        error.message = "Database operation failed. Please try again.";
        error.status = 500;
        break;
        
      default:
        // Handle HTTP errors
        if (err.status || err.statusCode) {
          error.status = err.status || err.statusCode;
          error.message = getHttpErrorMessage(error.status, err.message);
        }
        break;
    }

    // Handle specific error codes
    switch (err.code) {
      case 11000:
        error.message = "This record already exists. Please use different values.";
        error.status = 409;
        error.details = processDuplicateKeyError(err);
        break;
        
      case "ECONNREFUSED":
        error.message = "Unable to connect to external service. Please try again later.";
        error.status = 503;
        break;
        
      case "ETIMEDOUT":
        error.message = "Request timed out. Please try again.";
        error.status = 408;
        break;
        
      default:
        break;
    }

    // Log the error with appropriate level
    const logLevel = error.status >= 500 ? 'error' : 'warn';
    logger[logLevel]('Request error occurred', {
      error: {
        message: err.message,
        name: err.name,
        code: err.code,
        status: error.status,
        stack: err.stack
      },
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.headers['x-correlation-id']
      }
    });

    // Prepare response
    const response = {
      success: false,
      error: {
        message: error.message,
        type: error.type,
        status: error.status,
        timestamp: error.timestamp
      }
    };

    // Add details for validation errors
    if (error.details) {
      response.error.details = error.details;
    }

    // Add correlation ID to response if available
    if (error.correlationId) {
      response.error.correlationId = error.correlationId;
    }

    // In development, include stack trace
    if (NODE_ENV === 'development') {
      response.error.stack = err.stack;
      response.error.path = error.path;
      response.error.method = error.method;
    }

    res.status(error.status).json(response);
  } catch (processingError) {
    // Fallback error handling
    logger.error('Error processing error', {
      originalError: err.message,
      processingError: processingError.message,
      stack: processingError.stack
    });
    
    res.status(500).json({
      success: false,
      error: {
        message: 'An internal server error occurred',
        type: 'InternalServerError',
        status: 500,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Process MongoDB validation errors into user-friendly format
 * @param {Error} err - Validation error
 * @returns {Array} Array of field-specific error messages
 */
function processValidationError(err) {
  const errors = [];
  
  if (err.errors) {
    Object.keys(err.errors).forEach(field => {
      const fieldError = err.errors[field];
      errors.push({
        field,
        message: fieldError.message,
        value: fieldError.value
      });
    });
  }
  
  return errors;
}

/**
 * Process MongoDB duplicate key errors
 * @param {Error} err - Duplicate key error
 * @returns {Object} Processed error details
 */
function processDuplicateKeyError(err) {
  const duplicateField = Object.keys(err.keyPattern || {})[0];
  const duplicateValue = err.keyValue ? err.keyValue[duplicateField] : 'unknown';
  
  return {
    field: duplicateField,
    value: duplicateValue,
    message: `A record with ${duplicateField} '${duplicateValue}' already exists`
  };
}

/**
 * Get user-friendly HTTP error messages
 * @param {number} status - HTTP status code
 * @param {string} originalMessage - Original error message
 * @returns {string} User-friendly error message
 */
function getHttpErrorMessage(status, originalMessage) {
  const messages = {
    400: 'Invalid request. Please check your data and try again.',
    401: 'Authentication required. Please provide valid credentials.',
    403: 'Access denied. You don\'t have permission to perform this action.',
    404: 'The requested resource was not found.',
    405: 'Method not allowed for this endpoint.',
    409: 'Conflict. The request could not be completed due to a conflict.',
    422: 'The provided data could not be processed.',
    429: 'Too many requests. Please try again later.',
    500: 'Internal server error. Please try again later.',
    502: 'Bad gateway. External service unavailable.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Gateway timeout. The request took too long to process.'
  };
  
  return messages[status] || originalMessage || 'An error occurred';
}

/**
 * Get user-friendly Multer error messages
 * @param {string} code - Multer error code
 * @returns {string} User-friendly error message
 */
function getMulterErrorMessage(code) {
  const messages = {
    'LIMIT_FILE_SIZE': 'File is too large.',
    'LIMIT_FILE_COUNT': 'Too many files uploaded.',
    'LIMIT_FIELD_KEY': 'Field name is too long.',
    'LIMIT_FIELD_VALUE': 'Field value is too long.',
    'LIMIT_FIELD_COUNT': 'Too many fields.',
    'LIMIT_UNEXPECTED_FILE': 'Unexpected file field.',
    'MISSING_FIELD_NAME': 'Field name is missing.'
  };
  
  return messages[code] || 'Please check your file and try again.';
}

export default errorMiddleware;


