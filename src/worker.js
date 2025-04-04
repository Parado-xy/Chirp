/**
 * @fileoverview Email Processing Worker
 * 
 * This module sets up a BullMQ worker to process email sending jobs from the queue.
 * It retrieves email data from the database, sends the email, and updates the status.
 * 
 * @module emailWorker
 * @requires bullmq
 * @requires ../models/email.model
 * @requires ../services/send-mail.services
 * @requires ../databases/redis.databases
 */

import { Worker } from "bullmq";
import Email from "../models/email.model.js";
import transporter from "../services/send-mail.services.js";
import redisClient, {isRedisConnected} from "../databases/redis.databases.js";
import Organization from "../models/organization.model.js";
import { SMTP_USER } from "../src/env.js";
import connectToDatabase from "../databases/mongodb.databases.js";

// Connect to MongoDB first
async function startWorker() {
  try {
    console.log("Connecting to MongoDB...");
    await connectToDatabase();
    
    // Make sure Redis is connected
    if (!isRedisConnected()) {
      console.log("Waiting for Redis connection...");
      // Wait for Redis to be ready
      await new Promise(resolve => {
        redisClient.on('connect', resolve);
        // If already connected, check status
        if (redisClient.isOpen) resolve();
      });
    }

    console.log("Creating email processing worker...");
    
    const emailWorker = new Worker(
      "emailQueue",
      async (job) => {
        // Get the email id
        const { emailId } = job.data;
        
        // Get the email from the database using the emailId
        const email = await Email.findById(emailId);

        if (!email) {
          console.error(`Email not found in database: ${emailId}`);
          return { success: false, error: "Email not found" };
        }

        // Get the organization associated with the email
        const organization = await Organization.findById(email.organization);
        
        if (!organization) {
          console.error(`Organization not found for email: ${emailId}`);
          email.status = "failed";
          await email.save();
          return { success: false, error: "Organization not found" };
        }

        try {
          const { to, subject, content } = email;
          
          // Prepare mail options
          const mailOptions = {
            from: `"${organization.name} - EMAIL SERVICE" <${SMTP_USER}>`,
            to,
            subject,
            html: `
            <hr />
            <p>${content}</p>
            <hr />
            <strong>Feel Free to reach Out!</strong>
            `
          };
            
            // Send email using Promise-based approach
            const info = await new Promise((resolve, reject) => {
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) reject(err);
                    else resolve(info);
                });
            });

          // Update email status in MongoDB
          email.status = "sent";
          await email.save();
          
          console.log(`Email with id: ${info.messageId} sent to ${email.to}`);
          return { success: true, messageId: info.messageId };
        } catch (err) {
          // Set failed email status
          email.status = "failed";
          await email.save();
          console.error("Email Sending Failed:", err);
          return { success: false, error: err.message };
        }
      },
      {
        connection: redisClient,
        concurrency: 5 // Process up to 5 emails concurrently
      }
    );

    emailWorker.on('completed', job => {
      console.log(`Job ${job.id} completed successfully`);
    });

    emailWorker.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed with error: ${err.message}`);
    });

    console.log("Email processing worker is running...");
  } catch (error) {
    console.error("Worker startup error:", error);
    process.exit(1);
  }
}

startWorker();