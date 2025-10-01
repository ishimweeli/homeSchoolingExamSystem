import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ExamCreateSimple() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    gradeLevel: 5,
    difficulty: 'MEDIUM',
    duration: 30,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    type: 'MULTIPLE_CHOICE',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    marks: 5
  });

  const handleExamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setExamData({
      ...examData,
      [e.target.name]: e.target.name === 'gradeLevel' || e.target.name === 'duration'
        ? parseInt(e.target.value)
        : e.target.value
    });
  };

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCurrentQuestion({
      ...currentQuestion,
      [e.target.name]: e.target.name === 'marks' ? parseInt(e.target.value) : e.target.value
    });
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[index] = value;
    setCurrentQuestion({
      ...currentQuestion,
      options: newOptions
    });
  };

  const addQuestion = () => {
    if (!currentQuestion.question || !currentQuestion.correctAnswer) {
      setError('Please fill in question and correct answer');
      return;
    }

    setExamData({
      ...examData,
      questions: [...examData.questions, currentQuestion]
    });

    // Reset question form
    setCurrentQuestion({
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 5
    });

    setSuccess(`Question added! Total: ${examData.questions.length + 1}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examData.title || !examData.subject) {
      setError('Please fill in exam title and subject');
      return;
    }

    if (examData.questions.length === 0) {
      // Add a default question if none provided
      examData.questions.push({
        type: 'MULTIPLE_CHOICE',
        question: 'Sample Question: What is 2 + 2?',
        options: ['3', '4', '5', '6'],
        correctAnswer: '4',
        marks: 5
      });
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/exams', examData);

      if (response.data.success) {
        setSuccess('Exam created successfully!');
        setTimeout(() => {
          navigate('/exams');
        }, 2000);
      }
    } catch (err: any) {
      console.error('Error creating exam:', err);
      setError(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Exam</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            {/* Exam Details */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Exam Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={examData.title}
                    onChange={handleExamChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Mathematics Test"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={examData.subject}
                    onChange={handleExamChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="e.g., Mathematics"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Grade Level</label>
                  <select
                    name="gradeLevel"
                    value={examData.gradeLevel}
                    onChange={handleExamChange}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(grade => (
                      <option key={grade} value={grade}>Grade {grade}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Difficulty</label>
                  <select
                    name="difficulty"
                    value={examData.difficulty}
                    onChange={handleExamChange}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    value={examData.duration}
                    onChange={handleExamChange}
                    className="w-full border rounded-lg px-3 py-2"
                    min="5"
                    max="180"
                  />
                </div>
              </div>
            </div>

            {/* Add Question Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Add Question</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Question</label>
                  <input
                    type="text"
                    name="question"
                    value={currentQuestion.question}
                    onChange={handleQuestionChange}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Enter your question..."
                  />
                </div>

                {currentQuestion.type === 'MULTIPLE_CHOICE' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Options</label>
                    {currentQuestion.options.map((option, index) => (
                      <input
                        key={index}
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 mb-2"
                        placeholder={`Option ${index + 1}`}
                      />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Correct Answer</label>
                    <input
                      type="text"
                      name="correctAnswer"
                      value={currentQuestion.correctAnswer}
                      onChange={handleQuestionChange}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Enter correct answer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Marks</label>
                    <input
                      type="number"
                      name="marks"
                      value={currentQuestion.marks}
                      onChange={handleQuestionChange}
                      className="w-full border rounded-lg px-3 py-2"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Add Question
                </button>
              </div>
            </div>

            {/* Questions List */}
            {examData.questions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Questions ({examData.questions.length})
                </h3>
                <div className="space-y-2">
                  {examData.questions.map((q: any, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded">
                      <div className="font-medium">Q{index + 1}: {q.question}</div>
                      <div className="text-sm text-gray-600">Answer: {q.correctAnswer} ({q.marks} marks)</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Exam'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/exams')}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}