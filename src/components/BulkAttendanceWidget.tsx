'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  workStartTime: string
  workEndTime: string
  today: string // YYYY-MM-DD passed from server (company timezone)
}

interface Result {
  type: 'CHECK_IN' | 'CHECK_OUT'
  created: number
  skipped: number
  date: string
  time: string
  message: string
}

export default function BulkAttendanceWidget({ workStartTime, workEndTime, today }: Props) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(today)
  const [customCheckIn, setCustomCheckIn] = useState(workStartTime)
  const [customCheckOut, setCustomCheckOut] = useState(workEndTime)
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [loading, setLoading] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  async function handleBulk(type: 'CHECK_IN' | 'CHECK_OUT') {
    const time = useCustomTime
      ? (type === 'CHECK_IN' ? customCheckIn : customCheckOut)
      : undefined

    const displayTime = time ?? 'current server time'
    const isToday = selectedDate === today

    if (!confirm(
      `${type === 'CHECK_IN' ? 'Check IN' : 'Check OUT'} all employees\n` +
      `Date: ${selectedDate}${isToday ? ' (Today)' : ''}\n` +
      `Time: ${displayTime}`
    )) return

    setLoading(type)
    setResult(null)
    setError('')

    const body: Record<string, string> = { type, date: selectedDate }
    if (time) body.time = time

    const res = await fetch('/api/admin/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const data = await res.json()
    setLoading(null)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
    } else {
      setResult({ ...data, type })
      router.refresh()
    }
  }

  const isToday = selectedDate === today

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-800">Bulk Attendance</h2>
          <p className="text-xs text-slate-400 mt-0.5">Apply check-in or check-out to all active employees at once</p>
        </div>
        <span className="text-2xl">⚡</span>
      </div>

      {/* Work schedule info */}
      <div className="flex items-center gap-4 mb-4 px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-500">
        <span>Work schedule:</span>
        <span className="font-mono font-medium text-slate-700">{workStartTime} → {workEndTime}</span>
      </div>

      {/* Date picker */}
      <div className="mb-4">
        <label className="label">Date</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setResult(null) }}
            className="input w-44"
          />
          {isToday
            ? <span className="badge-blue">Today</span>
            : <button onClick={() => setSelectedDate(today)} className="text-xs text-blue-500 hover:text-blue-700 underline">Reset to today</button>
          }
        </div>
      </div>

      {/* Custom time toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none mb-2">
          <input
            type="checkbox"
            checked={useCustomTime}
            onChange={e => setUseCustomTime(e.target.checked)}
            className="rounded"
          />
          Override time
        </label>

        {useCustomTime ? (
          <div className="flex items-center gap-4 pl-5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 w-16">Check-in:</span>
              <input
                type="time"
                value={customCheckIn}
                onChange={e => setCustomCheckIn(e.target.value)}
                className="input w-28 text-sm py-1"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 w-16">Check-out:</span>
              <input
                type="time"
                value={customCheckOut}
                onChange={e => setCustomCheckOut(e.target.value)}
                className="input w-28 text-sm py-1"
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 pl-5">Uses current server time</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleBulk('CHECK_IN')}
          disabled={loading !== null || !selectedDate}
          className="btn-success py-3 text-sm font-semibold"
        >
          {loading === 'CHECK_IN' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </span>
          ) : (
            <span>
              🟢 Check In All
              {useCustomTime && <span className="block text-xs font-normal opacity-80">@ {customCheckIn}</span>}
            </span>
          )}
        </button>

        <button
          onClick={() => handleBulk('CHECK_OUT')}
          disabled={loading !== null || !selectedDate}
          className="btn-primary py-3 text-sm font-semibold"
        >
          {loading === 'CHECK_OUT' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              Processing...
            </span>
          ) : (
            <span>
              🔵 Check Out All
              {useCustomTime && <span className="block text-xs font-normal opacity-80">@ {customCheckOut}</span>}
            </span>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>
      )}

      {result && (
        <div className={`mt-3 px-4 py-3 rounded-lg text-sm ${result.created > 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
          <p className={`font-medium ${result.created > 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
            {result.created > 0 ? '✓ ' : ''}{result.message}
          </p>
          {result.created > 0 && (
            <p className="text-xs text-emerald-600 mt-1">
              {result.date} @ {result.time} — {result.type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} recorded for {result.created} employee(s)
            </p>
          )}
        </div>
      )}
    </div>
  )
}
