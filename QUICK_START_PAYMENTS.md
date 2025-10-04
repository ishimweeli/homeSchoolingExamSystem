# 🚀 Quick Start: Enable Flutterwave Payments

## Step 1: Get Your API Keys (5 minutes)

1. Go to: https://dashboard.flutterwave.com
2. Sign up or login
3. Click **Settings** → **API Keys**
4. Copy these 3 values:
   - **Public Key** → starts with `FLWPUBK-`
   - **Secret Key** → starts with `FLWSECK-`
   - **Webhook Hash** → random string

---

## Step 2: Add to Backend .env File

Open `backend/.env` and add these lines:

```env
FLUTTERWAVE_PUBLIC_KEY="FLWPUBK-paste-your-key-here"
FLUTTERWAVE_SECRET_KEY="FLWSECK-paste-your-key-here"
FLUTTERWAVE_WEBHOOK_SECRET="paste-your-hash-here"
FRONTEND_URL="http://localhost:5001"
```

---

## Step 3: Restart Backend Server

```bash
cd backend
npm run dev
```

---

## Step 4: Test the Payment Flow

1. **Login as Teacher/Parent**
2. **Click "Subscription"** in the sidebar
3. **Click "Upgrade Now"** on any paid tier
4. **Complete payment** on Flutterwave page
5. **Get redirected back** → Subscription activated! ✅

---

## 🧪 Test Cards (Sandbox Mode)

Use these test cards during development:

**Mastercard:**
- Card: `5531 8866 5214 2950`
- CVV: `564`
- Expiry: `09/32`
- PIN: `3310`
- OTP: `12345`

**Visa:**
- Card: `4187 4274 1556 4246`
- CVV: `828`
- Expiry: `09/32`
- PIN: `3310`
- OTP: `12345`

---

## ✅ What Happens When User Pays?

1. **Payment verified** ✓
2. **Tier assigned to user** ✓
3. **Expiration date set** ✓
4. **Usage counters reset** ✓
5. **User can create exams/modules** ✓

---

## 🌍 For Production (Live Payments)

1. **Complete business verification** on Flutterwave
2. **Switch to Live API keys** in `.env`
3. **Update webhook URL** to your production domain:
   - Example: `https://api.yourapp.com/api/payments/webhook`
4. **Test with small amounts first!**

---

## 💰 Supported Payment Methods

Flutterwave supports:
- 💳 **Credit/Debit Cards** (Visa, Mastercard, etc.)
- 📱 **Mobile Money** (M-Pesa, MTN, Airtel, etc.)
- 🏦 **Bank Transfers**
- 💵 **USSD**
- 🌐 **PayPal** (in some regions)

---

## 📊 Admin: Create Your First Tier

1. Login as **Admin**
2. Go to **Admin** → **Tiers**
3. Click **"Create New Tier"**
4. Fill in:
   - Name: `Pro Plan`
   - Price: `49.99`
   - Currency: `USD`
   - Max Exams: `50`
   - Max Study Modules: `30`
   - Max Students: `100`
   - Validity Days: `30`
5. Click **"Create Tier"**

Now teachers can subscribe to this tier! 🎉

---

## 🔍 Monitor Payments

- **View user's current tier**: Go to Subscription page
- **Check payment status**: Backend logs or database `payments` table
- **Flutterwave dashboard**: See all transactions at https://dashboard.flutterwave.com

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Payment service not configured" | Add API keys to `.env` file |
| "Failed to initiate payment" | Check secret key is correct |
| Payment not verified | Check webhook URL is accessible |
| User not assigned tier | Check backend logs for errors |

---

## 🎯 You're Done!

**Flutterwave is fully integrated and ready to accept payments!** 🚀

For detailed documentation, see `FLUTTERWAVE_SETUP.md`

