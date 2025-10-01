import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { fetchProfile } = useAuthStore()

  useEffect(() => {
    const token = params.get('token')
    const refreshToken = params.get('refreshToken')
    if (token && refreshToken) {
      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)
      fetchProfile().finally(() => navigate('/dashboard'))
    } else {
      navigate('/login')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Signing you in…</div>
    </div>
  )
}


