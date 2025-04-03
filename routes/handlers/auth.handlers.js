/**
 * @fileoverview Authentication Handlers Module
 * 
 * This module provides authentication handlers for organization registration and API key validation.
 * It manages the creation of organizations in the system, generates secure API keys,
 * and validates incoming API key requests.
 * 
 * @module authHandler
 * @requires crypto
 * @requires joi
 * @requires ../../models/organization.model
 */

import { randomBytes } from 'crypto'; 
import Joi from 'joi';

import Organization from '../../models/organization.model.js';

/**
 * Validation schema for organization registration
 * 
 * @constant {Joi.ObjectSchema}
 */
const registrationSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Organization name cannot be empty',
      'string.min': 'Organization name must be at least {#limit} characters',
      'string.max': 'Organization name cannot exceed {#limit} characters',
      'any.required': 'Organization name is required'
    }),
  
  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email address cannot be empty',
      'any.required': 'Email address is required'
    })
});

/**
 * Validation schema for API key authorization header
 * 
 * @constant {Joi.ObjectSchema}
 */
const apiKeyHeaderSchema = Joi.object({
  authorization: Joi.string()
    .required()
    .pattern(/^Bearer [A-Za-z0-9]{64}$/)
    .messages({
      'string.empty': 'Authorization header cannot be empty',
      'string.pattern.base': 'Invalid Authorization format. Must be "Bearer YOUR_API_KEY"',
      'any.required': 'Authorization header is required'
    })
}).unknown(true); // Allow other headers

/**
 * Authentication handlers for organization management and API key validation
 * 
 * @namespace
 */
const authHandler = {
    /**
     * Registers a new organization and generates an API key
     * 
     * @async
     * @function register-server
     * @param {Object} req - Express request object
     * @param {Object} req.body - Request body containing organization details
     * @param {string} req.body.name - Organization name
     * @param {string} req.body.email - Organization email
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {Object} JSON response with success status and API key
     * @throws {Error} When database operation fails
     * 
     * @example
     * // Example request:
     * // POST /api/v1/auth/register
     * // { "name": "Test Org", "email": "org@example.com" }
     */
    "register-server": async (req, res, next) => {
        try {
            // Validate request body using Joi
            const { error, value } = registrationSchema.validate(req.body, { 
                abortEarly: false,
                stripUnknown: true
            });
            
            // If validation fails, return error response
            if (error) {
                const errorMessages = error.details.map(detail => detail.message);
                return res.status(400).json({
                    success: false,
                    errors: errorMessages
                });
            }
            
            // Destructure validated data
            const { name, email } = value;
            
            // Generate an API KEY
            const apiKey = randomBytes(32).toString('hex');
            
            // Create organization - if this fails, it will throw an error
            const org = await Organization.create({
                name,
                email,
                apiKey
            });
            
            // If we reach here, creation was successful
            return res.status(201).json({
                success: true,
                apiKey
            });
            
        } catch (error) {
            // Check for duplicate email (MongoDB error code 11000)
            if (error.code === 11000 && error.keyPattern?.email) {
                return res.status(409).json({
                    success: false,
                    message: "An organization with this email already exists"
                });
            }
            
            // Pass other errors to the error middleware
            next(error);
        }
    },

    /**
     * Validates an API key from the Authorization header
     * 
     * @async
     * @function allow-access
     * @param {Object} req - Express request object
     * @param {Object} req.headers - Request headers
     * @param {string} req.headers.authorization - Authorization header with Bearer token
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {Object} JSON response with organization details if valid
     * @throws {Error} When database operation fails
     * 
     * @example
     * // Example request:
     * // GET /api/v1/auth/verify
     * // Headers: { "Authorization": "Bearer abc123..." }
     */
    "allow-access": async (req, res, next) => {
        try {
            // Validate the authorization header using Joi
            const { error } = apiKeyHeaderSchema.validate(req.headers, { 
                abortEarly: true 
            });
            
            if (error) {
                return res.status(401).json({
                    success: false,
                    message: error.details[0].message
                });
            }
            
            // Extract the API key from the Authorization header
            const apiKey = req.headers.authorization.split(' ')[1];
            
            // Find the organization with this API key
            const organization = await Organization.findOne({ apiKey });
            
            if (!organization) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid API key"
                });
            }
            
            // Check if organization is active
            if (organization.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: "Organization account is not active"
                });
            }
            
            // Authentication successful
            return res.status(200).json({
                success: true,
                message: "API key is valid",
                organization: {
                    id: organization._id,
                    name: organization.name
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

export default authHandler;