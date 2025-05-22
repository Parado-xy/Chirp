import SMS from "../../models/sms.model.js"
import Joi from "joi";
import smsQueue from "../../queues/sms.queue.js";
import Organization from "../../models/organization.model.js";

const smsSchema = Joi.object({
    from: Joi.string()
        .pattern(/^\+[1-9]\d{1,14}$/)  // E.164 format validation
        .required()
        .messages({
            'string.pattern.base': 'From number must be in E.164 format (e.g., +1234567890)',
            'string.empty': 'From number cannot be empty',
            'any.required': 'From number is required'
        }),
    
    to: Joi.string()
        .pattern(/^\+[1-9]\d{1,14}$/)  // E.164 format validation
        .required()
        .messages({
            'string.pattern.base': 'To number must be in E.164 format (e.g., +1234567890)',
            'string.empty': 'To number cannot be empty',
            'any.required': 'To number is required'
        }),
    
    subject: Joi.string()
        .min(1)
        .max(50)
        .required()
        .messages({
            'string.empty': 'Subject cannot be empty',
            'string.min': 'Subject must be at least {#limit} character',
            'string.max': 'Subject cannot exceed {#limit} characters',
            'any.required': 'Subject is required'
        }),
    
    content: Joi.string()
        .min(1)
        .max(1600) // SMS messages are typically limited to 1600 characters
        .required()
        .messages({
            'string.empty': 'SMS content cannot be empty',
            'string.min': 'SMS content must be at least {#limit} character',
            'string.max': 'SMS content cannot exceed {#limit} characters',
            'any.required': 'SMS content is required'
        })
});

const smsHandler = {
    "send-sms": async (req, res, next) => {
        try{
            const {err, value} = smsSchema.validate(req.body, {
                abortEarly: false,
                stripUnknown: true,
            });

            // If validation fails, return error response
            if (err) {
                const errorMessages = err.details.map(detail => detail.message);
                return res.status(400).json({
                    success: false,
                    errors: errorMessages
                });
            };

            const {to, from, subject, content} = value; 

            // Get the organization; 
            let organization = req.organization; 

            let sms = await SMS.create(
                {
                    to, 
                    from,
                    subject,
                    content,
                    organization: req.organization._id
                }
            );

            // add the sms to the queue. 
            smsQueue.add(`sendSMS`,  {smsId: sms._id.toString()}, {
                attempts: 3,  // Retry up to 3 times
                backoff: {
                    type: 'exponential',
                    delay: 1000  // Starting delay in ms
                },
                timeout: 5000 
            });

            // Update organization usage statistics
            await Organization.findByIdAndUpdate(organization._id, {
                $inc: { 'usage.totalSMSSent': 1 },
                $set: { 'usage.lastNotificationSentAt': new Date() },
                $addToSet: {'smsList': to}
            });
            
            // Return success response
            res.status(200).json({
                success: true,
                message: "SMS queued successfully",
                smsId: sms._id
            });

        }catch(error){
            next(error); 
        }
    } 
}

export default smsHandler; 