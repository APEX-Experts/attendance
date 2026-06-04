'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  checkIn: { time: string; distance: number } | null
  checkOut: { time: string; distance: number } | null
}

export default function AttendanceWidget({ checkIn, checkOut }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState('')

  const canCheckIn = !checkIn
  const canCheckOut = checkIn && !checkOut
  const isDone = checkIn && checkOut

  async function handleAction(type: 'CHECK_IN' | 'CHECK_OUT') {
    setError('')
    setLastResult('')
    setLoading(true)

    if (!navigator.geolocation) {
      setError('Geolocation not supported in your browser.')
      setLoading(false)
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        })
      )

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      })

      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        setError(data.error ?? 'Action failed')
      } else {
        setLastResult(`${data.message} at ${data.time} (${data.distance}m away)`)
        router.refresh()
      }
    } catch (err) {
      setLoading(false)
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied. Enable location access and try again.')
        } else if (err.code === err.TIMEOUT) {
          setError('GPS timeout. Please try again in an open area.')
        } else {
          setError('Unable to get GPS location. Please try again.')
        }
      } else {
        setError('Something went wrong. Please try again.')
      }
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-slate-800 mb-4">Today&apos;s Attendance</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={`rounded-xl p-4 text-center ${checkIn ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
          <p className="text-xs text-slate-500 mb-1">Check In</p>
          <p className={`text-2xl font-bold ${checkIn ? 'text-emerald-600' : 'text-slate-300'}`}>
            {checkIn ? checkIn.time : '--:--'}
          </p>
          {checkIn && <p className="text-xs text-slate-400 mt-1">{checkIn.distance}m away</p>}
        </div>
        <div className={`rounded-xl p-4 text-center ${checkOut ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}>
          <p className="text-xs text-slate-500 mb-1">Check Out</p>
          <p className={`text-2xl font-bold ${checkOut ? 'text-blue-600' : 'text-slate-300'}`}>
            {checkOut ? checkOut.time : '--:--'}
          </p>
          {checkOut && <p className="text-xs text-slate-400 mt-1">{checkOut.distance}m away</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {lastResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-emerald-700">✓ {lastResult}</p>
        </div>
      )}

      {isDone ? (
        <div className="text-center py-4">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-slate-600 font-medium">Work day complete!</p>
          <p className="text-sm text-slate-400">See you tomorrow</p>
        </div>
      ) : canCheckIn ? (
        <button
          onClick={() => handleAction('CHECK_IN')}
          disabled={loading}
          className="btn-success w-full py-4 text-lg font-bold"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Getting location...
            </span>
          ) : '🟢  Check In'}
        </button>
      ) : canCheckOut ? (
        <button
          onClick={() => handleAction('CHECK_OUT')}
          disabled={loading}
          className="btn-primary w-full py-4 text-lg font-bold"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              Getting location...
            </span>
          ) : '🔵  Check Out'}
        </button>
      ) : null}

      <p className="text-xs text-slate-400 text-center mt-3">
        Location is verified server-side. Must be within allowed range.
      </p>
    </div>
  )
}
