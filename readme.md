# Email Service - Developer Guide

## 1. Introduction

Welcome to the Email Service API documentation! This microservice provides a robust solution for programmatically sending emails through a RESTful API interface. By abstracting away the complexities of email delivery, organizations can easily integrate email functionality into their applications.

## 2. System Architecture

The service follows a modular microservice architecture:

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Your Service   │     │   Email Service  │     │   Email Provider │
│   or Application │────▶       API          ────▶    (Gmail, etc.) │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                  │
                                  │
                         ┌────────▼─────────┐
                         │                  │
                         │    MongoDB       │
                         │   Database       │
                         │                  │
                         └──────────────────┘
```

### Core Components:

- **API Layer**: Express.js REST endpoints
- **Authentication**: API key-based security
- **Data Storage**: MongoDB for organization data
- **Email Delivery**: Nodemailer with configurable providers
- **Error Handling**: Centralized error processing

## 3. Setup & Installation

### Prerequisites

- Node.js (v14+)
- MongoDB (local or hosted)
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
5. Start the service:
   ```
   npm run dev
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
  "message": "Email sent successfully",
  "messageId": "<random-id@gmail.com>"
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

## 9. Limitations and Usage Policies

- Daily email quota default: 200 emails per organization
- Rate limit: Configurable per organization
- Content restrictions: Follows standard email provider policies
- Attachment support: Not available in MVP version

## 10. Best Practices

- **Store your API key securely** - Never expose it in client-side code
- **Handle errors gracefully** - Check for error responses in your code
- **Implement retry logic** - For temporary failures
- **Monitor your usage** - Track your email sending quota
- **Test thoroughly** - Before sending to real recipients

## 11. Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify API key format (should be a 64-character hex string)
   - Ensure proper "Bearer" prefix in Authorization header

2. **Email Not Delivered**
   - Check recipient address format
   - Verify your account is active and within quota
   - Check spam folders

3. **Connection Issues**
   - Verify your network connectivity
   - Check service status

### Getting Support

For technical issues, contact support with:
1. Your organization ID
2. Request timestamp
3. Error message received
4. Steps to reproduce the issue

## 12. Roadmap

Future features planned:
- Email templates
- Attachment support
- Webhook notifications
- Analytics dashboard
- Multi-region deployment

---

This documentation provides a comprehensive guide to the Email Service API. For specific customization needs or further assistance, please contact the service administrator.

