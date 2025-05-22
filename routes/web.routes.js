/**
 * @fileoverview Web Interface Routes Module
 * 
 * This module defines the Express router for the web interface pages,
 * enabling organizations to use the service through a browser interface.
 * It maps HTTP routes to their corresponding handler functions.
 * 
 * @module webRoutes
 * @requires express
 * @requires ../middlewares/validateJWT.middlewares
 * @requires ./handlers/web.handlers
 */

import { Router } from "express";
import { validateJwt } from "../middlewares/validateJWT.middlewares.js";
import webHandler from "./handlers/web.handlers.js";

/**
 * Express router instance for web interface routes
 * @type {import('express').Router}
 */
const webRouter = Router();

// Public routes
/**
 * GET /
 * Renders the home page
 * 
 * @name HomePage
 * @route {GET} /
 */
webRouter.get('/', webHandler['render-home']);

// Auth routes
/**
 * GET /auth/signup
 * Renders the signup page
 * 
 * @name SignupPage
 * @route {GET} /auth/signup
 */
webRouter.get('/auth/signup', webHandler['render-signup']);

/**
 * POST /auth/register
 * Processes organization registration
 * 
 * @name RegisterOrganization
 * @route {POST} /auth/register
 */
webRouter.post('/auth/register', webHandler['register']);

/**
 * GET /auth/registered
 * Renders the registration success page
 * 
 * @name RegistrationSuccess
 * @route {GET} /auth/registered
 */
webRouter.get('/auth/registered', webHandler['render-registration-success']);

/**
 * GET /auth/signin
 * Renders the signin page
 * 
 * @name SigninPage
 * @route {GET} /auth/signin
 */
webRouter.get('/auth/signin', webHandler['render-signin']);

/**
 * POST /auth/signin
 * Processes user authentication
 * 
 * @name AuthenticateUser
 * @route {POST} /auth/signin
 */
webRouter.post('/auth/signin', webHandler['signin']);

/**
 * GET /auth/signout
 * Processes user signout
 * 
 * @name SignoutUser
 * @route {GET} /auth/signout
 */
webRouter.get('/auth/signout', webHandler['signout']);

// Protected routes - require JWT authentication
/**
 * GET /dashboard
 * Renders the organization dashboard
 * 
 * @name Dashboard
 * @route {GET} /dashboard
 * @authentication Required - JWT via session
 */
webRouter.get('/dashboard', validateJwt, webHandler['render-dashboard']);

/**
 * POST /dashboard/test-email
 * Sends a test email
 * 
 * @name SendTestEmail
 * @route {POST} /dashboard/test-email
 * @authentication Required - JWT via session
 */
webRouter.post('/dashboard/test-email', validateJwt, webHandler['send-test-email']);

export default webRouter;