/**
 * @fileoverview Authentication Routes Module
 * 
 * This module defines the Express router for authentication endpoints,
 * mapping HTTP routes to their corresponding handler functions.
 * 
 * Current endpoints:
 * - POST /register - Register a new organization and receive an API key
 * 
 * @module authRoutes
 * @requires express
 * @requires ./handlers/auth.handlers
 */

// Import dependencies. 
import { Router } from "express";
import authHandler from "./handlers/auth.handlers.js";

/**
 * Express router instance for auth routes
 * @type {import('express').Router}
 */
let authRouter = Router();
 
/**
 * POST /register
 * Registers a new organization and generates an API key
 * 
 * @name RegisterOrganization
 * @route {POST} /register
 * @bodyparam {string} name - Organization name
 * @bodyparam {string} email - Organization email address
 * @returns {Object} Response with API key or error message
 */
authRouter.post('/register', authHandler['register-server']); 

/**
 * Note: The 'allow-access' handler is defined but not exposed as an endpoint.
 * Consider adding:
 * authRouter.post('/verify', authHandler['allow-access']);
 */

export default authRouter;

