'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { notFound } from 'next/navigation'
import { CheckCircle, Circle, Clock, FileText, User, Edit3, Send, Users } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface PageProps {
  params: {
    id: string
  }
}

export default function ExamDetailPage({ params }: PageProps) {
  const { data: session, status } = useSession()
  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      notFound()
      return
    }

    const fetchExam = async () => {
      try {
        const response = await fetch(`/api/exams/${params.id}`)
        if (response.ok) {
          const examData = await response.json()
          setExam(examData)
        } else if (response.status === 404) {
          notFound()
        }
      } catch (error) {
        console.error('Error fetching exam:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExam()
  }, [params.id, session, status])

  // Do not block; render skeletons below when loading. Only 404 after load.
  if (!loading && (!session || !exam)) {
    return notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{loading ? 'Loading…' : exam?.title}</h1>
            {loading ? (
              <p className="mt-2 text-gray-400">Fetching exam details…</p>
            ) : (
              exam?.description && (
                <p className="mt-2 text-gray-600">{exam?.description}</p>
              )
            )}
          </div>
          {!loading && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              exam?.status === 'PUBLISHED' 
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {exam?.status}
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Subject:</span>
            <span className="font-medium">{loading ? '—' : exam?.subject}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">{loading ? '—' : `${exam?.duration} minutes`}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Total Marks:</span>
            <span className="font-medium">{loading ? '—' : exam?.totalMarks}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Created by:</span>
            <span className="font-medium">{loading ? '—' : exam?.creator?.name}</span>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Questions {loading ? '' : `(${exam?.questions?.length || 0})`}</h2>
        
        <div className="space-y-6">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="border-b last:border-0 pb-6 last:pb-0">
                <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse mb-3"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((__, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            ))
          ) : (
          (exam?.questions || []).map((question: any, index: number) => (
            <div key={question.id} className="border-b last:border-0 pb-6 last:pb-0">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-900 font-medium mb-3">{question.question}</p>
                  
                  {question.type === 'MULTIPLE_CHOICE' && question.options && (
                    <div className="space-y-2">
                      {(question.options as any[]).map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className="flex items-center gap-2 p-3 rounded-lg bg-gray-50"
                        >
                          <Circle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{option}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="font-medium text-green-900">Correct Answer:</span>
                    </div>
                    <p className="mt-1 text-green-800">
                      {typeof question.correctAnswer === 'string' 
                        ? question.correctAnswer 
                        : JSON.stringify(question.correctAnswer)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                    <span>Type: {question.type}</span>
                    <span>Points: {question.marks}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Created: {new Date(exam?.createdAt).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              Last updated: {new Date(exam?.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            {!loading && exam?.creatorId === session?.user?.id && (
              <>
                {exam?.status === 'DRAFT' && (
                  <PublishExamButton examId={exam.id} />
                )}
                {/* Allow assigning both DRAFT and ACTIVE exams for now */}
                <AssignExamButton examId={exam?.id} />
                <Link
                  href={`/exams/${exam?.id}/edit`}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Exam
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PublishExamButton({ examId }: { examId: string }) {
  const [publishing, setPublishing] = useState(false)

  const handlePublish = async () => {
    setPublishing(true)
    const publishPromise = fetch(`/api/exams/${examId}/publish`, {
      method: 'POST',
    })

    toast.promise(
      publishPromise,
      {
        loading: 'Publishing exam...',
        success: (response) => {
          if (response.ok) {
            setTimeout(() => window.location.reload(), 1000)
            return 'Exam published successfully!'
          }
          throw new Error('Failed to publish')
        },
        error: (err) => {
          setPublishing(false)
          return 'Failed to publish exam'
        },
      }
    )
  }

  return (
    <button
      onClick={handlePublish}
      disabled={publishing}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Send className={`h-4 w-4 ${publishing ? 'animate-pulse' : ''}`} />
      {publishing ? 'Publishing...' : 'Publish Exam'}
    </button>
  )
}

function AssignExamButton({ examId }: { examId: string }) {
  return (
    <Link
      href={`/exams/${examId}/assign`}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      <Users className="h-4 w-4" />
      Assign to Students
    </Link>
  )
}