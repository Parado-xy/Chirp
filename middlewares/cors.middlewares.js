/**
 * @fileoverview CORS Configuration Middleware
 *
 * This module provides Cross-Origin Resource Sharing (CORS) configuration
 * to allow frontend applications to communicate with the API when hosted
 * on different origins (domains, protocols, or ports).
 *
 * @module corsMiddleware
 * @requires cors
 */

import cors from "cors";
import { NODE_ENV, PORT } from "../src/env.js";
import logger from "../lib/logger.lib.js";

/**
 * Configure and create CORS middleware based on environment
 *
 * @function
 * @returns {Function} CORS middleware configured for the current environment
 */
const corsMiddleware = () => {
  // Define allowed origins based on environment
  const allowedOrigins = {
    development: [
      `http://localhost:${PORT}`,
      `http://localhost:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      `http://127.0.0.1:${PORT}`,
      // Add development frontend URLs here
    ],
    production: [
      `*` // TODO: Change to production url when available
    ],
    test: [`http://localhost:${PORT}`],
  };

  const currentOrigins = allowedOrigins[NODE_ENV] || allowedOrigins.development;

  // For development, be more permissive but still secure
  if (NODE_ENV === "development") {
    logger.warn("Using development CORS policy with specific allowed origins", {
      origins: currentOrigins,
    });

    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);

        // Check if origin is in allowed list or is localhost with any port
        if (
          currentOrigins.includes(origin) ||
          origin.match(/^https?:\/\/localhost:\d+$/) ||
          origin.match(/^https?:\/\/127\.0\.0\.1:\d+$/)
        ) {
          return callback(null, true);
        }

        logger.warn("CORS blocked request from unauthorized origin", {
          origin,
        });
        return callback(new Error("Not allowed by CORS"), false);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      credentials: true,
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Correlation-ID",
      ],
      exposedHeaders: ["Content-Length", "X-Total-Count"],
      maxAge: 86400, // 24 hours
    });
  }

  // Production CORS policy - more restrictive
  logger.info("Using production CORS policy", {
    origins: currentOrigins,
  });

  return cors({
    origin: currentOrigins.length > 0 ? currentOrigins : false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
    exposedHeaders: ["Content-Length"],
    maxAge: 86400,
    optionsSuccessStatus: 200, // For legacy browser support
  });
};

export default corsMiddleware;
