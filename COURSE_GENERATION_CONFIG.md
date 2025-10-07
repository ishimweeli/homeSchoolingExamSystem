# Course Generation Configuration

## Conservative Approach (100% Reliability)

### Token Limits
- **Complete Course (grade 0):** 25,000 tokens per request
- **Regular Courses (grades 1-13):** 20,000 tokens per request

### Lesson Limits
- **Maximum lessons:** 10 lessons per course
- **Default lessons:** 10 lessons
- **Minimum lessons:** 1 lesson

### Token Breakdown (10 lessons)
- 25,000 tokens ÷ 10 lessons = **2,500 tokens per lesson**
- 2,500 tokens ≈ **1,875 words** ≈ **3-4 pages per lesson**
- Each lesson has ~8 steps = **~312 tokens per step** (plenty of detail)

### Why This Configuration?

#### ✅ Advantages
1. **100% Reliable** - Single API call, no merge conflicts
2. **No Duplication** - Perfect progression, no repeated topics
3. **Consistent Quality** - Same AI "mood" throughout the course
4. **Fast Generation** - Single request completes in ~30-60 seconds
5. **Cost Effective** - One API call instead of multiple

#### 📊 What 10 Lessons Covers
- **Complete Courses:** Comprehensive overview with key topics
- **Grade-specific:** Deep dive into curriculum standards
- Each lesson includes:
  - Theory section with examples
  - 6-8 interactive exercises
  - Multiple question types (MC, fill-in-blank, matching, true/false)
  - Clear progression from basics to mastery

### Error Handling
- **Retry logic:** Up to 2 retries with exponential backoff
- **Timeout:** 120 seconds per request
- **JSON validation:** Automatic cleanup of malformed responses
- **Incomplete response detection:** Warns user to retry or reduce complexity

### Split-Merge Strategy (DISABLED)
The split-merge approach has been disabled for maximum reliability. While it technically works for 20+ lesson courses, it introduces:
- Risk of topic duplication (~10-15%)
- Inconsistent difficulty progression
- Different writing styles between parts
- Potential curriculum gaps

For users who need more than 10 lessons, they should create multiple related courses.

## Token Usage by Component

| Component | Tokens | Words | Pages |
|-----------|--------|-------|-------|
| System message | ~150 | ~113 | ~0.2 |
| User prompt | ~700 | ~525 | ~1 |
| AI response (10 lessons) | ~18,000-22,000 | ~13,500-16,500 | ~30-35 |
| **Total per request** | ~19,000-23,000 | ~14,000-17,000 | ~31-36 |

## Recommended Course Structure

### For Teachers Creating Courses:
1. **Focus on quality over quantity** - 10 high-quality lessons > 20 mediocre ones
2. **Break large topics into series** - Create "Part 1" and "Part 2" as separate courses
3. **Use descriptive titles** - "Passive Voice - Basics" vs "Passive Voice - Advanced"
4. **Leverage curriculum alignment** - Each lesson maps to specific standards

### For Students Taking Courses:
- 10 lessons × 8 steps = **80 interactive exercises**
- Average time: **15-20 minutes per lesson**
- Total course completion: **2.5-3 hours** of engaging learning
- Perfect for daily practice (1 lesson per day = 10-day course)

## Future Improvements (Optional)

If higher lesson counts are needed:
1. Implement "Course Series" feature (link multiple 10-lesson courses)
2. Add "Premium" tier with split-merge for 20 lessons (with user warning)
3. Use streaming API for real-time progress updates
4. Implement caching for frequently requested topics

---

**Last Updated:** 2025-10-07
**Configuration Version:** 1.0 (Conservative)
