'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Employee {
  id: string
  employeeCode: string
  name: string
  email: string
  salary: number
  isActive: boolean
  locationSet: boolean
  locationSetAt: string | null
  refLatitude: number | null
  refLongitude: number | null
}

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [emp, setEmp] = useState<Employee | null>(null)
  const [form, setForm] = useState({ name: '', email: '', salary: '', password: '', isActive: true })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`/api/employees/${id}`)
      .then(r => r.json())
      .then((data: Employee) => {
        setEmp(data)
        setForm({ name: data.name, email: data.email, salary: String(data.salary), password: '', isActive: data.isActive })
      })
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    const body: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      salary: parseFloat(form.salary),
      isActive: form.isActive
    }
    if (form.password) body.password = form.password

    const res = await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) setError(data.error ?? 'Failed to update')
    else { setSuccess('Updated successfully'); router.refresh() }
  }

  async function handleResetLocation() {
    if (!confirm('Reset this employee\'s location? They will need to re-activate.')) return
    setResetting(true)
    const res = await fetch(`/api/employees/${id}/reset-location`, { method: 'POST' })
    const data = await res.json()
    setResetting(false)
    if (res.ok) { setSuccess('Location reset'); setEmp(e => e ? { ...e, locationSet: false, refLatitude: null, refLongitude: null } : e) }
    else setError(data.error)
  }

  async function handleDelete() {
    if (!confirm('DELETE this employee permanently? All attendance records will be lost.')) return
    setDeleting(true)
    await fetch(`/api/employees/${id}`, { method: 'DELETE' })
    router.push('/admin/employees')
    router.refresh()
  }

  if (!emp) return <div className="text-slate-500">Loading...</div>

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/employees" className="text-slate-500 hover:text-slate-700">← Employees</Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800">{emp.name}</span>
      </div>

      <div className="card mb-4">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Edit Employee</h1>
        <p className="text-slate-500 text-sm mb-6">Code: <span className="font-mono font-medium text-blue-600">{emp.employeeCode}</span></p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
            />
            <p className="text-xs text-slate-400 mt-1">Used to sign in.</p>
          </div>
          <div>
            <label className="label">Monthly Salary (EGP)</label>
            <input type="number" className="input" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} min="0" step="0.01" required />
          </div>
          <div>
            <label className="label">New Password (leave blank to keep)</label>
            <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={6} placeholder="Enter new password to change" />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-slate-700">Active employee</label>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">{success}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="card mb-4">
        <h2 className="font-semibold text-slate-800 mb-3">Location Status</h2>
        {emp.locationSet ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge-green">Activated</span>
              {emp.locationSetAt && <span className="text-slate-500 text-sm">on {new Date(emp.locationSetAt).toLocaleDateString()}</span>}
            </div>
            <p className="text-sm text-slate-500">
              Ref: {emp.refLatitude?.toFixed(6)}, {emp.refLongitude?.toFixed(6)}
            </p>
            <button onClick={handleResetLocation} className="btn-danger text-sm py-1.5" disabled={resetting}>
              {resetting ? 'Resetting...' : 'Reset Location'}
            </button>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Not activated yet. Employee must activate from the work location.</p>
        )}
      </div>

      <div className="card border-red-200">
        <h2 className="font-semibold text-red-700 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-500 mb-3">This will permanently delete the employee and all attendance records.</p>
        <button onClick={handleDelete} className="btn-danger text-sm" disabled={deleting}>
          {deleting ? 'Deleting...' : 'Delete Employee'}
        </button>
      </div>
    </div>
  )
}
