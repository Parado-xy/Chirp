# Email Service - Developer Guide

## 1. Introduction

Welcome to the Email Service API documentation! This microservice provides a robust solution for programmatically sending emails through a RESTful API interface. By abstracting away the complexities of email delivery, organizations can easily integrate email functionality into their applications. The service implements an asynchronous processing architecture for reliable, high-volume email delivery.

## 2. System Architecture

The service follows a modular microservice architecture with asynchronous job processing:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Your Service   │     │   Email Service  │     │  Redis Queue &   │     │   Email Provider │
│   or Application │────▶│      API         │────▶│  Worker Process  │────▶│   (Gmail, etc.) │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
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
- **Authentication**: API key-based security
- **Data Storage**: MongoDB for organization and email data
- **Job Queue**: Redis with BullMQ for reliable asynchronous processing
- **Worker Process**: Background email sending with automatic retries
- **Email Delivery**: Nodemailer with configurable providers
- **Error Handling**: Centralized error processing

## 3. Setup & Installation

### Prerequisites

- Node.js (v14+)
- MongoDB (local or hosted)
- Redis server (local or hosted)
- SMTP credentials (Gmail or other provider)

### Installation Steps

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment:
   ```
   cp config/.env.development.locals.example config/.env.development.locals
   ```
4. Edit .env.development.locals with your settings
5. Start the API service:
   ```
   npm run dev
   ```
6. Start the worker process (in a separate terminal):
   ```
   node src/worker.js
   ```

## 4. Authentication

This service uses API key authentication to identify organizations:

1. **Register your organization** to receive an API key
2. **Include the API key** in the Authorization header for all requests
3. The system **validates your API key** and identifies your organization
4. **Usage statistics** are tracked per organization

## 5. API Reference

### Authentication Endpoints

#### Register Organization

```
POST /api/v1/auth/register

Request Body:
{
  "name": "Your Organization Name",
  "email": "contact@yourorganization.com"
}

Response:
{
  "success": true,
  "apiKey": "ed9a3d7648a570d729609a5266a8ce442d29b3f8bdbe0710b77597bc607af98e"
}
```

### Email Endpoints

#### Send Email

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

## 6. Usage Examples

### Sending an Email (with curl)

```bash
curl -X POST https://your-api.com/api/v1/mail \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Hello from API",
    "content": "<h1>Hello!</h1><p>This is a test email sent via API.</p>"
  }'
```

### Integration Example (JavaScript)

```javascript
async function sendEmail(apiKey, to, subject, content) {
  const response = await fetch('https://your-api.com/api/v1/mail', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      subject,
      content
    })
  });
  
  return await response.json();
}

// Usage
sendEmail(
  'your-api-key',
  'customer@example.com',
  'Welcome to our service!',
  '<h1>Welcome</h1><p>Thank you for signing up!</p>'
).then(result => console.log(result));
```

### Integration Example (Python)

```python
import requests
import json

def send_email(api_key, to, subject, content):
    url = "https://your-api.com/api/v1/mail"
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "to": to,
        "subject": subject,
        "content": content
    }
    
    response = requests.post(url, headers=headers, json=payload)
    return response.json()

# Usage
result = send_email(
    "your-api-key",
    "customer@example.com",
    "Welcome to our service!",
    "<h1>Welcome</h1><p>Thank you for signing up!</p>"
)
print(result)
```

## 7. Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5679` |
| `NODE_ENV` | Environment | `development` |
| `SMTP_USER` | SMTP username | `your@gmail.com` |
| `SMTP_PASS` | SMTP password | `your-app-password` |
| `MAIL_SERVICE_PROVIDER` | Email provider | `gmail` |
| `DB_URI` | MongoDB connection | `mongodb://localhost:27017/MailService` |
| `VERSION` | API version | `v1` |
| `REDIS_HOST` | Redis server hostname | `localhost` or `172.22.86.56` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis server password | `your-redis-password` |

## 8. Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error message here"
}
```

Common error scenarios:

| Status | Scenario | Solution |
|--------|----------|----------|
| 400 | Invalid request body | Check your request parameters |
| 401 | Invalid/missing API key | Verify your Authorization header |
| 403 | Account not active | Contact support to activate your account |
| 429 | Rate limit/quota exceeded | Wait or request a quota increase |
| 500 | Server error | Contact support with error details |
| 503 | Service unavailable | Redis queue service is down |

## 9. Asynchronous Processing

This service processes emails asynchronously for improved reliability:

1. When an email is requested, it is stored in the database and queued in Redis
2. The API responds immediately with a success status and email ID
3. A separate worker process picks up the email job and attempts delivery
4. Failed deliveries are automatically retried with exponential backoff
5. Email status is tracked in the database (queued, sent, failed)

### Running the Worker

The worker process must be running to send emails:

```bash
# Start the worker process
node src/worker.js
```

In production, use a process manager like PM2:

```bash
npm install -g pm2
pm2 start src/worker.js --name "email-worker"
```

## 10. Limitations and Usage Policies

- Daily email quota default: 200 emails per organization
- Rate limit: Configurable per organization
- Content restrictions: Follows standard email provider policies
- Attachment support: Not available in MVP version
- Worker concurrency: 5 emails processed simultaneously by default

## 11. Best Practices

- **Store your API key securely** - Never expose it in client-side code
- **Handle errors gracefully** - Check for error responses in your code
- **Implement idempotent requests** - Avoid duplicate emails on retries
- **Monitor your usage** - Track your email sending quota
- **Test thoroughly** - Before sending to real recipients
- **Use a monitoring tool** - To ensure the worker process stays running

## 12. Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key format (should be a 64-character hex string)
   - Ensure proper "Bearer" prefix in Authorization header

2. **Email Not Delivered**
   - Check if worker process is running
   - Verify Redis connection is active
   - Check recipient address format
   - Verify your account is active and within quota
   - Check spam folders

3. **Connection Issues**
   - Verify your network connectivity
   - Check MongoDB and Redis service status

### Getting Support

For technical issues, contact support with:
1. Your organization ID
2. Request timestamp
3. Error message received
4. Email ID (if available)
5. Steps to reproduce the issue

## 13. Roadmap

Future features planned:
- Email templates
- Attachment support
- Webhook notifications for email status changes
- Analytics dashboard
- Multi-region deployment
- Horizontal worker scaling

---

This documentation provides a comprehensive guide to the Email Service API. For specific customization needs or further assistance, please contact the service administrator.

Similar code found with 2 license types