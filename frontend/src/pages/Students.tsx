import { useEffect, useState } from 'react'
import api from '../services/api'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

type Student = { id: string; name: string; username: string}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([])
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const load = async () => {
    try {
      const list = await api.listStudents()
      setStudents(list)
    } catch (error) {
      toast.error('Failed to load students')
      console.error('Failed to load students:', error)
    }
  }

  useEffect(() => { load() }, [])

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.createStudent({ name, username, password, email })
      setName(''); setUsername(''); setPassword(''); setEmail('')
      await load()
      toast.success('Student created successfully!')
    } catch (error) {
      toast.error('Failed to create student')
      console.error('Failed to create student:', error)
    } finally {
      setLoading(false)
    }
  }

  const initiateRemove = (id: string) => {
    const student = students.find(s => s.id === id)
    if (student) {
      setConfirmDelete({ id, name: student.name })
    }
  }

const confirmRemove = async () => {
  if (!confirmDelete) return;

  // Start the delete promise
  const deletePromise = api.deleteStudent(confirmDelete.id).then(() => load());

  // Show toast notifications
  toast.promise(deletePromise, {
    loading: 'Removing student...',
    success: 'Student removed successfully!',
    error: (err) => {
      console.error('Failed to delete student:', err);
      return 'Failed to remove student';
    },
  });

  // Only clear confirmation after delete completes
  deletePromise.finally(() => {
    setConfirmDelete(null);
  });
};

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
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full border rounded-xl px-4 py-3" value={email} onChange={(e)=>setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" className="w-full border rounded-xl px-4 py-3" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <button disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
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
                  <button onClick={()=>initiateRemove(s.id)} className="text-red-600 hover:underline">Remove</button>
                </li>
              ))}
              {students.length === 0 && (
                <li className="py-6 text-gray-500">No students yet.</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2">Remove Student?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}