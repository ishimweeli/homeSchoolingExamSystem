import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

export default function ResendVerification() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.resendVerification(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow">
        <div className="mb-2">
          <Link to="/" className="inline-flex items-center text-blue-600 font-semibold">← Back to home</Link>
        </div>
        <h1 className="text-2xl font-bold mb-2">Resend verification</h1>
        <p className="text-gray-600 mb-6">We'll send a new verification link to your email.</p>

        {sent ? (
          <div className="rounded-lg bg-green-50 text-green-700 px-4 py-3 text-sm">
            If the email exists, a verification link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold">
              {loading ? 'Sending...' : 'Send link'}
            </button>
          </form>
        )}

        <div className="mt-6 text-sm text-gray-600 text-center">
          <Link to="/login" className="text-blue-600">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}


