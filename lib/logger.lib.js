/**
 * @fileoverview Structured Logging Configuration
 *
 * This module configures Winston logger with different log levels, formats,
 * and transports for development and production environments.
 *
 * @module logger
 * @requires winston
 */

import winston from "winston";
import { NODE_ENV } from "../src/env.js";

/**
 * Custom log format for development environment
 * Provides colorized output with timestamp, level, and message
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${level}]`;

    if (service) {
      log += ` [${service}]`;
    }

    log += `: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  })
);

/**
 * Production log format with JSON structure
 * Provides structured logging suitable for log aggregation systems
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Winston logger configuration
 *
 * Log Levels:
 * - error: Error conditions
 * - warn: Warning conditions
 * - info: Informational messages
 * - http: HTTP request logs
 * - debug: Debug-level messages
 *
 * @type {winston.Logger}
 */
const logger = winston.createLogger({
  level: NODE_ENV === "production" ? "info" : "debug",
  format: NODE_ENV === "production" ? productionFormat : developmentFormat,
  defaultMeta: {
    service: "chirp-service",
    version: process.env.VERSION || "v1",
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  // Exit on handled exceptions in production
  exitOnError: NODE_ENV === "production",
});

// Add file transport for production
if (NODE_ENV === "production") {
  logger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * HTTP request logger middleware
 * Logs incoming HTTP requests with method, URL, IP, and response time
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const httpLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.http("Incoming request", {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    correlationId:
      req.headers["x-correlation-id"] ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  });

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.http("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      correlationId: req.headers["x-correlation-id"],
    });
  });

  next();
};

/**
 * Database operation logger
 * Helper function to log database operations consistently
 *
 * @param {string} operation - The database operation (create, update, delete, find)
 * @param {string} collection - The collection/model name
 * @param {Object} meta - Additional metadata
 */
export const logDatabaseOperation = (operation, collection, meta = {}) => {
  logger.debug("Database operation", {
    operation,
    collection,
    ...meta,
  });
};

/**
 * Queue operation logger
 * Helper function to log queue operations consistently
 *
 * @param {string} operation - The queue operation (add, process, complete, fail)
 * @param {string} queue - The queue name
 * @param {Object} meta - Additional metadata
 */
export const logQueueOperation = (operation, queue, meta = {}) => {
  logger.info("Queue operation", {
    operation,
    queue,
    ...meta,
  });
};

export default logger;
