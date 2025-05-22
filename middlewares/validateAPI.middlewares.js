/**
 * @fileoverview API Key Validation Middleware
 *
 * This module provides middleware for validating API keys sent in Authorization headers.
 * It verifies the presence and format of the API key, checks it against the database,
 * and attaches the organization data to the request object for downstream handlers.
 *
 * @module validateMiddleware
 * @requires ../models/organization.model
 */

import Organization from '../models/organization.model.js';

/**
 * Middleware to validate API key from Authorization header
 * 
 * This middleware:
 * 1. Extracts the API key from the Authorization header (Bearer format)
 * 2. Verifies the API key exists in the database
 * 3. Attaches the organization object to the request for use in route handlers
 * 
 * @async
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Authorization header containing API key
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * @throws {Error} If database query fails
 * 
 * @example
 * // Example usage in route definition:
 * router.use(validateApiKey);
 * router.post('/send-mail', mailHandler);
 */
export const validateApiKey = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false, 
                message: "API key missing. Include as 'Bearer YOUR_API_KEY' in Authorization header"
            });
        }
        
        const apiKey = authHeader.split(' ')[1];
        const organization = await Organization.findOne({ apiKey });
        
        if (!organization) {
            return res.status(401).json({
                success: false,
                message: "Invalid API key"
            });
        }
        
        // Attach organization to request for later use
        req.organization = organization;
        next();
    } catch (error) {
        next(error);
    }
};