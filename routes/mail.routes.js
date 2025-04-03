/**
 * @fileoverview Mail Service Routes Module
 * 
 * This module defines the Express router for mail service endpoints,
 * mapping HTTP routes to their corresponding handler functions.
 * All routes in this module are protected by API key authentication.
 * 
 * Current endpoints:
 * - POST / - Send an email through the mail service
 * 
 * @module mailRoutes
 * @requires express
 * @requires ../middlewares/validate.middlewares
 * @requires ./handlers/mail.handlers
 */

// Here in lies the mail router.
import { Router } from "express";

import { validateApiKey } from "../middlewares/validate.middlewares.js";
import mailHandler from "./handlers/mail.handlers.js";

/**
 * Express router instance for mail routes
 * @type {import('express').Router}
 */
const mailRouter = Router();

/**
 * Apply API key validation middleware to all mail routes
 * This ensures all endpoints in this router require a valid API key
 */
mailRouter.use(validateApiKey); 

/**
 * POST /
 * Sends an email on behalf of an authenticated organization
 * 
 * @name SendMail
 * @route {POST} /
 * @authentication Required - API key in Authorization header
 * @bodyparam {string} to - Recipient email address
 * @bodyparam {string} subject - Email subject line
 * @bodyparam {string} content - Email content (HTML supported)
 * @returns {Object} Response with success status or error message
 */
mailRouter.post(`/`, mailHandler['send-mail']);

export default mailRouter;

