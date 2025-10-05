# 🚀 Deployment Configuration Updates

## ✅ Changes Made

### **1. Updated Docker Compose Files**

Both staging and production Docker compose files have been updated to:

#### **Changed Environment Variables:**
- ❌ Removed: `OPENAI_API_KEY`
- ❌ Removed: `OPENAI_MODEL`
- ✅ Added: `OPENROUTER_API_KEY`
- ✅ Added: `AI_MODEL`
- ✅ Added: `SITE_NAME`

#### **Updated Server IPs:**
- **Staging:**
  - Frontend URL: `http://46.101.148.62:5003`
  - Backend API: `http://46.101.148.62:5002`
  - Flutterwave Redirect: `http://46.101.148.62:5003/payment/callback`

- **Production:**
  - Frontend URL: `http://46.101.148.62:5005`
  - Backend API: `http://46.101.148.62:5004`
  - Flutterwave Redirect: `http://46.101.148.62:5005/payment/callback`

---

### **2. Updated GitHub Actions Workflows**

Both `deploy-staging.yml` and `deploy-production.yml` have been updated:

#### **Fixed SSH Connection:**
- Changed from direct secret substitution to environment variables
- Added proper quoting: `"${SERVER_USER}@${SERVER_IP}"`

#### **Updated Environment Variables:**
- ❌ Removed: `OPENAI_API_KEY="${{ secrets.OPENAI_API_KEY }}"`
- ✅ Added: `OPENROUTER_API_KEY="${{ secrets.OPENROUTER_API_KEY }}"`
- ✅ Added: `AI_MODEL="${{ secrets.AI_MODEL }}"`
- ✅ Added: `SITE_NAME="${{ secrets.SITE_NAME }}"`

---

## 📋 Required GitHub Secrets

Both staging and production now use the **same environment variable names**:

### **SSH Secrets:**
- ✅ `SSH_PRIVATE_KEY`
- ✅ `SSH_PASSPHRASE`
- ✅ `SERVER_USER`
- ✅ `SERVER_IP`

### **Application Secrets:**
- ✅ `JWT_SECRET`
- ✅ `JWT_REFRESH_SECRET`
- ✅ `OPENROUTER_API_KEY`
- ✅ `AI_MODEL`
- ✅ `SITE_NAME`

### **Flutterwave Secrets:**
- ✅ `FLUTTERWAVE_PUBLIC_KEY`
- ✅ `FLUTTERWAVE_SECRET_KEY`
- ✅ `FLUTTERWAVE_ENCRYPTION_KEY`
- ✅ `FLUTTERWAVE_WEBHOOK_SECRET`

### **Email Secrets (Optional):**
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

### **Google OAuth (Optional):**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

### **Admin Account (Optional):**
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

---

## 🎯 Benefits

1. ✅ **Consistency:** Staging and production use identical environment variable names
2. ✅ **OpenRouter:** Both environments now use OpenRouter instead of OpenAI
3. ✅ **Simplified:** Same secrets work for both environments
4. ✅ **Fixed IPs:** No more `YOUR_STAGING_SERVER_IP` placeholders
5. ✅ **Robust SSH:** Proper variable quoting prevents connection errors

---

## 🚀 Next Steps

1. **Ensure all secrets are added to GitHub:**
   - Go to: https://github.com/ishimweeli/homeSchoolingExamSystem/settings/secrets/actions
   - Verify all required secrets are present

2. **Commit and push these changes:**
   ```bash
   git add .
   git commit -m "feat: standardize deployment configs for staging and production"
   git push origin staging
   ```

3. **The deployment will automatically trigger** when you push to the `staging` branch

4. **For production deployment:**
   ```bash
   git checkout production
   git merge staging
   git push origin production
   ```

---

## 📊 Port Mapping

| Environment | Service | Container Port | Host Port | Public URL |
|-------------|---------|----------------|-----------|------------|
| **Staging** | Frontend | 80 | 5003 | http://46.101.148.62:5003 |
| **Staging** | Backend | 5000 | 5002 | http://46.101.148.62:5002 |
| **Staging** | Redis | 6379 | 6380 | Internal only |
| **Production** | Frontend | 80 | 5005 | http://46.101.148.62:5005 |
| **Production** | Backend | 5000 | 5004 | http://46.101.148.62:5004 |
| **Production** | Redis | 6379 | 6381 | Internal only |

---

## ✅ Ready to Deploy!

All configuration files are now updated and consistent. Once you add the required secrets to GitHub and push to the `staging` branch, the deployment will work automatically! 🎉

