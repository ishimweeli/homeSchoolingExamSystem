# Secrets Configuration Checklist

Before deploying, replace these placeholder values in `docker-compose.yml`:

## ✅ Required Secrets (Must configure before deployment)

### 1. Database (Line 32)
```yaml
DATABASE_URL: postgresql://user:password@your-neon-endpoint.neon.tech/database?sslmode=require
```
- Replace with your Neon PostgreSQL connection string
- Get from: https://console.neon.tech/

### 2. JWT Secrets (Lines 38-39)
```yaml
JWT_SECRET: your_strong_jwt_secret_key_here_minimum_32_characters_long
JWT_REFRESH_SECRET: your_strong_jwt_refresh_secret_key_here_minimum_32_characters
```
- Generate with: `openssl rand -base64 32`
- Must be at least 32 characters
- Keep these secret!

### 3. OpenAI API (Line 44)
```yaml
OPENAI_API_KEY: sk-proj-your_openai_api_key_here
```
- Get from: https://platform.openai.com/api-keys
- Required for AI exam generation features

### 4. Flutterwave Payment (Lines 48-51)
```yaml
FLUTTERWAVE_PUBLIC_KEY: FLWPUBK_TEST-your_public_key_here
FLUTTERWAVE_SECRET_KEY: FLWSECK_TEST-your_secret_key_here
FLUTTERWAVE_ENCRYPTION_KEY: FLWSECK_TEST-your_encryption_key_here
FLUTTERWAVE_WEBHOOK_SECRET: your_webhook_secret_here
```
- Get from: https://dashboard.flutterwave.com/
- Use TEST keys for testing, LIVE keys for production

### 5. Email SMTP (Lines 61-62)
```yaml
SMTP_USER: your-email@gmail.com
SMTP_PASS: your-app-specific-password
```
- For Gmail, create an App Password: https://myaccount.google.com/apppasswords
- Don't use your regular Gmail password

### 6. Google OAuth (Lines 65-66)
```yaml
GOOGLE_CLIENT_ID: your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET: your-google-client-secret
```
- Get from: https://console.cloud.google.com/apis/credentials
- Add authorized redirect URI: `http://localhost:5001/auth/google/callback`

### 7. Admin Account (Lines 69-70)
```yaml
ADMIN_EMAIL: admin@example.com
ADMIN_PASSWORD: ChangeThisSecurePassword123!
```
- This creates the initial admin user
- Change to your preferred admin email and strong password

---

## 🔧 Optional Configuration (Customize if needed)

### URLs (if not using localhost)
```yaml
# Line 56 - Backend CORS
FRONTEND_URL: http://your-domain.com

# Line 52 - Payment callback
FLUTTERWAVE_REDIRECT_URL: http://your-domain.com/payment/callback

# Line 97 - Frontend API endpoint
VITE_API_URL: http://your-domain.com/api
```

### Ports (if 5000/5001 are taken)
```yaml
# Lines 73, 101
ports:
  - "YOUR_PORT:5000"  # Backend
  - "YOUR_PORT:80"    # Frontend
```

---

## 🚀 Quick Setup Commands

### Generate JWT Secrets
```bash
# On Linux/Mac/Git Bash
openssl rand -base64 32
```

### On Windows PowerShell
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

---

## ⚠️ Security Checklist

- [ ] Replaced DATABASE_URL with production database
- [ ] Generated random JWT secrets (not using defaults)
- [ ] Set strong admin password
- [ ] Using production API keys (not TEST keys for production)
- [ ] Configured SMTP with app-specific password
- [ ] Set up Google OAuth with correct redirect URIs
- [ ] Changed all placeholder values
- [ ] Never commit docker-compose.yml with real secrets to public repos

---

## 📝 Example Configuration

Here's what configured values should look like:

```yaml
DATABASE_URL: postgresql://myuser:Xk9mP2nQ@ep-cool-breeze-123456.us-east-2.aws.neon.tech/homeschool_db?sslmode=require
JWT_SECRET: 7YwN2fKp9vBq3mR5tXz8cWh1jL4nS6aD9fG2kM5pR7tY0wB3eH6jN9qT2vZ5cF8h
JWT_REFRESH_SECRET: 3fG6jK9mP2sV5yB8eH1kN4qT7wZ0cF3h6L9oR2uX5zA8dG1jM4pS7vY0bE3hK6n
OPENAI_API_KEY: sk-proj-Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90Uv12
FLUTTERWAVE_PUBLIC_KEY: FLWPUBK-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-X
FLUTTERWAVE_SECRET_KEY: FLWSECK-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0-X
SMTP_USER: noreply@myschool.com
SMTP_PASS: abcd efgh ijkl mnop
GOOGLE_CLIENT_ID: 123456789012-abc123def456ghi789jkl012mno345pqr.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET: GOCSPX-AbC123DeF456GhI789JkL012
ADMIN_EMAIL: admin@myschool.com
ADMIN_PASSWORD: MyS3cur3P@ssw0rd2025!
```

---

## ✅ Configuration Complete?

Once all secrets are configured, deploy with:

```bash
./deploy.sh
```

Or manually:

```bash
docker-compose up -d
```

---

**Need Help?** See `DEPLOYMENT.md` for full deployment guide.
