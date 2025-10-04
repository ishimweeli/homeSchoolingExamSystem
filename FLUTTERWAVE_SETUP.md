# Flutterwave Payment Integration Setup Guide

## ✅ Implementation Complete!

Flutterwave payment integration has been fully implemented. Follow these steps to configure and use it:

---

## 🔧 Backend Setup

### 1. Get Flutterwave API Keys

1. Sign up/Login at [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Navigate to **Settings** → **API Keys**
3. Copy your:
   - **Public Key** (starts with `FLWPUBK-`)
   - **Secret Key** (starts with `FLWSECK-`)
   - **Webhook Secret Hash** (for webhook verification)

### 2. Configure Environment Variables

Add these to your `backend/.env` file:

```env
# Flutterwave Payment Integration
FLUTTERWAVE_PUBLIC_KEY="FLWPUBK-your-public-key-here"
FLUTTERWAVE_SECRET_KEY="FLWSECK-your-secret-key-here"
FLUTTERWAVE_WEBHOOK_SECRET="your-webhook-secret-hash-here"

# Frontend URL (for payment redirects)
FRONTEND_URL="http://localhost:5001"
```

### 3. Configure Webhook URL

In your Flutterwave dashboard:
1. Go to **Settings** → **Webhooks**
2. Add your webhook URL: `https://your-domain.com/api/payments/webhook`
3. The webhook will automatically update subscriptions when payments are completed

---

## 📱 Frontend Integration

The frontend is already configured! Users can:

1. **View available tiers** at `/subscription`
2. **Click "Upgrade Now"** on any paid tier
3. **Complete payment** on Flutterwave's secure page
4. **Get redirected back** with automatic verification
5. **Subscription is activated** automatically

---

## 🎯 How It Works

### Payment Flow

```
User clicks "Upgrade Now"
    ↓
Frontend calls: POST /api/payments/initiate
    ↓
Backend creates payment record
    ↓
Backend calls Flutterwave API
    ↓
User redirected to Flutterwave payment page
    ↓
User completes payment
    ↓
Flutterwave redirects back to app
    ↓
Frontend calls: GET /api/payments/verify
    ↓
Backend verifies with Flutterwave
    ↓
Backend assigns tier to user
    ↓
Success! User has new subscription
```

### Webhook Flow (Backup)

```
Flutterwave sends webhook
    ↓
POST /api/payments/webhook
    ↓
Backend verifies signature
    ↓
Backend updates payment status
    ↓
Backend assigns tier to user
```

---

## 🔐 Security Features

✅ **Webhook signature verification** - Only authentic Flutterwave requests are processed  
✅ **Amount validation** - Ensures payment matches tier price  
✅ **Currency validation** - Prevents currency mismatch fraud  
✅ **Transaction reference tracking** - Prevents duplicate payments  
✅ **JWT authentication** - All payment endpoints require valid user token  

---

## 📊 Database Schema

### Payment Model
```prisma
model Payment {
  id            String          @id @default(cuid())
  userId        String
  user          User            @relation(fields: [userId], references: [id])
  subscriptionId String?
  subscription  Subscription?   @relation(fields: [subscriptionId], references: [id])
  provider      PaymentProvider @default(FLUTTERWAVE)
  amountCents   Int             // Amount in cents (e.g., $49.99 = 4999)
  currency      String          @default("USD")
  status        PaymentStatus   @default(PENDING)
  txRef         String          @unique // Transaction reference
  flwRef        String?         // Flutterwave reference
  raw           Json?           // Raw Flutterwave response
  metadata      Json?           // Additional data (tierId, etc.)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}
```

---

## 🌍 Supported Currencies

Flutterwave supports multiple currencies. Update tier currency in Admin panel:

- **USD** - US Dollar
- **RWF** - Rwandan Franc
- **KES** - Kenyan Shilling
- **GHS** - Ghanaian Cedi
- **ZAR** - South African Rand
- **NGN** - Nigerian Naira
- **EUR** - Euro
- **GBP** - British Pound
- And many more!

---

## 🧪 Testing

### Test Mode (Sandbox)

1. Use test API keys from Flutterwave dashboard
2. Use test card numbers:
   ```
   Card: 5531 8866 5214 2950
   CVV: 564
   Expiry: 09/32
   PIN: 3310
   OTP: 12345
   ```

### Production Mode

1. Switch to **Live API keys** in your `.env`
2. Complete Flutterwave business verification
3. Test with small real transactions first

---

## 📡 API Endpoints

### POST `/api/payments/initiate`
Initiates a new payment for a tier subscription.

**Request:**
```json
{
  "tierId": "clxy123456",
  "redirectUrl": "https://yourapp.com/subscription?payment=success"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initiated successfully",
  "data": {
    "paymentUrl": "https://checkout.flutterwave.com/v3/hosted/pay/abc123",
    "txRef": "TXN-1696348290-clxy1234",
    "paymentId": "pay_clxy789"
  }
}
```

### GET `/api/payments/verify?tx_ref=XXX&transaction_id=XXX`
Verifies a payment after user completes checkout.

**Response:**
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "status": "SUCCESS",
    "txRef": "TXN-1696348290-clxy1234",
    "amount": 49.99,
    "currency": "USD"
  }
}
```

### POST `/api/payments/webhook`
Receives webhook notifications from Flutterwave (no auth required - verified by signature).

### GET `/api/payments/history`
Gets user's payment history.

---

## 🚨 Common Issues

### "Payment service is not configured"
**Solution:** Add Flutterwave API keys to your `.env` file

### "Failed to initiate payment"
**Solution:** Check that your secret key is valid and not expired

### "Payment verification failed"
**Possible causes:**
- Amount mismatch
- Currency mismatch
- Invalid transaction reference
- Payment was cancelled/failed on Flutterwave

### Webhook not working
**Solution:**
1. Ensure webhook URL is publicly accessible (use ngrok for local testing)
2. Verify webhook secret matches `.env` configuration
3. Check Flutterwave dashboard webhook logs

---

## 📞 Support

- **Flutterwave Docs:** https://developer.flutterwave.com/docs
- **Flutterwave Support:** support@flutterwavego.com
- **Test Environment:** https://raveapi.flutterwave.com (sandbox)
- **Production:** https://api.flutterwave.com

---

## 🎉 What's Implemented

✅ Full payment initiation flow  
✅ Secure payment verification  
✅ Automatic tier assignment  
✅ Webhook handling for reliability  
✅ Payment history tracking  
✅ Multi-currency support  
✅ Usage limit reset on upgrade  
✅ Expiration date calculation  
✅ Beautiful frontend UI with real-time updates  
✅ Error handling and user feedback  
✅ Security best practices  

**You're ready to accept payments!** 🚀

