/**
 * @fileoverview API Routes Dispatcher
 * 
 * This module connects all route modules to the main Express application.
 * It serves as the central routing configuration, mounting all API endpoints
 * under the versioned API path.
 * 
 * @module dispatcherRoutes
 * @requires express
 * @requires ../src/env
 * @requires ./auth.routes
 * @requires ./mail.routes
 */

// Import Dependencies. 
import express from "express"; 

// Import APPLICATION version.
import { VERSION } from "../src/env.js"; 

// Import route handlers
import authRoutes from "./auth.routes.js"; 
import mailRoutes from "./mail.routes.js"; 

/**
 * Connects all route modules to the Express application
 * 
 * @function dispatcher
 * @param {express.Application} server - Express application instance
 * @returns {void}
 * 
 * @example
 * import express from 'express';
 * import dispatcher from './routes/dispatcher.routes.js';
 * 
 * const app = express();
 * dispatcher(app);
 */
const dispatcher = (server) => {
    server.use(`/api/${VERSION}/auth`, authRoutes); 
    server.use(`/api/${VERSION}/mail`, mailRoutes);
};

export default dispatcher;