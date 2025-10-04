# GitHub Secrets Setup Guide

## Required Secrets

You need to add these secrets to your GitHub repository for the deployment workflows to work.

### How to Add Secrets:

1. Go to your GitHub repository: https://github.com/ishimweeli/homeSchoolingExamSystem
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below

---

## 🔐 Secrets to Add:

### Server Access Secrets

| Secret Name | Description | Example/Value |
|-------------|-------------|---------------|
| `SSH_PRIVATE_KEY` | Your SSH private key for server access | Contents of your `~/.ssh/id_ed25519` file |
| `SSH_PASSPHRASE` | Passphrase for your SSH key (if any) | Your SSH key passphrase or leave empty |
| `SERVER_IP` | Your Digital Ocean server IP address | `46.101.148.62` (your server IP) |
| `SERVER_USER` | SSH username for your server | `root` or your server username |

### Application Secrets

| Secret Name | Description |
|-------------|-------------|
| `JWT_SECRET` | Copy from your `.env` file |
| `JWT_REFRESH_SECRET` | Copy from your `.env` file |
| `OPENAI_API_KEY` | Your OpenAI API key |

### Flutterwave Payment Secrets

| Secret Name | Description |
|-------------|-------------|
| `FLUTTERWAVE_PUBLIC_KEY` | Copy from your `.env` file |
| `FLUTTERWAVE_SECRET_KEY` | Copy from your `.env` file |
| `FLUTTERWAVE_ENCRYPTION_KEY` | Copy from your `.env` file |
| `FLUTTERWAVE_WEBHOOK_SECRET` | Copy from your `.env` file |

### Email Secrets

| Secret Name | Description |
|-------------|-------------|
| `SMTP_HOST` | Copy from your `.env` file |
| `SMTP_PORT` | Copy from your `.env` file |
| `SMTP_USER` | Copy from your `.env` file |
| `SMTP_PASS` | Copy from your `.env` file |

### Google OAuth Secrets

| Secret Name | Description |
|-------------|-------------|
| `GOOGLE_CLIENT_ID` | Copy from your `.env` file |
| `GOOGLE_CLIENT_SECRET` | Copy from your `.env` file |

### Admin Credentials

| Secret Name | Description |
|-------------|-------------|
| `ADMIN_EMAIL` | Copy from your `.env` file |
| `ADMIN_PASSWORD` | Copy from your `.env` file |

---

## ⚠️ Priority Secrets (Add These First)

If you already have these from your existing "Deploy Education App" workflow, you're done! Just verify they exist:

1. **SSH_PRIVATE_KEY** - Your SSH key
2. **SSH_PASSPHRASE** - Your SSH passphrase (if you have one)
3. **SERVER_IP** - Your server IP (e.g., `46.101.148.62`)
4. **SERVER_USER** - Usually `root`

Then add the application secrets listed above.

---

## 🧪 Testing After Setup

Once all secrets are added:

1. **Test Staging:**
   ```bash
   git checkout staging
   git push origin staging
   ```
   This will trigger the staging deployment to ports 5002-5003

2. **Test Production:**
   ```bash
   git checkout production
   git push origin production
   ```
   This will trigger the production deployment to ports 5004-5005

---

## 📝 Notes

- Your existing app on port 8000 will not be affected
- All three environments can run simultaneously on the same server
- Secrets are encrypted by GitHub and never exposed in logs
