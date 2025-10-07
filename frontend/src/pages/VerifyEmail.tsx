import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../services/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current || !token) return
    hasRun.current = true

    api.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])


  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow text-center">
        <div className="mb-2 text-left">
          <Link to="/" className="inline-flex items-center text-blue-600 font-semibold">← Back to home</Link>
        </div>
        {status === 'idle' && <div className="text-gray-600">Verifying…</div>}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold mb-2">Email verified</h1>
            <p className="text-gray-600 mb-6">Your email has been verified successfully.</p>
            <Link to="/login" className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold">Continue to sign in</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold mb-2">Verification failed</h1>
            <p className="text-gray-600 mb-6">The link is invalid or has expired.</p>
            <Link to="/resend-verification" className="inline-block bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold">Resend verification</Link>
          </>
        )}
      </div>
    </div>
  )
}


