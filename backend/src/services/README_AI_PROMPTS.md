# AI Prompts Service

## Overview
The `aiPromptService.ts` centralizes all AI prompt generation logic, making it easier to maintain, test, and reuse across the application.

## Structure

### Main Function: `generateStudyModulePrompt()`
Generates comprehensive prompts for AI-powered study module creation.

**Parameters:**
```typescript
{
  subject: string;
  gradeLevel: number;
  topic: string;
  difficulty: string;
  lessonCount: number;
  includeGamification?: boolean;
}
```

**Returns:**
```typescript
{
  systemMessage: string;    // AI personality/role definition
  userPrompt: string;       // Actual generation instructions
  temperature: number;      // Creativity level (0.8 for educational content)
  maxTokens: number;        // Max response length (16384 for GPT-4o-mini)
}
```

## Usage Example

### Before (Controller had everything):
```typescript
// Long prompt string inside controller
const prompt = `Create a module for ${topic}...`;
const completion = await aiClient.chat.completions.create({
  messages: [{ role: 'system', content: '...' }, { role: 'user', content: prompt }],
  temperature: 0.8,
  max_tokens: 16384,
});
```

### After (Clean separation):
```typescript
import { generateStudyModulePrompt } from '../services/aiPromptService';

const promptConfig = generateStudyModulePrompt({
  subject: 'English',
  gradeLevel: 7,
  topic: 'Passive Voice',
  difficulty: 'medium',
  lessonCount: 10,
  includeGamification: true,
});

const completion = await aiClient.chat.completions.create({
  messages: [
    { role: 'system', content: promptConfig.systemMessage },
    { role: 'user', content: promptConfig.userPrompt }
  ],
  temperature: promptConfig.temperature,
  max_tokens: promptConfig.maxTokens,
});
```

## Benefits

✅ **Separation of Concerns**: Controllers focus on business logic, not prompt engineering  
✅ **Reusability**: Same prompt logic can be used in multiple places  
✅ **Testability**: Easy to unit test prompt generation separately  
✅ **Maintainability**: Update prompts in one place  
✅ **Scalability**: Easy to add new prompt types (exams, quizzes, etc.)  

## Future Extensions

The service includes placeholder functions for:
- `generateExamQuestionPrompt()` - For AI exam generation
- `generateContentImprovementPrompt()` - For content refinement

These can be expanded as needed.

## AI Model Configuration

The service uses configuration from `aiClient.ts`:
- Model: Defaults to `openai/gpt-4o-mini` (cost-effective)
- Can be changed via `AI_MODEL` environment variable
- Supports all OpenRouter models

## Prompt Engineering Notes

The study module prompt is optimized for:
- **Duolingo-style learning**: Progressive, bite-sized lessons
- **Engagement**: Gamification, immediate feedback, positive reinforcement
- **Quality**: Comprehensive coverage, multiple learning styles
- **Market value**: Content parents will pay for

Temperature: 0.8 provides balanced creativity without being too random.

