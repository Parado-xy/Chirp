/**
 * @fileoverview Routes Dispatcher Module
 *
 * This module configures and attaches all application routes to the Express server.
 * It centralizes route management and separates route configuration from the main application.
 *
 * @module routeDispatcher
 * @requires ./auth.routes
 * @requires ./mail.routes
 * @requires ./web.routes
 */

// Import route handlers
import authRoutes from "./auth.routes.js";
import mailRoutes from "./mail.routes.js";
import webRoutes from "./web.routes.js";
import smsRouter from "./sms.routes.js";
import healthRoutes from "./health.routes.js";

// Import APPLICATION version.
import { VERSION } from "../src/env.js";

/**
 * Configures and attaches all application routes to the Express server
 *
 * @function dispatcher
 * @param {Object} server - Express server instance
 */
const dispatcher = (server) => {
  // Health check routes (no versioning, available at root)
  server.use("/", healthRoutes);

  // API routes
  server.use(`/api/${VERSION}/auth`, authRoutes);
  server.use(`/api/${VERSION}/mail`, mailRoutes);
  server.use(`/api/${VERSION}/sms`, smsRouter);

  // Web interface routes
  server.use("/", webRoutes);
};

export default dispatcher;
