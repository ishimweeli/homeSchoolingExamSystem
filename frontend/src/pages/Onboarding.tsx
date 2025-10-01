import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({
    goal: 'EXAMS',
    children: 1,
    subjects: ['Math', 'English'],
  })

  const next = () => setStep((s) => Math.min(3, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))

  const finish = () => {
    // In a real app, save onboarding preferences via API
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6">
          <Link to="/" className="text-blue-600">← Back to home</Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {[1,2,3].map((i) => (
                <div key={i} className={`flex-1 h-2 rounded-full mx-1 ${i <= step ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'}`}></div>
              ))}
            </div>
            <div className="text-center mt-4 text-sm text-gray-500">Step {step} of 3</div>
          </div>

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">What will you use ExamAI for?</h2>
              <p className="text-gray-600 mb-6">We will personalize your experience.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'EXAMS', title: 'Exams' },
                  { key: 'STUDY', title: 'Study Modules' },
                  { key: 'BOTH', title: 'Both' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setData({ ...data, goal: opt.key as any })}
                    className={`rounded-xl border p-6 text-left hover:shadow-md transition ${data.goal === opt.key ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                  >
                    <div className="text-lg font-semibold">{opt.title}</div>
                    <div className="text-sm text-gray-500 mt-2">Tailored features and guidance</div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={next} className="bg-gray-900 text-white px-6 py-3 rounded-xl">Continue</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">How many students?</h2>
              <p className="text-gray-600 mb-6">You can change this later.</p>
              <div className="flex items-center space-x-4">
                <button onClick={() => setData({ ...data, children: Math.max(1, data.children - 1) })} className="w-10 h-10 rounded-full bg-gray-100">-</button>
                <div className="text-3xl font-bold w-16 text-center">{data.children}</div>
                <button onClick={() => setData({ ...data, children: data.children + 1 })} className="w-10 h-10 rounded-full bg-gray-100">+</button>
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={prev} className="px-6 py-3 rounded-xl border">Back</button>
                <button onClick={next} className="bg-gray-900 text-white px-6 py-3 rounded-xl">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-2">Pick initial subjects</h2>
              <p className="text-gray-600 mb-6">This helps us generate suited content.</p>
              <div className="flex flex-wrap gap-2">
                {['Math','English','Science','History','Geography','Coding'].map((s) => {
                  const selected = data.subjects.includes(s)
                  return (
                    <button
                      key={s}
                      onClick={() => setData({
                        ...data,
                        subjects: selected ? data.subjects.filter(x => x !== s) : [...data.subjects, s]
                      })}
                      className={`px-4 py-2 rounded-full border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300'}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={prev} className="px-6 py-3 rounded-xl border">Back</button>
                <button onClick={finish} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl">Finish</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


