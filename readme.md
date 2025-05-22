Collecting workspace informationI'll help you rewrite the readme.md file for hosting on Render. Here's an updated version that includes deployment information and Render-specific instructions:

```markdown
# Email & SMS Service API

A robust microservice for programmatically sending emails and SMS messages through a RESTful API interface. This service implements an asynchronous processing architecture for reliable, high-volume message delivery.

## 1. System Architecture

The service follows a modular microservice architecture with asynchronous job processing:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌────────────────┐
│   Your Service   │     │ Email/SMS Service │     │  Redis Queue &   │     │ Message Provider│
│   or Application │────▶│      API         │────▶│  Worker Process  │────▶│ (Gmail/Twilio) │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └────────────────┘
                                  │                        │
                                  │                        │
                         ┌────────▼────────────────────────▼─────────┐
                         │                                           │
                         │               MongoDB                     │
                         │              Database                     │
                         │                                           │
                         └───────────────────────────────────────────┘
```

### Core Components:

- **API Layer**: Express.js REST endpoints
- **Authentication**: API key & JWT-based security
- **Data Storage**: MongoDB for organization and message data
- **Job Queue**: Redis with BullMQ for reliable asynchronous processing
- **Worker Process**: Background message sending with automatic retries
- **Message Delivery**: Nodemailer for email, Twilio for SMS
- **Error Handling**: Centralized error processing with detailed logging

## 2. Deployment on Render

### Prerequisites

- [Render](https://render.com) account
- MongoDB Atlas database (or other hosted MongoDB)
- Redis Cloud instance
- SMTP credentials (Gmail or other provider)
- Twilio account (for SMS functionality)

### Deployment Steps

1. Fork/Clone this repository to your GitHub account

2. Create a new Web Service on Render:
   - Connect your GitHub repository
   - Select the branch to deploy
   - Set build command: `npm install`
   - Set start command: `npm start`

3. Add Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will override this with its own PORT)
   - `DB_URI`: Your MongoDB connection string
   - `REDIS_HOST`: Your Redis Cloud host
   - `REDIS_PORT`: Your Redis Cloud port
   - `REDIS_PASSWORD`: Your Redis Cloud password
   - `REDIS_USERNAME`: Your Redis Cloud username (if applicable)
   - `SMTP_USER`: Your SMTP email address
   - `SMTP_PASS`: Your SMTP password/app password
   - `MAIL_SERVICE_PROVIDER`: Your email provider (e.g., `gmail`)
   - `JWT_SECRET`: A secure random string
   - `JWT_EXPIRES_IN`: Token expiration (e.g., `3h`)
   - `ACCOUNT_SID`: Your Twilio account SID
   - `AUTH_TOKEN`: Your Twilio auth token
   - `VERSION`: `v1`

4. Deploy the Worker Process:
   - Create a new Background Worker on Render
   - Connect to the same repository
   - Set build command: `npm install`
   - Set start command: `node src/worker.js`
   - Add the same environment variables as above

5. Verify Deployment:
   - Check the logs to ensure both services start correctly
   - Test the API endpoints
   - Verify email and SMS delivery

## 3. Authentication

This service uses API key authentication to identify organizations:

1. **Register your organization** to receive an API key
2. **Include the API key** in the Authorization header for all requests
3. The system **validates your API key** and identifies your organization
4. **Usage statistics** are tracked per organization

## 4. API Reference

### Authentication Endpoints

#### Register Organization

```
POST /api/v1/auth/register

Request Body:
{
  "name": "Your Organization Name",
  "email": "contact@yourorganization.com",
  "password": "secure-password"
}

Response:
{
  "success": true,
  "apiKey": "ed9a3d7648a570d729609a5266a8ce442d29b3f8bdbe0710b77597bc607af98e",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Email Endpoint

```
POST /api/v1/mail

Headers:
Authorization: Bearer YOUR_API_KEY

Request Body:
{
  "to": "recipient@example.com",
  "subject": "Your Subject Line",
  "content": "Your email content supports <b>HTML</b> formatting"
}

Response:
{
  "success": true,
  "message": "Email queued successfully",
  "emailId": "64f7a9b2e8d52a1f880c5e12"
}
```

### SMS Endpoint

```
POST /api/v1/sms

Headers:
Authorization: Bearer YOUR_API_KEY

Request Body:
{
  "from": "+1234567890",
  "to": "+9876543210",
  "subject": "Alert",
  "content": "This is a test SMS message"
}

Response:
{
  "success": true,
  "message": "SMS queued successfully",
  "smsId": "64f7a9b2e8d52a1f880c5e13"
}
```

## 5. Web Dashboard

The service includes a web dashboard accessible at the root URL after deployment:

- **Organization Dashboard**: View usage statistics and API keys
- **Test Interface**: Send test emails and SMS messages directly from the dashboard
- **Activity Monitoring**: Track message delivery status and history
- **Documentation**: Access API usage guides and examples

## 6. Limitations and Usage

- Daily quota: 200 emails and SMS messages per organization
- Rate limiting: Automatically enforced to prevent abuse
- Phone numbers: Must use E.164 format (e.g., +1234567890)
- SMS content: Limited to 1600 characters maximum

## 7. Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key format (should be a 64-character hex string)
   - Ensure proper "Bearer" prefix in Authorization header

2. **Message Not Delivered**
   - Check if worker process is running
   - Verify Redis connection is active
   - Check recipient address/phone number format
   - Verify your account is active and within quota

3. **Render Deployment Issues**
   - Check environment variables are correctly set
   - Review deployment logs for errors
   - Ensure both web service and worker are running

### Getting Support

For technical issues, contact support with:
1. Your organization ID
2. Request timestamp
3. Error message received
4. Message ID (if available)
5. Steps to reproduce the issue

## 8. Security Recommendations

- Store your API key securely - never expose it in client-side code
- Use HTTPS for all API requests
- Rotate API keys periodically using the dashboard
- Implement rate limiting on your end to prevent accidental API abuse
- Monitor your usage statistics regularly

---

This service provides a comprehensive solution for sending both emails and SMS messages through a unified API. For specific customization needs or further assistance, please contact the service administrator.
```

This updated readme includes Render-specific deployment instructions, mentions the SMS functionality, and provides a more streamlined structure that focuses on getting users up and running on Render quickly.

