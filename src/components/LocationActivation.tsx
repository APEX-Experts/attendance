'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LocationActivation() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function activate() {
    setStatus('loading')
    setMessage('')

    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('Geolocation is not supported by your browser.')
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

      const res = await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Activation failed')
      } else {
        setStatus('success')
        setMessage('Location activated! You can now check in and out.')
        setTimeout(() => { router.refresh() }, 1500)
      }
    } catch (err) {
      setStatus('error')
      if (err instanceof GeolocationPositionError) {
        if (err.code === err.PERMISSION_DENIED) {
          setMessage('Location permission denied. Please allow location access in your browser and try again.')
        } else if (err.code === err.TIMEOUT) {
          setMessage('Location request timed out. Please try again.')
        } else {
          setMessage('Unable to get your GPS location. Please try again.')
        }
      } else {
        setMessage('An error occurred. Please try again.')
      }
    }
  }

  return (
    <div className="card border-yellow-200 bg-yellow-50">
      <div className="flex items-start gap-4">
        <div className="text-4xl">📍</div>
        <div className="flex-1">
          <h2 className="font-bold text-slate-800 mb-1">Activate Your Location</h2>
          <p className="text-sm text-slate-600 mb-4">
            You need to activate your GPS location once. This will register your work location
            and will be used to verify all future check-ins. Make sure you are at your work location.
          </p>

          {message && (
            <p className={`text-sm px-3 py-2 rounded-lg mb-3 ${
              status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </p>
          )}

          <button
            onClick={activate}
            disabled={status === 'loading' || status === 'success'}
            className="btn-primary"
          >
            {status === 'loading' ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Getting location...
              </span>
            ) : status === 'success' ? '✓ Activated!' : 'Activate Location Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
