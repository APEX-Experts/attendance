'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewEmployeePage() {
  const router = useRouter()
  const [form, setForm] = useState({ employeeCode: '', name: '', email: '', password: '', salary: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, salary: parseFloat(form.salary) })
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to create employee')
    } else {
      router.push('/admin/employees')
      router.refresh()
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/employees" className="text-slate-500 hover:text-slate-700">← Employees</Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800">New Employee</span>
      </div>

      <div className="card">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Add New Employee</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Employee Code</label>
            <input
              className="input"
              value={form.employeeCode}
              onChange={e => setForm(f => ({ ...f, employeeCode: e.target.value.toUpperCase() }))}
              placeholder="EMP001"
              required
            />
          </div>
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ahmed Mohamed"
              required
            />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="ahmed@company.com"
              required
            />
            <p className="text-xs text-slate-400 mt-1">Employee will use this email to sign in.</p>
          </div>
          <div>
            <label className="label">Monthly Salary (EGP)</label>
            <input
              type="number"
              className="input"
              value={form.salary}
              onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
              placeholder="5000"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
            <Link href="/admin/employees" className="btn-secondary flex-1 text-center">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
