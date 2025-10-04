# 🤖 AI Models Quick Reference

Your system uses **OpenRouter** - one API key for all AI providers!

---

## 🚀 Current Setup:

```env
OPENROUTER_API_KEY="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"
AI_MODEL="openai/gpt-4o-mini"
```

---

## 🔄 To Switch Models:

Just change `AI_MODEL` in your `.env` file and restart!

---

## 📊 Recommended Models:

### ⚡ **Best Overall (Recommended)**
```env
AI_MODEL="openai/gpt-4o-mini"
```
- Fast, cheap, excellent quality
- Perfect for exam generation
- $0.15/1M input tokens

### 🎯 **Most Capable**
```env
AI_MODEL="openai/gpt-4o"
```
- Highest quality
- Best for complex tasks
- $5.00/1M input tokens

### 💰 **Cheapest**
```env
AI_MODEL="openai/gpt-3.5-turbo"
```
- Very fast
- Good quality
- $0.50/1M input tokens

---

## 🌟 Alternative Providers:

### Anthropic Claude (Great for long content)
```env
AI_MODEL="anthropic/claude-3-sonnet"
AI_MODEL="anthropic/claude-3-opus"
AI_MODEL="anthropic/claude-3-haiku"
```

### Google Gemini (Free tier available)
```env
AI_MODEL="google/gemini-pro"
AI_MODEL="google/gemini-pro-vision"
```

### Meta Llama (Open source)
```env
AI_MODEL="meta-llama/llama-3-70b-instruct"
AI_MODEL="meta-llama/llama-3-8b-instruct"
```

### Microsoft (Good for structured output)
```env
AI_MODEL="microsoft/phi-3-medium-4k-instruct"
```

---

## 💡 When to Use What:

| Task | Recommended Model | Why |
|------|------------------|-----|
| **Exam Generation** | `openai/gpt-4o-mini` | Fast, cheap, accurate |
| **Study Modules** | `openai/gpt-4o-mini` | Good structured output |
| **Complex Questions** | `openai/gpt-4o` | Best reasoning |
| **Budget Mode** | `openai/gpt-3.5-turbo` | Lowest cost |
| **Long Content** | `anthropic/claude-3-sonnet` | 200k context |
| **Free Tier** | `google/gemini-pro` | No cost |

---

## 📈 Cost Comparison:

| Model | Input Cost | Output Cost | Speed | Quality |
|-------|-----------|-------------|-------|---------|
| GPT-4o-mini | $0.15/1M | $0.60/1M | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| GPT-4o | $5.00/1M | $15.00/1M | ⚡⚡ | ⭐⭐⭐⭐⭐ |
| GPT-3.5 | $0.50/1M | $1.50/1M | ⚡⚡⚡⚡ | ⭐⭐⭐ |
| Claude-3-Sonnet | $3.00/1M | $15.00/1M | ⚡⚡ | ⭐⭐⭐⭐⭐ |
| Gemini-Pro | Free* | Free* | ⚡⚡⚡ | ⭐⭐⭐⭐ |
| Llama-3-70B | $0.90/1M | $0.90/1M | ⚡⚡ | ⭐⭐⭐⭐ |

---

## 🔧 How to Switch:

### Step 1: Edit `.env`
```bash
cd backend
nano .env
```

### Step 2: Change model
```env
AI_MODEL="anthropic/claude-3-sonnet"  # or any other
```

### Step 3: Restart server
```bash
npm run dev
```

### Step 4: Test
Generate an exam to verify it works!

---

## 🌐 See All Models:

Visit: **https://openrouter.ai/models**

- 100+ models available
- Real-time pricing
- Performance benchmarks
- Context length comparison

---

## 💳 Monitor Usage:

Dashboard: **https://openrouter.ai/dashboard**

- View costs per model
- Set spending limits
- Track request counts
- Analyze usage patterns

---

## ⚠️ Important Notes:

1. **Context Length**: Some models have larger context (Claude: 200k vs GPT: 128k)
2. **Rate Limits**: Vary by model, check OpenRouter docs
3. **Availability**: Some models may have queues during high demand
4. **Pricing**: Can change, always check current rates
5. **Quality**: Test with your use case to find best fit

---

## 🎯 Quick Test Command:

```bash
# After changing model in .env
cd backend
npm run dev

# Watch logs to see which model is being used
```

---

## ✅ Your Current Setup (Recommended):

```env
OPENROUTER_API_KEY="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"
AI_MODEL="openai/gpt-4o-mini"
```

**This is a great default!** Fast, affordable, high quality. ✨

Change anytime by editing `AI_MODEL` in your `.env` file!

