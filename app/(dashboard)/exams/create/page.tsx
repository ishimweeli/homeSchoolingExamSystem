'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { 
  Loader2, 
  Sparkles, 
  Plus, 
  Trash2,
  Info
} from 'lucide-react'

const examSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  subject: z.string().min(2, 'Subject is required'),
  gradeLevel: z.number().min(1).max(12),
  topics: z.array(z.string()).min(1, 'At least one topic is required'),
  duration: z.number().min(10).max(180),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionTypes: z.object({
    multipleChoice: z.number().min(0).default(0),
    trueFalse: z.number().min(0).default(0),
    shortAnswer: z.number().min(0).default(0),
    longAnswer: z.number().min(0).default(0),
    fillBlanks: z.number().min(0).default(0),
    mathProblem: z.number().min(0).default(0),
  }),
})

type ExamForm = z.infer<typeof examSchema>

const subjects = [
  'Mathematics',
  'Science',
  'English',
  'History',
  'Geography',
  'Computer Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Literature',
]

export default function CreateExamPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentTopic, setCurrentTopic] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      gradeLevel: 7,
      duration: 60,
      difficulty: 'medium',
      topics: [],
      questionTypes: {
        multipleChoice: 5,
        trueFalse: 5,
        shortAnswer: 5,
        longAnswer: 2,
        fillBlanks: 3,
        mathProblem: 0,
      },
    },
  })

  const topics = watch('topics') || []
  const questionTypes = watch('questionTypes')

  const totalQuestions = Object.values(questionTypes || {}).reduce(
    (sum, count) => sum + count,
    0
  )

  const addTopic = () => {
    if (currentTopic.trim()) {
      setValue('topics', [...topics, currentTopic.trim()])
      setCurrentTopic('')
    }
  }

  const removeTopic = (index: number) => {
    setValue(
      'topics',
      topics.filter((_, i) => i !== index)
    )
  }

  const onSubmit = async (data: ExamForm) => {
    setIsGenerating(true)

    try {
      const response = await fetch('/api/exams/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          numberOfQuestions: totalQuestions,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate exam')
      }

      const result = await response.json()
      toast.success('Exam generated successfully!')
      router.push(`/exams/${result.id}`)
    } catch (error) {
      toast.error('Failed to generate exam. Please try again.')
      console.error(error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold">AI Exam Generator</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Let AI create a comprehensive exam based on your requirements
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Exam Title
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Mid-term Mathematics Exam"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Subject
              </label>
              <select
                {...register('subject')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
              {errors.subject && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Grade Level
              </label>
              <input
                {...register('gradeLevel', { valueAsNumber: true })}
                type="number"
                min="1"
                max="12"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.gradeLevel && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.gradeLevel.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Duration (minutes)
              </label>
              <input
                {...register('duration', { valueAsNumber: true })}
                type="number"
                min="10"
                max="180"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.duration && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.duration.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Difficulty Level
              </label>
              <select
                {...register('difficulty')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Topics */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Topics to Cover
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentTopic}
                onChange={(e) => setCurrentTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a topic and press Enter"
              />
              <button
                type="button"
                onClick={addTopic}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(index)}
                    className="hover:text-blue-900"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {errors.topics && (
              <p className="text-red-500 text-sm mt-1">
                {errors.topics.message}
              </p>
            )}
          </div>

          {/* Result Publishing Settings */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="autoPublish"
                className="mt-1"
                defaultChecked={true}
              />
              <div className="flex-1">
                <label htmlFor="autoPublish" className="font-medium text-gray-900 cursor-pointer">
                  Auto-publish results to students
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  When enabled, students will see their results immediately after submission. 
                  When disabled, you'll need to manually review and publish results.
                </p>
              </div>
            </div>
          </div>

          {/* Question Types */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Question Distribution
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <QuestionTypeInput
                label="Multiple Choice"
                register={register}
                name="questionTypes.multipleChoice"
              />
              <QuestionTypeInput
                label="True/False"
                register={register}
                name="questionTypes.trueFalse"
              />
              <QuestionTypeInput
                label="Short Answer"
                register={register}
                name="questionTypes.shortAnswer"
              />
              <QuestionTypeInput
                label="Long Answer/Essay"
                register={register}
                name="questionTypes.longAnswer"
              />
              <QuestionTypeInput
                label="Fill in the Blanks"
                register={register}
                name="questionTypes.fillBlanks"
              />
              <QuestionTypeInput
                label="Math Problems"
                register={register}
                name="questionTypes.mathProblem"
              />
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              <span className="text-sm">
                Total Questions: <strong>{totalQuestions}</strong>
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Exam...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Generate Exam
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuestionTypeInput({
  label,
  register,
  name,
}: {
  label: string
  register: any
  name: string
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <label className="text-sm font-medium">{label}</label>
      <input
        {...register(name, { valueAsNumber: true })}
        type="number"
        min="0"
        max="20"
        className="w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}