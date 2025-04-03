/**
 * @fileoverview Email Transport Service Configuration
 * 
 * This module configures and exports a Nodemailer transport instance for sending emails.
 * It uses environment variables to set up the SMTP connection with the appropriate
 * service provider credentials.
 * 
 * @module sendMailService
 * @requires nodemailer
 * @requires ../src/env
 */

// Require dependencies. 
import nodemailer from "nodemailer"; 

// Get env variables
import { SMTP_PASS, SMTP_USER, MAIL_SERVICE_PROVIDER } from "../src/env.js";

/**
 * Configured Nodemailer transport instance
 * 
 * This transporter is configured with the email service provider
 * and authentication details specified in environment variables.
 * It can be used to send emails throughout the application.
 * 
 * @type {nodemailer.Transporter}
 * 
 * @example
 * // Example usage:
 * import transporter from './services/send-mail.services.js';
 * 
 * const mailOptions = {
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Test Email',
 *   html: '<p>Hello world!</p>'
 * };
 * 
 * transporter.sendMail(mailOptions, (error, info) => {
 *   if (error) console.error(error);
 *   else console.log('Email sent: ' + info.response);
 * });
 */
const transporter = nodemailer.createTransport(
    {
        service: MAIL_SERVICE_PROVIDER,
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    }
)

export default transporter;