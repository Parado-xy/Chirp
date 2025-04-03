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


/**
 * Configure and create CORS middleware based on environment
 *
 * @function
 * @returns {Function} CORS middleware configured for the current environment
 */
const corsMiddleware = () => {
  // Define allowed origins.
  // TODO!

  // Return configured CORS middleware
  // WILL IMPROVE LATER. 
  console.log("⚠️ Using permissive CORS policy (development mode)");
  return cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Length", "X-Total-Count"],
    maxAge: 86400,
  });
  
};

export default corsMiddleware;
