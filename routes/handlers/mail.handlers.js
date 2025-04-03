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
 */

import transporter from "../../services/send-mail.services.js";
import { SMTP_USER } from "../../src/env.js";
import Joi from "joi";
import Organization from "../../models/organization.model.js";

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
            
            // Prepare mail options
            const mailOptions = {
                from: `"${organization.name} - EMAIL SERVICE" <${SMTP_USER}>`,
                to,
                subject,
                html: `
                <h3>${subject}</h3>
                <hr />
                <p>${content}</p>
                <hr />
                <strong>DO NOT REPLY TO THIS EMAIL!</strong>
                `
            };
            
            // Send email using Promise-based approach
            const info = await new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) reject(err);
                    else resolve(info);
                });
            });
            
            // Update organization usage statistics
            await Organization.findByIdAndUpdate(organization._id, {
                $inc: { 'usage.totalEmailsSent': 1 },
                $set: { 'usage.lastEmailSentAt': new Date() }
            });
            
            // Return success response
            return res.status(200).json({
                success: true,
                message: "Email sent successfully",
                messageId: info.messageId
            });
            
        } catch (err) {
            // Pass error to error handling middleware
            next(err);
        }
    }
};

export default mailHandler;