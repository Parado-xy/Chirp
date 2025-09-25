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
import { authLimiter } from "../middlewares/rateLimiter.middlewares.js";
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
 * @ratelimit 10 requests per 15 minutes per IP in production
 * @bodyparam {string} name - Organization name
 * @bodyparam {string} email - Organization email address
 * @bodyparam {string} password - Organization password
 * @returns {Object} Response with API key or error message
 */
authRouter.post("/register", authLimiter, authHandler["register"]);

/**
 * POST /signin
 * Sign in an existing organization
 *
 * @name SignInOrganization
 * @route {POST} /signin
 * @ratelimit 10 requests per 15 minutes per IP in production
 * @bodyparam {string} email - Organization email address
 * @bodyparam {string} password - Organization password
 * @returns {Object} Response with JWT token or error message
 */
authRouter.post("/signin", authLimiter, authHandler["signin"]);

/**
 * Note: The 'allow-access' handler is defined but not exposed as an endpoint.
 * Consider adding:
 * authRouter.post('/verify', authHandler['allow-access']);
 */

export default authRouter;
