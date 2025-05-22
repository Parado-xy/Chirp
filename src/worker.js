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
import SMS from "../models/sms.model.js";
import sendSMSMessage from "../services/send-sms.services.js";

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

    // CREATE SMS WORKER; 
    const smsWorker = new Worker(`smsQueue`, 
      async (job) => {
        // GET SMS ID
        const { smsId } = job.data; 
        // GET SMS DATA FROM THE Database. 
        const smsMessage = await SMS.findById(smsId); 

        // CHECK IF SMS EXISTS. 
        if(!smsMessage) {
            console.error(`SMS not found in the database.`); 
            return { success: false, error: "SMS not found." };
        }

        // FIND THE ORGANIZATION ASSOCIATED WITH THE SMS. 
        const organization = await Organization.findById(smsMessage.organization); 
        if(!organization){ // Little side note. Time isn't going, we're the ones going. 
                          // We don't have time. 
          smsMessage.status = "failed";
          smsMessage.save();
          return { success: false, error: "Organization not found."}; 

        }

        try{
            let {to, from, content, subject} = smsMessage;
            // SEND THE MESSAGE; 
            let messageInstance = await sendSMSMessage ( {to, from, subject, content} );
            // UPDATE SMS STATUS IN THE DATABASE. 
            smsMessage.status = "sent"; 
            // SAVE THE SMS
            await smsMessage.save();  

            // LOG THIS INTO THE STATUS; 
            console.log(`Message with sid: ${messageInstance.sid} to ${messageInstance.to}`); 

            return {success: true, smsId: messageInstance.sid}; 
            

        }catch(error){
          // SET FAILED SMS MESSAGE STATUS IF AN ERROR OCCURS
          smsMessage.status = "failed";
          await smsMessage.save();
          console.error("SMS Sending Failed:", error);
          return { success: false, error: err.message };
        }
      },
      {
        connection: redisClient,
        concurrency: 5 // Process up to 5 sms concurrently
      }
    ); 

    emailWorker.on('completed', job => {
      const { emailId } = job.data;
      console.log(`✅ Email job ${job.id} completed successfully`);
      console.log(`📧 Email ID: ${emailId}`);
      console.log(`⌚ Completion time: ${new Date().toISOString()}`);
    });

    emailWorker.on('failed', (job, err) => {
      const { emailId } = job.data;
      console.error(`❌ Email job ${job.id} failed`);
      console.error(`📧 Email ID: ${emailId}`);
      console.error(`🚨 Error type: ${err.name}`);
      console.error(`⚠️ Error message: ${err.message}`);
      console.error(`📍 Stack trace: ${err.stack}`);
      console.error(`⌚ Failure time: ${new Date().toISOString()}`);
      
      // Log retry information if available
      if (job.attemptsMade) {
        console.error(`🔄 Attempt ${job.attemptsMade} of ${job.opts.attempts}`);
        console.error(`⏳ Next retry in: ${job.opts.backoff.delay}ms`);
      }
    });

    smsWorker.on('completed', job => {
      const { smsId } = job.data;
      console.log(`✅ SMS job ${job.id} completed successfully`);
      console.log(`📱 SMS ID: ${smsId}`);
      console.log(`⌚ Completion time: ${new Date().toISOString()}`);
    });

    smsWorker.on('failed', (job, err) => {
      const { smsId } = job.data;
      console.error(`❌ SMS job ${job.id} failed`);
      console.error(`📱 SMS ID: ${smsId}`);
      console.error(`🚨 Error type: ${err.name}`);
      console.error(`⚠️ Error message: ${err.message}`);
      console.error(`📍 Stack trace: ${err.stack}`);
      console.error(`⌚ Failure time: ${new Date().toISOString()}`);
      
      // Log retry information if available
      if (job.attemptsMade) {
        console.error(`🔄 Attempt ${job.attemptsMade} of ${job.opts.attempts}`);
        console.error(`⏳ Next retry in: ${job.opts.backoff.delay}ms`);
      }
    });    

    console.log("🚀 Email and SMS processing workers are running...");
  } catch (error) {
    console.error("Worker startup error:", error);
    process.exit(1);
  }
}

startWorker();

export default startWorker; 
