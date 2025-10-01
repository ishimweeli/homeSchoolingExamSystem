import { useEffect, useState } from 'react'
import api from '../services/api'
import { Link } from 'react-router-dom'

type Student = { id: string; name: string; username: string }

export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const list = await api.listStudents()
    setStudents(list)
  }

  useEffect(() => { load() }, [])

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.createStudent({ name, username, password })
      setName(''); setUsername(''); setPassword('')
      await load()
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string) => {
    await api.deleteStudent(id)
    await load()
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Link to="/" className="text-blue-600 font-semibold">← Back to home</Link>
        </div>
        <h1 className="text-3xl font-bold mb-6">Students</h1>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">Add student</h2>
            <form onSubmit={addStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full name</label>
                <input className="w-full border rounded-xl px-4 py-3" value={name} onChange={(e)=>setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input className="w-full border rounded-xl px-4 py-3" value={username} onChange={(e)=>setUsername(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" className="w-full border rounded-xl px-4 py-3" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <button disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold">
                {loading ? 'Creating…' : 'Create student'}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-semibold mb-4">Your students</h2>
            <ul className="divide-y">
              {students.map(s => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-gray-500">@{s.username}</div>
                  </div>
                  <button onClick={()=>remove(s.id)} className="text-red-600 hover:underline">Remove</button>
                </li>
              ))}
              {students.length === 0 && (
                <li className="py-6 text-gray-500">No students yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


