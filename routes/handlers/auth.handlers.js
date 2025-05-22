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
import { generateToken } from '../../lib/jwt.lib.js';
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
    }),

  password: Joi.string()
    .min(6)
    .max(10)
     .empty()
    .messages(
        {
            'string.empty': 'Password cannot be empty',
            'any.required': 'Password is required',
            'string.min': 'Password must contain at lease {#limit} characters',
            'string.max': 'Password must contain at most {#limit} characters',
        }
    )  
});


/**
 * Validation schema for sign in
 * 
 * @constant {Joi.ObjectSchema}
 */
const signinSchema = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2 })
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email address cannot be empty',
      'any.required': 'Email address is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password cannot be empty',
      'any.required': 'Password is required'
    })
});

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
     * @function register
     * @param {Object} req - Express request object
     * @param {Object} req.body - Request body containing organization details
     * @param {string} req.body.name - Organization name
     * @param {string} req.body.email - Organization email
     * @param {string} req.body.password - Organization account password
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
    "register": async (req, res, next) => {
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
            const { name, email, password } = value;
            
            // Generate an API KEY
            const apiKey = randomBytes(32).toString('hex');
            
            // Create organization - if this fails, it will throw an error
            const org = await Organization.create({
                name,
                email,
                password,
                apiKey
            });
            
            // Generate jwt token based on organization name, email, and organization id
            let token = generateToken({id: org._id, name, email })
            // If we reach here, creation was successful
            return res.status(201).json({
                success: true,
                apiKey,
                token
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
     * Authenticates an organization using email and password
     * 
     * @async
     * @function signin
     * @param {Object} req - Express request object
     * @param {Object} req.body - Request body containing credentials
     * @param {string} req.body.email - Organization email address
     * @param {string} req.body.password - Organization password
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {Object} JSON response with JWT token and organization details if valid
     * @throws {Error} When authentication fails or database operation fails
     * 
     * @example
     * // Example request:
     * // POST /api/v1/auth/signin
     * // { "email": "org@example.com", "password": "securepass" }
     */
    "signin": async (req, res, next) => {
        try {
            // Validate request body using Joi
            const { error, value } = signinSchema.validate(req.body, { 
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
            const { email, password } = value;
            
            // Find the organization with this email
            const organization = await Organization.findOne({ email });
            
            // Check if organization exists
            if (!organization) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password"
                });
            }
            
            // Verify password
            const isPasswordValid = await organization.comparePassword(password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid email or password"
                });
            }
            
            // Check if organization is active
            if (organization.status !== 'active') {
                return res.status(403).json({
                    success: false,
                    message: "Organization account is not active"
                });
            }
            
            // Generate JWT token based on organization data
            const token = generateToken({
                id: organization._id,
                name: organization.name,
                email: organization.email
            });
            
            // Authentication successful
            return res.status(200).json({
                success: true,
                message: "Authentication successful",
                token,
                organization: {
                    id: organization._id,
                    name: organization.name,
                    email: organization.email,
                    status: organization.status,
                    usage: organization.usage
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

export default authHandler;