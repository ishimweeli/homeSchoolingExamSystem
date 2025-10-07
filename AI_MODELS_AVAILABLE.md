# Available AI Models for Study Module Generation

## Current Configuration
**Model**: `openai/gpt-4o-mini` (GPT-4o Mini)  
**Status**: ✅ Active and working

---

## OpenAI Models (via OpenRouter)

### 1. GPT-4o Mini (Currently Using) ⭐ RECOMMENDED
```env
AI_MODEL="openai/gpt-4o-mini"
```
- **Cost**: $0.15 input / $0.60 output per 1M tokens
- **Best for**: Educational content, cost-effective
- **Speed**: Very fast
- **Quality**: Excellent for study modules

### 2. GPT-4o (Full Version)
```env
AI_MODEL="openai/gpt-4o"
```
- **Cost**: $2.50 input / $10 output per 1M tokens
- **Best for**: Complex reasoning, highest quality
- **Speed**: Fast
- **Quality**: Superior, more detailed responses

### 3. GPT-4 Turbo
```env
AI_MODEL="openai/gpt-4-turbo"
```
- **Cost**: $10 input / $30 output per 1M tokens
- **Best for**: Most advanced tasks
- **Speed**: Medium
- **Quality**: Highest OpenAI quality

### 4. GPT-3.5 Turbo (Budget Option)
```env
AI_MODEL="openai/gpt-3.5-turbo"
```
- **Cost**: $0.50 input / $1.50 output per 1M tokens
- **Best for**: Simple content, budget-conscious
- **Speed**: Very fast
- **Quality**: Good for basic content

---

## Anthropic Claude Models

### 1. Claude 3.5 Sonnet (Newest)
```env
AI_MODEL="anthropic/claude-3.5-sonnet"
```
- **Cost**: $3 input / $15 output per 1M tokens
- **Best for**: Creative writing, detailed explanations
- **Speed**: Fast
- **Quality**: Excellent for educational content

### 2. Claude 3 Opus
```env
AI_MODEL="anthropic/claude-3-opus"
```
- **Cost**: $15 input / $75 output per 1M tokens
- **Best for**: Most complex tasks
- **Speed**: Medium
- **Quality**: Highest Anthropic quality

---

## Google Gemini Models

### Gemini Pro
```env
AI_MODEL="google/gemini-pro"
```
- **Cost**: Free tier available, then paid
- **Best for**: Fast generation
- **Speed**: Very fast
- **Quality**: Good

---

## How to Change Models

1. **Open**: `backend/.env` file
2. **Change**: The `AI_MODEL` line
3. **Save**: The file
4. **Restart**: Backend server (`npm run dev`)

### Example .env:
```env
# Current (cost-effective)
AI_MODEL="openai/gpt-4o-mini"

# Or upgrade to full GPT-4o
# AI_MODEL="openai/gpt-4o"

# Or try Claude
# AI_MODEL="anthropic/claude-3.5-sonnet"
```

---

## Recommendations by Use Case

### For Production (Cost-Effective):
✅ **`openai/gpt-4o-mini`** - Best balance of quality and cost

### For Premium Quality:
🏆 **`openai/gpt-4o`** - Highest quality OpenAI model

### For Creative Content:
🎨 **`anthropic/claude-3.5-sonnet`** - Excellent for engaging educational content

### For Budget/Testing:
💰 **`openai/gpt-3.5-turbo`** - Cheapest option

---

## Cost Comparison (per 1M tokens)

| Model | Input Cost | Output Cost | Total for 10 Modules* |
|-------|-----------|-------------|----------------------|
| GPT-4o Mini | $0.15 | $0.60 | ~$1.50 |
| GPT-4o | $2.50 | $10.00 | ~$25.00 |
| GPT-3.5 Turbo | $0.50 | $1.50 | ~$4.00 |
| Claude 3.5 Sonnet | $3.00 | $15.00 | ~$36.00 |

*Estimated based on typical study module generation

---

## Note on GPT-5
⚠️ **GPT-5 does not exist yet** (as of October 2024)  
The latest OpenAI model is **GPT-4o** and its mini variant **GPT-4o Mini**

