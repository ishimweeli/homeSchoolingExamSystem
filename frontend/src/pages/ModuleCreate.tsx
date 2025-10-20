import { useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type CountryCode = 'USA' | 'UK' | 'AUSTRALIA' | 'NEW_ZEALAND' | 'RWANDA' | 'GENERAL';

export default function ModuleCreate() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [gradeLevel, setGradeLevel] = useState(0); // 0 = All levels
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [lessonCount, setLessonCount] = useState(10);
  const [includeGamification, setIncludeGamification] = useState(true);
  const [country, setCountry] = useState<CountryCode>('GENERAL');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    
    try {
      toast.info('🤖 AI is generating your interactive study module...');
      
      const module = await api.generateStudyModule({
        subject,
        gradeLevel,
        topic,
        difficulty,
        lessonCount,
        includeGamification,
        country,
      });
      
      toast.success(`✨ Study module "${module.title}" created successfully with ${lessonCount} lessons!`);
      navigate('/modules');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to generate study module';
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/modules')}
            className="text-purple-600 hover:text-purple-700 flex items-center mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Modules
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            ✨ Create Interactive Study Module
          </h1>
          <p className="text-gray-600 mt-2">
            AI will generate a complete Duolingo-style learning experience with lessons, exercises, and quizzes
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl  p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., English, Math, Science"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic *
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Passive Voice, Algebra Basics"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Module Settings Section */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                Module Settings
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country/Curriculum *
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value as CountryCode)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="GENERAL">🌍 General (International) - Default</option>
                    <option value="USA">🇺🇸 USA (Common Core)</option>
                    <option value="UK">🇬🇧 UK (National Curriculum)</option>
                    <option value="AUSTRALIA">🇦🇺 Australia (ACARA)</option>
                    <option value="NEW_ZEALAND">🇳🇿 New Zealand (NZC)</option>
                    <option value="RWANDA">🇷🇼 Rwanda (CBC)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Level *
                  </label>
                  <select
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    {/* All Levels - Default */}
                    <option value="0">All (Complete Course)</option>
                    <option disabled>──────────</option>
                    
                    {/* K-12 Levels */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => {
                      let label = '';
                      if (country === 'RWANDA') {
                        label = grade <= 6 ? `P${grade} (Primary ${grade})` : `S${grade - 6} (Secondary ${grade - 6})`;
                      } else if (country === 'UK' || country === 'AUSTRALIA' || country === 'NEW_ZEALAND') {
                        label = `Year ${grade}`;
                      } else {
                        label = `Grade ${grade}`;
                      }
                      return (
                        <option key={grade} value={grade}>
                          {label}
                        </option>
                      );
                    })}
                    
                    {/* University Level (same for all countries) */}
                    <option disabled>──────────</option>
                    <option value="13">University</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty *
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="easy">Easy 🟢</option>
                    <option value="medium">Medium 🟡</option>
                    <option value="hard">Hard 🔴</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Lessons *
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={10}
                    value={lessonCount}
                    onChange={(e) => setLessonCount(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum: 10 lessons (optimized for quality)</p>
                </div>
              </div>
            </div>

            {/* Gamification Section */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                Learning Features
              </h2>

              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeGamification}
                  onChange={(e) => setIncludeGamification(e.target.checked)}
                  className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Include Gamification 🎮</div>
                  <p className="text-sm text-gray-500">
                    Add XP points, achievements, streaks, and leaderboards to make learning fun and engaging
                  </p>
                </div>
              </label>
            </div>

            {/* AI Generation Info */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-start">
                <div className="text-3xl mr-3">🤖</div>
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">AI-Powered Content Generation</h3>
                  <p className="text-sm text-purple-700">
                    Our AI will create a comprehensive course with:
                  </p>
                  <ul className="text-sm text-purple-700 mt-2 space-y-1 ml-5 list-disc">
                    <li>Interactive lessons with theory, examples, and explanations</li>
                    <li>Multiple choice questions, fill-in-the-blanks, and matching exercises</li>
                    <li>Progressive difficulty that builds on previous lessons</li>
                    <li>Immediate feedback and hints for learners</li>
                    <li>Quizzes to test understanding</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={() => navigate('/modules')}
                disabled={generating}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {generating ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating with AI... (may take 30-60s)
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    ✨ Generate Study Module with AI
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">📚</div>
            <h3 className="font-semibold text-gray-900 mb-1">Interactive Lessons</h3>
            <p className="text-sm text-gray-600">
              Bite-sized content with theory, examples, and practice
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-1">Instant Feedback</h3>
            <p className="text-sm text-gray-600">
              Students get immediate responses and explanations
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl mb-2">🏆</div>
            <h3 className="font-semibold text-gray-900 mb-1">Progress Tracking</h3>
            <p className="text-sm text-gray-600">
              Track completion, XP, streaks, and achievements
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
