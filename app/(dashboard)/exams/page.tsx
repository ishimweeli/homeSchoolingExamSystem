'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Eye, Edit3, Send, Users, Clock, FileText, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

interface Exam {
  id: string
  title: string
  description: string
  subject: string
  gradeLevel: number
  duration: number
  totalMarks: number
  status: string
  createdAt: string
  updatedAt: string
  questions: any[]
  creator: {
    name: string
    email: string
  }
}

export default function ExamsListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/login')
      return
    }

    const fetchExams = async () => {
      try {
        const response = await fetch('/api/exams')
        if (response.ok) {
          const data = await response.json()
          setExams(data)
        }
      } catch (error) {
        console.error('Error fetching exams:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExams()
  }, [session, status, router])

  const handlePublish = async (examId: string) => {
    const publishPromise = fetch(`/api/exams/${examId}/publish`, {
      method: 'POST',
    })

    toast.promise(
      publishPromise,
      {
        loading: 'Publishing exam...',
        success: (response) => {
          if (response.ok) {
            // Update the exam status in the list
            setExams(exams.map(exam => 
              exam.id === examId 
                ? { ...exam, status: 'ACTIVE' }
                : exam
            ))
            return 'Exam published successfully!'
          }
          throw new Error('Failed to publish')
        },
        error: 'Failed to publish exam',
      }
    )
  }

  const filteredExams = exams.filter(exam => {
    if (filter === 'ALL') return true
    if (filter === 'DRAFT') return exam.status === 'DRAFT'
    if (filter === 'PUBLISHED') return exam.status === 'ACTIVE'
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Draft
          </span>
        )
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Published
          </span>
        )
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Scheduled
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
          <p className="text-gray-600">Manage and organize your exams</p>
        </div>
        <Link
          href="/exams/create"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create New Exam
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          <div className="flex gap-2">
            {['ALL', 'DRAFT', 'PUBLISHED'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {filterOption === 'ALL' ? 'All Exams' : filterOption === 'PUBLISHED' ? 'Published' : 'Draft'}
              </button>
            ))}
          </div>
          <div className="ml-auto text-sm text-gray-500">
            {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Exams List */}
      {filteredExams.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'ALL' ? 'No exams yet' : `No ${filter.toLowerCase()} exams`}
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === 'ALL' 
              ? 'Get started by creating your first exam'
              : `You don't have any ${filter.toLowerCase()} exams yet`
            }
          </p>
          {filter === 'ALL' && (
            <Link
              href="/exams/create"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Your First Exam
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                    {getStatusBadge(exam.status)}
                  </div>
                  
                  {exam.description && (
                    <p className="text-gray-600 mb-3 line-clamp-2">{exam.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{exam.subject}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{exam.duration} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📝</span>
                      <span>{exam.questions?.length || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>🎯</span>
                      <span>{exam.totalMarks} marks</span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    Created: {new Date(exam.createdAt).toLocaleDateString()}
                    {exam.updatedAt !== exam.createdAt && (
                      <span> • Updated: {new Date(exam.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Link
                    href={`/exams/${exam.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>

                  <Link
                    href={`/exams/${exam.id}/edit`}
                    className="flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md text-sm"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Link>

                  {exam.status === 'DRAFT' && (
                    <button
                      onClick={() => handlePublish(exam.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md text-sm"
                    >
                      <Send className="h-4 w-4" />
                      Publish
                    </button>
                  )}

                  {exam.status === 'ACTIVE' && (
                    <Link
                      href={`/exams/${exam.id}/assign`}
                      className="flex items-center gap-1 px-3 py-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md text-sm"
                    >
                      <Users className="h-4 w-4" />
                      Assign
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}