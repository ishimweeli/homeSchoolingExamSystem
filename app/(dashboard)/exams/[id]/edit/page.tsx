'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Plus, Minus, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Question {
  id?: string
  type: string
  question: string
  options?: any
  correctAnswer: any
  marks: number
  difficulty?: string
  topic?: string
}

interface Exam {
  id: string
  title: string
  description: string
  subject: string
  gradeLevel: number
  duration: number
  totalMarks: number
  passingMarks: number
  questions: Question[]
}

interface PageProps {
  params: {
    id: string
  }
}

export default function ExamEditPage({ params }: PageProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    const fetchExam = async () => {
      try {
        const response = await fetch(`/api/exams/${params.id}`)
        if (response.ok) {
          const examData = await response.json()
          setExam(examData)
        } else if (response.status === 404) {
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error fetching exam:', error)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchExam()
  }, [params.id, session, status, router])

  const handleSave = async () => {
    if (!exam) return

    setSaving(true)
    
    const savePromise = fetch(`/api/exams/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exam),
    })

    toast.promise(
      savePromise,
      {
        loading: 'Saving exam...',
        success: (response) => {
          if (response.ok) {
            setTimeout(() => router.push(`/exams/${params.id}`), 1000)
            return 'Exam saved successfully!'
          }
          throw new Error('Failed to save')
        },
        error: 'Failed to save exam',
      }
    ).finally(() => {
      setSaving(false)
    })
  }

  const updateExam = (field: string, value: any) => {
    if (!exam) return
    setExam({ ...exam, [field]: value })
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    if (!exam) return
    const questions = [...exam.questions]
    questions[index] = { ...questions[index], [field]: value }
    setExam({ ...exam, questions })
  }

  const addQuestion = () => {
    if (!exam) return
    const newQuestion: Question = {
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      marks: 5,
      difficulty: 'medium'
    }
    setExam({ ...exam, questions: [...exam.questions, newQuestion] })
  }

  const removeQuestion = (index: number) => {
    if (!exam) return
    const questions = exam.questions.filter((_, i) => i !== index)
    setExam({ ...exam, questions })
  }

  const addOption = (questionIndex: number) => {
    if (!exam) return
    const questions = [...exam.questions]
    const options = [...(questions[questionIndex].options || [])]
    options.push('')
    updateQuestion(questionIndex, 'options', options)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    if (!exam) return
    const questions = [...exam.questions]
    const options = [...(questions[questionIndex].options || [])]
    options.splice(optionIndex, 1)
    updateQuestion(questionIndex, 'options', options)
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    if (!exam) return
    const questions = [...exam.questions]
    const options = [...(questions[questionIndex].options || [])]
    options[optionIndex] = value
    updateQuestion(questionIndex, 'options', options)
  }

  // Do not block; render shell with disabled controls if still loading

  if (!session) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/exams/${params.id}`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Exam
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{loading ? 'Loading…' : 'Edit Exam'}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading || !exam}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Exam Details */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Exam Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={exam?.title || ''}
              onChange={(e) => updateExam('title', e.target.value)}
              disabled={loading || !exam}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={exam?.subject || ''}
              onChange={(e) => updateExam('subject', e.target.value)}
              disabled={loading || !exam}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={exam?.duration ?? 0}
              onChange={(e) => updateExam('duration', parseInt(e.target.value))}
              disabled={loading || !exam}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Marks
            </label>
            <input
              type="number"
              value={exam?.totalMarks ?? 0}
              onChange={(e) => updateExam('totalMarks', parseInt(e.target.value))}
              disabled={loading || !exam}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={exam?.description || ''}
              onChange={(e) => updateExam('description', e.target.value)}
              disabled={loading || !exam}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Questions ({exam?.questions?.length || 0})</h2>
          <button
            onClick={addQuestion}
            disabled={loading || !exam}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </button>
        </div>

        <div className="space-y-6">
          {(exam?.questions || []).map((question, questionIndex) => (
            <div key={questionIndex} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-medium text-gray-900">Question {questionIndex + 1}</h3>
                <button
                  onClick={() => removeQuestion(questionIndex)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-800"
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text
                  </label>
                  <textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                    rows={2}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={question.type}
                      onChange={(e) => updateQuestion(questionIndex, 'type', e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                      <option value="TRUE_FALSE">True/False</option>
                      <option value="SHORT_ANSWER">Short Answer</option>
                      <option value="LONG_ANSWER">Long Answer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Marks
                    </label>
                    <input
                      type="number"
                      value={question.marks}
                      onChange={(e) => updateQuestion(questionIndex, 'marks', parseInt(e.target.value))}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={question.difficulty || 'medium'}
                      onChange={(e) => updateQuestion(questionIndex, 'difficulty', e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                {question.type === 'MULTIPLE_CHOICE' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Options
                      </label>
                      <button
                        onClick={() => addOption(questionIndex)}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Option
                      </button>
                    </div>
                    <div className="space-y-2">
                      {(question.options || []).map((option: string, optionIndex: number) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            disabled={loading}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {(question.options || []).length > 2 && (
                            <button
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              disabled={loading}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer
                  </label>
                  {question.type === 'MULTIPLE_CHOICE' ? (
                    <select
                      value={question.correctAnswer}
                      onChange={(e) => updateQuestion(questionIndex, 'correctAnswer', e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select correct option</option>
                      {(question.options || []).map((option: string, optionIndex: number) => (
                        <option key={optionIndex} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : question.type === 'TRUE_FALSE' ? (
                    <select
                      value={question.correctAnswer}
                      onChange={(e) => updateQuestion(questionIndex, 'correctAnswer', e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select answer</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <textarea
                      value={question.correctAnswer}
                      onChange={(e) => updateQuestion(questionIndex, 'correctAnswer', e.target.value)}
                      rows={2}
                      placeholder="Enter the correct answer or sample answer"
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}