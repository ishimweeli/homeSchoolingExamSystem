# 🔐 GitHub Secrets Configuration Guide

## ⚠️ URGENT: Missing GitHub Secrets

Your deployment is failing because **GitHub Actions secrets are not configured**.

The logs show:
```
env:
  SSHPASS: 
  SERVER_USER:     # ← EMPTY!
  SERVER_IP: ***
```

---

## 📋 Required Secrets

### **SSH Connection (REQUIRED)**

1. **`SSH_PRIVATE_KEY`**
   - **How to get it:**
     ```powershell
     # On Windows PowerShell:
     Get-Content C:\Users\EliIs\.ssh\id_ed25519 | clip
     ```
     This copies your private key to clipboard
   
   - **What to paste:** The entire content including:
     ```
     -----BEGIN OPENSSH PRIVATE KEY-----
     ... (all the content) ...
     -----END OPENSSH PRIVATE KEY-----
     ```

2. **`SSH_PASSPHRASE`**
   - **Value:** `Paccy@123`

3. **`SERVER_USER`**
   - **Value:** `root`

4. **`SERVER_IP`**
   - **Value:** `46.101.148.62`

---

### **Application Secrets (REQUIRED)**

5. **`JWT_SECRET`**
   - **Generate with:**
     ```powershell
     # PowerShell:
     -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
     ```
   - Copy the output and use it as the secret value

6. **`JWT_REFRESH_SECRET`**
   - **Generate with:** Same command as above (different value)
   - Copy the output and use it as the secret value

7. **`OPENROUTER_API_KEY`**
   - **Value:** Your OpenRouter API key (from your `.env` file)
   - **Find it in:** `backend/.env` → `OPENROUTER_API_KEY=sk-or-v1-...`

8. **`AI_MODEL`**
   - **Value:** `openai/gpt-4o-mini`

9. **`SITE_NAME`**
   - **Value:** `Homeschool Exam System Staging`

---

### **Flutterwave Secrets (REQUIRED for Payments)**

10. **`FLUTTERWAVE_PUBLIC_KEY`**
    - **Value:** From your Flutterwave dashboard → Settings → API

11. **`FLUTTERWAVE_SECRET_KEY`**
    - **Value:** From your Flutterwave dashboard → Settings → API

12. **`FLUTTERWAVE_ENCRYPTION_KEY`**
    - **Value:** From your Flutterwave dashboard → Settings → API

13. **`FLUTTERWAVE_WEBHOOK_SECRET`**
    - **Value:** From your Flutterwave dashboard → Settings → Webhooks

---

### **Email Secrets (OPTIONAL - for notifications)**

14. **`SMTP_HOST`**
    - **Value:** `smtp.gmail.com` (or your email provider)

15. **`SMTP_PORT`**
    - **Value:** `587` (for TLS) or `465` (for SSL)

16. **`SMTP_USER`**
    - **Value:** Your email address

17. **`SMTP_PASS`**
    - **Value:** Your email password or app password
    - **For Gmail:** Generate an app password at https://myaccount.google.com/apppasswords

---

### **Admin Account (OPTIONAL)**

18. **`ADMIN_EMAIL`**
    - **Value:** `admin@example.com` (or your preferred admin email)

19. **`ADMIN_PASSWORD`**
    - **Value:** A strong password for the admin account

---

### **Google OAuth (OPTIONAL)**

20. **`GOOGLE_CLIENT_ID`**
21. **`GOOGLE_CLIENT_SECRET`**
    - Only needed if you want Google login
    - Get from: https://console.cloud.google.com/apis/credentials

---

## 🚀 How to Add Secrets to GitHub

### **Step-by-Step:**

1. **Go to your repository:**
   ```
   https://github.com/ishimweeli/homeSchoolingExamSystem
   ```

2. **Click:** `Settings` (top menu)

3. **Click:** `Secrets and variables` → `Actions` (left sidebar)

4. **Click:** `New repository secret` (green button)

5. **For each secret above:**
   - **Name:** Enter the exact secret name (e.g., `SSH_PRIVATE_KEY`)
   - **Value:** Paste the secret value
   - **Click:** `Add secret`

6. **Repeat** for all secrets listed above

---

## ✅ Verify Secrets Are Added

After adding all secrets, you should see them listed like:

```
SSH_PRIVATE_KEY        Updated X minutes ago
SSH_PASSPHRASE         Updated X minutes ago
SERVER_USER            Updated X minutes ago
SERVER_IP              Updated X minutes ago
JWT_SECRET             Updated X minutes ago
JWT_REFRESH_SECRET     Updated X minutes ago
OPENROUTER_API_KEY     Updated X minutes ago
AI_MODEL               Updated X minutes ago
SITE_NAME              Updated X minutes ago
FLUTTERWAVE_PUBLIC_KEY Updated X minutes ago
... (and so on)
```

---

## 🔄 Re-run the Deployment

Once all secrets are added:

1. **Go to:** `Actions` tab in your repo
2. **Find the failed workflow:** "Deploy to Staging"
3. **Click:** `Re-run all jobs`

OR

Push a new commit:
```bash
git commit --allow-empty -m "trigger deployment with secrets"
git push origin staging
```

---

## 🎯 Priority Order

If you want to deploy quickly, add these **MINIMUM** secrets first:

1. ✅ `SSH_PRIVATE_KEY`
2. ✅ `SSH_PASSPHRASE`
3. ✅ `SERVER_USER`
4. ✅ `SERVER_IP`
5. ✅ `JWT_SECRET`
6. ✅ `JWT_REFRESH_SECRET`
7. ✅ `OPENROUTER_API_KEY`
8. ✅ `AI_MODEL`
9. ✅ `SITE_NAME`

**Then add Flutterwave secrets later when you need payments.**

---

## 📞 Need Help?

If you're stuck:
1. Double-check the secret names match **exactly** (case-sensitive)
2. Make sure there are no extra spaces in the values
3. Verify the SSH private key includes the full content with headers
4. Test SSH connection locally first: `ssh root@46.101.148.62`

---

**After adding these secrets, your deployment will work! 🎉**
