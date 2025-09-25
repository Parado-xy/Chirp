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
import redisClient, { isRedisConnected } from "../databases/redis.databases.js";
import Organization from "../models/organization.model.js";
import { SMTP_USER } from "../src/env.js";
import connectToDatabase from "../databases/mongodb.databases.js";
import SMS from "../models/sms.model.js";
import sendSMSMessage from "../services/send-sms.services.js";
import logger, {
  logQueueOperation,
  logDatabaseOperation,
} from "../lib/logger.lib.js";

// Connect to MongoDB first
async function startWorker() {
  try {
    logger.info("Connecting to MongoDB...");
    await connectToDatabase();

    // Make sure Redis is connected
    if (!isRedisConnected()) {
      logger.info("Waiting for Redis connection...");
      // Wait for Redis to be ready
      await new Promise((resolve) => {
        redisClient.on("connect", resolve);
        // If already connected, check status
        if (redisClient.isOpen) resolve();
      });
    }

    logger.info("Creating email processing worker...");

    const emailWorker = new Worker(
      "emailQueue",
      async (job) => {
        // Get the email id
        const { emailId } = job.data;

        // Get the email from the database using the emailId
        const email = await Email.findById(emailId);

        if (!email) {
          logger.error(`Email not found in database`, { emailId });
          return { success: false, error: "Email not found" };
        }

        // Get the organization associated with the email
        const organization = await Organization.findById(email.organization);

        if (!organization) {
          logger.error(`Organization not found for email`, {
            emailId,
            organizationId: email.organization,
          });
          email.status = "failed";
          await email.save();
          logDatabaseOperation("update", "Email", {
            emailId,
            status: "failed",
          });
          return { success: false, error: "Organization not found" };
        }

        try {
          const { to, subject, content } = email;

          // Prepare mail options
          const mailOptions = {
            from: `"${organization.name} - EMAIL SERVICE" <${SMTP_USER}>`,
            to,
            subject,
            html: content,
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
          logDatabaseOperation("update", "Email", { emailId, status: "sent" });

          logger.info(`Email sent successfully`, {
            emailId,
            messageId: info.messageId,
            recipient: email.to,
            organization: organization.name,
          });
          return { success: true, messageId: info.messageId };
        } catch (err) {
          // Set failed email status
          email.status = "failed";
          await email.save();
          logDatabaseOperation("update", "Email", {
            emailId,
            status: "failed",
          });
          logger.error("Email sending failed", {
            emailId,
            error: err.message,
            recipient: email.to,
            organization: organization.name,
          });
          return { success: false, error: err.message };
        }
      },
      {
        connection: redisClient,
        concurrency: 5, // Process up to 5 emails concurrently
      }
    );

    // CREATE SMS WORKER;
    const smsWorker = new Worker(
      `smsQueue`,
      async (job) => {
        // GET SMS ID
        const { smsId } = job.data;
        // GET SMS DATA FROM THE Database.
        const smsMessage = await SMS.findById(smsId);

        // CHECK IF SMS EXISTS.
        if (!smsMessage) {
          logger.error(`SMS not found in database`, { smsId });
          return { success: false, error: "SMS not found." };
        }

        // FIND THE ORGANIZATION ASSOCIATED WITH THE SMS.
        const organization = await Organization.findById(
          smsMessage.organization
        );
        if (!organization) {
          // Little side note. Time isn't going, we're the ones going.
          // We don't have time.
          smsMessage.status = "failed";
          smsMessage.save();
          logDatabaseOperation("update", "SMS", { smsId, status: "failed" });
          return { success: false, error: "Organization not found." };
        }

        try {
          let { to, from, content, subject } = smsMessage;
          // SEND THE MESSAGE;
          let messageInstance = await sendSMSMessage({
            to,
            from,
            subject,
            content,
          });
          // UPDATE SMS STATUS IN THE DATABASE.
          smsMessage.status = "sent";
          // SAVE THE SMS
          await smsMessage.save();
          logDatabaseOperation("update", "SMS", { smsId, status: "sent" });

          // LOG THIS INTO THE STATUS;
          logger.info(`SMS sent successfully`, {
            smsId,
            messageSid: messageInstance.sid,
            recipient: messageInstance.to,
            organization: organization.name,
          });

          return { success: true, smsId: messageInstance.sid };
        } catch (error) {
          // SET FAILED SMS MESSAGE STATUS IF AN ERROR OCCURS
          smsMessage.status = "failed";
          await smsMessage.save();
          logDatabaseOperation("update", "SMS", { smsId, status: "failed" });
          logger.error("SMS sending failed", {
            smsId,
            error: error.message,
            recipient: smsMessage.to,
            organization: organization.name,
          });
          return { success: false, error: error.message };
        }
      },
      {
        connection: redisClient,
        concurrency: 5, // Process up to 5 sms concurrently
      }
    );

    emailWorker.on("completed", (job) => {
      const { emailId } = job.data;
      logQueueOperation("completed", "emailQueue", {
        jobId: job.id,
        emailId,
        duration: Date.now() - job.timestamp,
      });
    });

    emailWorker.on("failed", (job, err) => {
      const { emailId } = job.data;
      logQueueOperation("failed", "emailQueue", {
        jobId: job.id,
        emailId,
        error: err.message,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      });
    });

    smsWorker.on("completed", (job) => {
      const { smsId } = job.data;
      logQueueOperation("completed", "smsQueue", {
        jobId: job.id,
        smsId,
        duration: Date.now() - job.timestamp,
      });
    });

    smsWorker.on("failed", (job, err) => {
      const { smsId } = job.data;
      logQueueOperation("failed", "smsQueue", {
        jobId: job.id,
        smsId,
        error: err.message,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      });
    });

    logger.info("Email and SMS processing workers are running...", {
      emailConcurrency: 5,
      smsConcurrency: 5,
      retryAttempts: 3,
    });
  } catch (error) {
    logger.error("Worker startup error", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startWorker();

export default startWorker;
