# ✅ GitHub Secrets Checklist

## Already Added ✅
- [x] SSH_PRIVATE_KEY
- [x] SSH_PASSPHRASE
- [x] SERVER_USER
- [x] SERVER_IP

## Still Need to Add 📝

### **Critical - Required for Deployment**

- [ ] **OPENROUTER_API_KEY**
  ```
  Value: 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
  ```

- [ ] **AI_MODEL**
  ```
  Value: openai/gpt-4o-mini
  ```

- [ ] **SITE_NAME**
  ```
  Value: HomeSchool Exam System
  ```

- [ ] **JWT_SECRET**
  - Generate at: https://www.random.org/strings/?num=1&len=64&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain
  - Copy the generated string

- [ ] **JWT_REFRESH_SECRET**
  - Generate at: https://www.random.org/strings/?num=1&len=64&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain
  - Copy the generated string (different from JWT_SECRET)

### **Flutterwave - Required for Payments**

Copy these from your Flutterwave dashboard or from your existing Production environment secrets:

- [ ] **FLUTTERWAVE_PUBLIC_KEY**
- [ ] **FLUTTERWAVE_SECRET_KEY**
- [ ] **FLUTTERWAVE_ENCRYPTION_KEY**
- [ ] **FLUTTERWAVE_WEBHOOK_SECRET**

### **Optional - Email Notifications**

- [ ] **SMTP_HOST** (e.g., `smtp.gmail.com`)
- [ ] **SMTP_PORT** (e.g., `587`)
- [ ] **SMTP_USER** (your email)
- [ ] **SMTP_PASS** (email password)

### **Optional - Google OAuth**

- [ ] **GOOGLE_CLIENT_ID**
- [ ] **GOOGLE_CLIENT_SECRET**

### **Optional - Default Admin**

- [ ] **ADMIN_EMAIL**
- [ ] **ADMIN_PASSWORD**

---

## 🎯 Quick Actions

### Add OPENROUTER_API_KEY (Copy-Paste Ready)
1. Go to: https://github.com/ishimweeli/homeSchoolingExamSystem/settings/secrets/actions
2. Click "New repository secret"
3. Name: `OPENROUTER_API_KEY`
4. Value: `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`
5. Click "Add secret"

### Add AI_MODEL
1. Click "New repository secret"
2. Name: `AI_MODEL`
3. Value: `openai/gpt-4o-mini`
4. Click "Add secret"

### Add SITE_NAME
1. Click "New repository secret"
2. Name: `SITE_NAME`
3. Value: `HomeSchool Exam System`
4. Click "Add secret"

### Generate JWT Secrets
Open these links in two browser tabs:
- Tab 1: https://www.random.org/strings/?num=1&len=64&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain
- Tab 2: https://www.random.org/strings/?num=1&len=64&digits=on&upperalpha=on&loweralpha=on&unique=on&format=plain

Copy each generated string and add:
- `JWT_SECRET` → value from Tab 1
- `JWT_REFRESH_SECRET` → value from Tab 2

---

## ✅ Minimum Required for Deployment

To deploy successfully, you MUST add at least these:

1. ✅ SSH_PRIVATE_KEY (already added)
2. ✅ SSH_PASSPHRASE (already added)
3. ✅ SERVER_USER (already added)
4. ✅ SERVER_IP (already added)
5. ❌ OPENROUTER_API_KEY (NEEDED)
6. ❌ AI_MODEL (NEEDED)
7. ❌ SITE_NAME (NEEDED)
8. ❌ JWT_SECRET (NEEDED)
9. ❌ JWT_REFRESH_SECRET (NEEDED)

**Flutterwave can be added later if you're not testing payments immediately.**

---

## 🚀 After Adding Secrets

Once you add the minimum required secrets (5-9 above), run:

```bash
git add .
git commit -m "feat: standardize deployment configs for staging and production"
git push origin staging
```

The deployment will automatically start! 🎉

