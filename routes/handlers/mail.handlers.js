/**
 * @fileoverview Mail Sending Handler Module
 * 
 * This module provides functionality for sending emails through the mail service.
 * It validates incoming email requests, checks quota limits, sends emails using
 * the configured transport, and updates usage statistics.
 * 
 * @module mailHandler
 * @requires transporter
 * @requires ../../src/env
 * @requires joi
 * @requires ../../models/organization.model
 * @requires redisClient
 */

import transporter from "../../services/send-mail.services.js";
import { SMTP_USER } from "../../src/env.js";
import Joi from "joi";
import Organization from "../../models/organization.model.js";
import { Queue } from "bullmq";
import Email from "../../models/email.model.js";
import redisClient, {isRedisConnected} from "../../databases/redis.databases.js";

/**
 * Validation schema for mail requests
 * 
 * @constant {Joi.ObjectSchema}
 */
const mailSchema = Joi.object({
    to: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Recipient must be a valid email address',
            'string.empty': 'Recipient email cannot be empty',
            'any.required': 'Recipient email is required'
        }),
    
    subject: Joi.string()
        .min(1)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Subject cannot be empty',
            'string.min': 'Subject must be at least {#limit} character',
            'string.max': 'Subject cannot exceed {#limit} characters',
            'any.required': 'Subject is required'
        }),
    
    content: Joi.string()
        .min(1)
        .max(50000) // Reasonable limit for email content
        .required()
        .messages({
            'string.empty': 'Email content cannot be empty',
            'string.min': 'Email content must be at least {#limit} character',
            'string.max': 'Email content cannot exceed {#limit} characters',
            'any.required': 'Email content is required'
        })
});

// Create redis emailQueue. 
const emailQueue = new Queue("emailQueue", {
    connection: redisClient
}); 

/**
 * Mail handling functions
 * 
 * @namespace
 */
const mailHandler = {
    /**
     * Sends an email on behalf of an organization
     * 
     * @async
     * @function send-mail
     * @param {Object} req - Express request object
     * @param {Object} req.organization - Organization object attached by validateApiKey middleware
     * @param {Object} req.body - Email content
     * @param {string} req.body.to - Recipient email address
     * @param {string} req.body.subject - Email subject line
     * @param {string} req.body.content - Email content (HTML supported)
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     * @returns {Object} JSON response with success status and message ID
     * @throws {Error} When email sending fails or quota is exceeded
     * 
     * @example
     * // Example request:
     * // POST /api/v1/mail
     * // Headers: { "Authorization": "Bearer abc123..." }
     * // Body: { "to": "recipient@example.com", "subject": "Hello", "content": "<p>Test</p>" }
     */
    "send-mail": async (req, res, next) => {
        try {
            // Check if Redis client is open
            if (!isRedisConnected()) {
                return res.status(503).json({
                    success: false,
                    message: "Email service temporarily unavailable"
                });
            }

            // Get the organization from request (set by validateApiKey middleware)
            const organization = req.organization;
            
            // Validate request body
            const { error, value } = mailSchema.validate(req.body, { 
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
            const { to, subject, content } = value;
            
            // Check if organization has reached daily quota
            // This would need a more sophisticated implementation in production
            if (organization.usage && organization.usage.totalEmailsSent >= 200) { // MAGIC NUMBER USED HERE. TO BE IMPROVED
                return res.status(429).json({
                    success: false,
                    message: "Daily email quota exceeded"
                });
            }

            // Add Email to database. 
            const email = await Email.create(
                {
                    to,
                    subject,
                    content,
                    organization: req.organization._id
                }
            );

            await emailQueue.add("sendEmail", {emailId: email._id.toString()}, {
                attempts: 3,  // Retry up to 3 times
                backoff: {
                    type: 'exponential',
                    delay: 1000  // Starting delay in ms
                },
                timeout: 5000 
            }); 
                        
            
            // Update organization usage statistics
            await Organization.findByIdAndUpdate(organization._id, {
                $inc: { 'usage.totalEmailsSent': 1 },
                $set: { 'usage.lastEmailSentAt': new Date() }
            });
            
            // Return success response
            res.status(200).json({
                success: true,
                message: "Email queued successfully",
                emailId: email._id
            });
            
        } catch (err) {
            // Pass error to error handling middleware
            next(err);
        }
    }
};

export default mailHandler;