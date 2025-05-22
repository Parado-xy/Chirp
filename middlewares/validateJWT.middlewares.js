/**
 * @fileoverview JWT Validation Middleware
 * 
 * This module provides middleware for validating JSON Web Tokens (JWT) in request headers or session.
 * It verifies that incoming requests to protected routes have valid authentication tokens,
 * extracting organization information and attaching it to the request object.
 * 
 * Used for securing frontend-backend communication through the dashboard interface.
 * 
 * @module validateJwtMiddleware
 * @requires jsonwebtoken
 * @requires ../src/env
 */

import jwt from "jsonwebtoken"; 
import { JWT_SECRET } from "../src/env.js";

/**
 * Validates JWT tokens in request headers or session
 * 
 * This middleware checks for authentication in either:
 * 1. The Authorization header (for API requests)
 * 2. The session object (for web interface requests)
 *
 * @function validateJwt
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 */
const validateJwt = (req, res, next) => {
    // First check if authenticated via session (for web interface)
    if (req.session && req.session.isAuthenticated && req.session.token) {
        // Verify the token stored in session
        jwt.verify(req.session.token, JWT_SECRET, (err, payload) => {
            if (err) {
                // Session token is invalid, destroy session and redirect to login
                req.session.destroy();
                return res.redirect('/auth/signin?message=Your session has expired. Please sign in again.&type=warning');
            }
            
            // If token is valid, attach organization data to request
            req.organization = payload;
            return next();
        });
    } 
    // If not authenticated via session, check for Authorization header (API requests)
    else if (req.headers.authorization) {
        // Split the Bearer token to get just the JWT
        const token = req.headers.authorization.split(' ')[1];

        // Verify the token with our secret
        jwt.verify(token, JWT_SECRET, (err, payload) => {
            if (err) {
                // Token verification failed
                return res.status(403).json({
                    success: false,
                    message: 'Invalid JWT'
                });
            }

            // If token is valid, attach organization data to request
            req.organization = payload;
            next();
        });
    } else {
        // No Authorization header or session authentication provided
        if (req.xhr || req.path.startsWith('/api/')) {
            // For API or AJAX requests, return JSON error
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        } else {
            // For web requests, redirect to login page
            return res.redirect('/auth/signin?message=Please sign in to access this page&type=info');
        }
    }
};

export { validateJwt };