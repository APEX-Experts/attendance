'use client'

import { useEffect, useState } from 'react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMEZONES = ['Africa/Cairo', 'UTC', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/London', 'America/New_York']

export default function SettingsPage() {
  const [form, setForm] = useState({
    company_name: '', work_start_time: '', work_end_time: '',
    late_grace_minutes: '', allowed_radius_meters: '',
    work_days: [] as number[], work_hours: '', timezone: ''
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => setForm(f => ({ ...f, ...data, work_days: data.work_days ?? [] })))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setSaved(false)
    setError('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, work_days: form.work_days.join(',') })
    })
    setLoading(false)
    if (res.ok) setSaved(true)
    else setError('Failed to save settings')
  }

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      work_days: f.work_days.includes(day)
        ? f.work_days.filter(d => d !== day)
        : [...f.work_days, day].sort()
    }))
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">System Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">General</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Company Name</label>
              <input className="input" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select className="input" value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
                {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Work Schedule</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Work Start Time</label>
                <input type="time" className="input" value={form.work_start_time} onChange={e => setForm(f => ({ ...f, work_start_time: e.target.value }))} />
              </div>
              <div>
                <label className="label">Work End Time</label>
                <input type="time" className="input" value={form.work_end_time} onChange={e => setForm(f => ({ ...f, work_end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Work Hours Per Day</label>
                <input type="number" className="input" value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))} min="1" max="24" />
              </div>
              <div>
                <label className="label">Late Grace (minutes)</label>
                <input type="number" className="input" value={form.late_grace_minutes} onChange={e => setForm(f => ({ ...f, late_grace_minutes: e.target.value }))} min="0" max="60" />
              </div>
            </div>
            <div>
              <label className="label">Working Days</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DAYS.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.work_days.includes(i)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-800 mb-4">Location</h2>
          <div>
            <label className="label">Allowed Radius (meters)</label>
            <input type="number" className="input" value={form.allowed_radius_meters} onChange={e => setForm(f => ({ ...f, allowed_radius_meters: e.target.value }))} min="50" max="5000" />
            <p className="text-xs text-slate-400 mt-1">Default: 300m. Employees must be within this distance of their registered location.</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Settings saved successfully!</p>}
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  )
}
