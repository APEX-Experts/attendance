'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<'admin' | 'employee'>('employee')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      identifier,
      password,
      role,
      redirect: false
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid credentials. Please try again.')
    } else {
      router.push(role === 'admin' ? '/admin' : '/employee')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Attendance System</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to continue</p>
        </div>

        <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
          {(['employee', 'admin'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                role === r ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r === 'admin' ? 'Admin' : 'Employee'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{role === 'admin' ? 'Username' : 'Email Address'}</label>
            <input
              type={role === 'employee' ? 'email' : 'text'}
              className="input"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder={role === 'admin' ? 'admin' : 'employee@company.com'}
              required
              autoComplete={role === 'employee' ? 'email' : 'username'}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
