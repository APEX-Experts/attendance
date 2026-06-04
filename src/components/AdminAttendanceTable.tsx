'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DayRecord } from '@/lib/salary'

interface RawRecord {
  id: string
  type: 'CHECK_IN' | 'CHECK_OUT'
  date: string
  time: string // HH:mm in company tz
}

interface Props {
  employeeId: string
  days: DayRecord[]
  rawRecords: RawRecord[]
  workStartTime: string // HH:mm from settings
  workEndTime: string   // HH:mm from settings
}

type EditingState = { recordId: string; time: string } | null
type AddingState = { date: string; type: 'CHECK_IN' | 'CHECK_OUT'; time: string } | null

export default function AdminAttendanceTable({ employeeId, days, rawRecords, workStartTime, workEndTime }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<EditingState>(null)
  const [adding, setAdding] = useState<AddingState>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const recordsByDate = new Map<string, { ci?: RawRecord; co?: RawRecord }>()
  for (const r of rawRecords) {
    const entry = recordsByDate.get(r.date) ?? {}
    if (r.type === 'CHECK_IN') entry.ci = r
    else entry.co = r
    recordsByDate.set(r.date, entry)
  }

  async function saveEdit() {
    if (!editing) return
    setBusy(true)
    setError('')
    const res = await fetch(`/api/admin/attendance/${editing.recordId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time: editing.time })
    })
    setBusy(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    setEditing(null)
    router.refresh()
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this attendance record?')) return
    setBusy(true)
    setError('')
    const res = await fetch(`/api/admin/attendance/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    router.refresh()
  }

  async function saveAdd() {
    if (!adding) return
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, date: adding.date, type: adding.type, time: adding.time })
    })
    setBusy(false)
    if (!res.ok) { const d = await res.json(); setError(d.error); return }
    setAdding(null)
    router.refresh()
  }

  const canEdit = (status: DayRecord['status']) => status !== 'upcoming' && status !== 'off'

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Date</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Status</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Check In</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Check Out</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Late</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Early Out</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Coords</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Match</th>
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const recs = recordsByDate.get(day.date)
              const editableDay = canEdit(day.status)

              return (
                <tr
                  key={day.date}
                  className={`border-b border-slate-100 ${
                    day.status === 'absent'   ? 'bg-red-50' :
                    day.status === 'off'      ? 'bg-slate-50' :
                    day.status === 'today'    ? 'bg-blue-50' :
                    day.status === 'upcoming' ? 'opacity-40' : ''
                  }`}
                >
                  {/* Date */}
                  <td className="py-2 px-2 font-medium text-slate-700 whitespace-nowrap">{day.date}</td>

                  {/* Status */}
                  <td className="py-2 px-2">
                    {day.status === 'present'  ? <span className="badge-green">Present</span> :
                     day.status === 'absent'   ? <span className="badge-red">Absent</span> :
                     day.status === 'today'    ? <span className="badge-blue">Today</span> :
                     day.status === 'upcoming' ? <span className="badge-gray">Upcoming</span> :
                     <span className="badge-gray">Off</span>}
                  </td>

                  {/* Check In */}
                  <td className="py-2 px-2">
                    {recs?.ci ? (
                      editing?.recordId === recs.ci.id ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="time"
                            value={editing.time}
                            onChange={e => setEditing(s => s ? { ...s, time: e.target.value } : s)}
                            className="border border-blue-300 rounded px-1 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button onClick={saveEdit} disabled={busy} className="text-emerald-600 hover:text-emerald-800 font-bold px-1">✓</button>
                          <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className={day.checkIn?.isLate ? 'text-yellow-600 font-medium' : 'text-slate-700'}>
                            {recs.ci.time}
                          </span>
                          {editableDay && (
                            <>
                              <button
                                onClick={() => setEditing({ recordId: recs.ci!.id, time: recs.ci!.time })}
                                className="text-blue-400 hover:text-blue-700 text-xs"
                                title="Edit check-in time"
                              >✎</button>
                              <button
                                onClick={() => deleteRecord(recs.ci!.id)}
                                className="text-red-300 hover:text-red-600 text-xs"
                                title="Delete check-in"
                              >✕</button>
                            </>
                          )}
                        </span>
                      )
                    ) : editableDay ? (
                      adding?.date === day.date && adding?.type === 'CHECK_IN' ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="time"
                            value={adding.time}
                            onChange={e => setAdding(s => s ? { ...s, time: e.target.value } : s)}
                            className="border border-emerald-300 rounded px-1 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            autoFocus
                          />
                          <button onClick={saveAdd} disabled={busy} className="text-emerald-600 hover:text-emerald-800 font-bold px-1">✓</button>
                          <button onClick={() => setAdding(null)} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setAdding({ date: day.date, type: 'CHECK_IN', time: workStartTime }); setEditing(null) }}
                          className="text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 hover:bg-emerald-50"
                        >
                          + Add
                        </button>
                      )
                    ) : '—'}
                  </td>

                  {/* Check Out */}
                  <td className="py-2 px-2">
                    {recs?.co ? (
                      editing?.recordId === recs.co.id ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="time"
                            value={editing.time}
                            onChange={e => setEditing(s => s ? { ...s, time: e.target.value } : s)}
                            className="border border-blue-300 rounded px-1 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button onClick={saveEdit} disabled={busy} className="text-emerald-600 hover:text-emerald-800 font-bold px-1">✓</button>
                          <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <span className="text-slate-700">{recs.co.time}</span>
                          {editableDay && (
                            <>
                              <button
                                onClick={() => setEditing({ recordId: recs.co!.id, time: recs.co!.time })}
                                className="text-blue-400 hover:text-blue-700 text-xs"
                                title="Edit check-out time"
                              >✎</button>
                              <button
                                onClick={() => deleteRecord(recs.co!.id)}
                                className="text-red-300 hover:text-red-600 text-xs"
                                title="Delete check-out"
                              >✕</button>
                            </>
                          )}
                        </span>
                      )
                    ) : recs?.ci && editableDay ? (
                      adding?.date === day.date && adding?.type === 'CHECK_OUT' ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="time"
                            value={adding.time}
                            onChange={e => setAdding(s => s ? { ...s, time: e.target.value } : s)}
                            className="border border-blue-300 rounded px-1 py-0.5 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button onClick={saveAdd} disabled={busy} className="text-emerald-600 hover:text-emerald-800 font-bold px-1">✓</button>
                          <button onClick={() => setAdding(null)} className="text-slate-400 hover:text-slate-600 px-1">✕</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setAdding({ date: day.date, type: 'CHECK_OUT', time: workEndTime }); setEditing(null) }}
                          className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-1.5 py-0.5 hover:bg-blue-50"
                        >
                          + Add
                        </button>
                      )
                    ) : '—'}
                  </td>

                  {/* Late */}
                  <td className="py-2 px-2">
                    {day.checkIn?.isLate
                      ? <span className="badge-yellow">{day.checkIn.lateMinutes}m</span>
                      : day.checkIn
                        ? <span className="text-emerald-600 text-xs">On time</span>
                        : '—'}
                  </td>

                  {/* Early Out */}
                  <td className="py-2 px-2">
                    {day.checkOut?.isEarly
                      ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{day.checkOut.earlyMinutes}m</span>
                      : day.checkOut
                        ? <span className="text-emerald-600 text-xs">Full day</span>
                        : '—'}
                  </td>

                  {/* Coords */}
                  <td className="py-2 px-2 font-mono text-xs text-slate-400">
                    {day.checkIn && day.checkIn.lat !== 0
                      ? `${day.checkIn.lat.toFixed(5)}, ${day.checkIn.lon.toFixed(5)}`
                      : day.checkIn ? <span className="text-slate-300">admin</span> : '—'}
                  </td>

                  {/* Match */}
                  <td className="py-2 px-2">
                    {day.checkIn ? (
                      day.checkIn.lat === 0
                        ? <span className="badge-blue">Admin</span>
                        : day.checkIn.valid
                          ? <span className="badge-green">{day.checkIn.dist}m ✓</span>
                          : <span className="badge-red">{day.checkIn.dist}m ✗</span>
                    ) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
