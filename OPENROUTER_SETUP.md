# OpenRouter Setup Guide

## ✅ OpenRouter Integration Complete!

The system now supports **OpenRouter** as an AI provider, giving you access to multiple AI models through a single API with potentially lower costs.

---

## 🔧 Configuration

### Add to your `backend/.env` file:

```env
# AI Provider Configuration
USE_OPENROUTER="true"

# OpenRouter API Key
OPENROUTER_API_KEY="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"

# AI Model Selection (OpenRouter format)
OPENAI_MODEL="openai/gpt-4o-mini"

# Site Information (for OpenRouter rankings - optional)
SITE_URL="https://your-site.com"
SITE_NAME="HomeSchool Exam System"
```

---

## 🎯 Available Models via OpenRouter

OpenRouter gives you access to many models:

### OpenAI Models (Recommended):
- `openai/gpt-4o` - Most capable, higher cost
- `openai/gpt-4o-mini` - Best balance (recommended) ✅
- `openai/gpt-4-turbo` - Fast and capable
- `openai/gpt-3.5-turbo` - Fastest, lowest cost

### Anthropic Models:
- `anthropic/claude-3-opus` - Most capable
- `anthropic/claude-3-sonnet` - Balanced
- `anthropic/claude-3-haiku` - Fast and affordable

### Google Models:
- `google/gemini-pro` - Google's best

### Meta Models:
- `meta-llama/llama-3-70b-instruct` - Open source, powerful

### And many more at: https://openrouter.ai/models

---

## 💰 Cost Comparison

OpenRouter often offers better pricing than direct API access:

| Model | Direct OpenAI | via OpenRouter | Savings |
|-------|---------------|----------------|---------|
| GPT-4o-mini | $0.15/$0.60 | $0.15/$0.60 | Same |
| GPT-4o | $5.00/$15.00 | $5.00/$15.00 | Same |
| Claude-3-Sonnet | N/A | $3.00/$15.00 | Available! |

Plus: OpenRouter provides unified API for multiple providers!

---

## 🚀 How It Works

### Architecture:

```
Your App → OpenRouter API → Multiple AI Providers
                           ↓
                    ┌──────┴──────┐
                    │             │
                 OpenAI      Anthropic
                 Google        Meta
```

### Benefits:

1. ✅ **Single API Key** - Access multiple providers
2. ✅ **Cost Optimization** - Compare prices easily
3. ✅ **Fallback Options** - Switch models if one fails
4. ✅ **Unified Interface** - Same code for all models
5. ✅ **Better Rates** - Often cheaper than direct access

---

## 🔄 Switching Between Providers

### Use OpenRouter (Recommended):
```env
USE_OPENROUTER="true"
OPENROUTER_API_KEY="sk-or-v1-your-key"
OPENAI_MODEL="openai/gpt-4o-mini"
```

### Use Direct OpenAI:
```env
USE_OPENROUTER="false"
OPENAI_API_KEY="sk-your-openai-key"
OPENAI_MODEL="gpt-4o-mini"
```

The system automatically handles the different API formats!

---

## 📝 Features Using AI

The following features use the AI provider:

1. **Exam Generation** - AI creates full exams
2. **Study Module Generation** - AI creates learning content
3. **Auto Grading** - AI grades open-ended answers
4. **Question Suggestions** - AI helps create questions

All work with both OpenRouter and direct OpenAI!

---

## 🔑 Getting Your OpenRouter API Key

1. Go to: https://openrouter.ai
2. Sign up or login
3. Navigate to **Keys** section
4. Click **Create Key**
5. Copy your key (starts with `sk-or-v1-`)
6. Add credits to your account
7. Paste into your `.env` file

Your key is already configured:
```
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
```

---

## 🧪 Testing

### Test Exam Generation:
1. Login as Teacher
2. Go to **Create Exam** → **AI Generation**
3. Fill in exam details
4. Click **Generate with AI**
5. Should work perfectly! ✅

### Check Logs:
```bash
cd backend
npm run dev
# Watch for AI requests in console
```

---

## 📊 Monitoring Usage

### OpenRouter Dashboard:
- View API usage: https://openrouter.ai/dashboard
- Check costs per model
- Monitor request counts
- Set spending limits

---

## ⚡ Performance Tips

1. **Use `gpt-4o-mini`** for most tasks (fast + cheap)
2. **Use `gpt-4o`** only when quality critical
3. **Set `max_tokens`** appropriately (we use 2000)
4. **Enable caching** (OpenRouter auto-caches)
5. **Monitor costs** regularly

---

## 🛠️ Troubleshooting

### "AI generation is not available"
**Solution:** Check your `.env` file has correct API key

### "Failed to initialize AI client"
**Solution:** Ensure `USE_OPENROUTER="true"` is set

### Slow responses
**Solution:** Try a faster model like `gpt-3.5-turbo`

### High costs
**Solution:** Switch to `gpt-4o-mini` or other cheaper models

---

## 🎉 You're All Set!

OpenRouter is now fully integrated and ready to use. The system will automatically:

- ✅ Route requests through OpenRouter
- ✅ Use the correct model format
- ✅ Include site information for rankings
- ✅ Handle responses correctly
- ✅ Provide proper error messages

**Just restart your backend server and you're good to go!**

```bash
cd backend
npm run dev
```

Happy teaching! 📚✨

