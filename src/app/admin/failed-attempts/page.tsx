import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { formatInTimeZone } from 'date-fns-tz'
import Link from 'next/link'

interface PageProps {
  searchParams: { date?: string }
}

type FailedAttemptRow = {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  type: 'CHECK_IN' | 'CHECK_OUT'
  latitude: number
  longitude: number
  distance: number
  allowedDistance: number
  accuracy: number | null
  timestamp: Date
  source: 'failed-log' | 'legacy-attendance'
}

export default async function FailedAttemptsPage({ searchParams }: PageProps) {
  const settings = await getSettings()
  const date = searchParams.date?.trim()
  const dateFilter = date ? { date } : {}

  const [failedAttempts, legacyInvalidAttendance] = await Promise.all([
    prisma.failedAttendanceAttempt.findMany({
      where: dateFilter,
      include: { employee: { select: { id: true, employeeCode: true, name: true } } },
      orderBy: { timestamp: 'desc' }
    }),
    prisma.attendance.findMany({
      where: { ...dateFilter, isValid: false },
      include: { employee: { select: { id: true, employeeCode: true, name: true } } },
      orderBy: { timestamp: 'desc' }
    })
  ])

  const rows: FailedAttemptRow[] = [
    ...failedAttempts.map(attempt => ({
      id: attempt.id,
      employeeId: attempt.employee.id,
      employeeCode: attempt.employee.employeeCode,
      employeeName: attempt.employee.name,
      type: attempt.type,
      latitude: attempt.latitude,
      longitude: attempt.longitude,
      distance: attempt.distance,
      allowedDistance: attempt.allowedDistance,
      accuracy: attempt.accuracy,
      timestamp: attempt.timestamp,
      source: 'failed-log' as const
    })),
    ...legacyInvalidAttendance.map(record => ({
      id: record.id,
      employeeId: record.employee.id,
      employeeCode: record.employee.employeeCode,
      employeeName: record.employee.name,
      type: record.type,
      latitude: record.latitude,
      longitude: record.longitude,
      distance: record.distance,
      allowedDistance: settings.allowed_radius_meters,
      accuracy: null,
      timestamp: record.timestamp,
      source: 'legacy-attendance' as const
    }))
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  const checkInCount = rows.filter(row => row.type === 'CHECK_IN').length
  const checkOutCount = rows.filter(row => row.type === 'CHECK_OUT').length
  const maxDistance = rows.reduce((max, row) => Math.max(max, row.distance), 0)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Failed Attempts</h1>
          <p className="text-slate-500 text-sm mt-1">
            Out-of-range employee check-in and check-out attempts
          </p>
        </div>

        <form className="flex items-end gap-2">
          <div>
            <label htmlFor="date" className="label">Date</label>
            <input id="date" name="date" type="date" defaultValue={date ?? ''} className="input w-44" />
          </div>
          <button type="submit" className="btn-primary h-10">Filter</button>
          {date && (
            <Link href="/admin/failed-attempts" className="btn-secondary h-10 flex items-center">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Attempts" value={rows.length} color="slate" />
        <SummaryCard label="Check In Attempts" value={checkInCount} color="emerald" />
        <SummaryCard label="Check Out Attempts" value={checkOutCount} color="blue" />
        <SummaryCard label="Farthest Distance" value={`${Math.round(maxDistance)}m`} color="red" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold text-slate-800">Attempt Log</h2>
          <span className="text-xs text-slate-400">
            {date ? `Filtered by ${date}` : 'All recorded failed attempts'}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="text-slate-400 text-sm">No failed attempts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Attempted At</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Employee ID</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Employee</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Action</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Attempt Coordinates</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Distance</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Allowed</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Accuracy</th>
                  <th className="text-left py-2 px-2 text-slate-500 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={`${row.source}-${row.id}`} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                      {formatInTimeZone(row.timestamp, settings.timezone, 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {row.employeeId}
                    </td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      <p className="font-medium text-slate-800">{row.employeeName}</p>
                      <p className="font-mono text-xs text-blue-600">{row.employeeCode}</p>
                    </td>
                    <td className="py-2 px-2">
                      <span className={row.type === 'CHECK_IN' ? 'badge-green' : 'badge-blue'}>
                        {row.type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {row.latitude.toFixed(6)}, {row.longitude.toFixed(6)}
                    </td>
                    <td className="py-2 px-2">
                      <span className="badge-red">{Math.round(row.distance)}m</span>
                    </td>
                    <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                      {Math.round(row.allowedDistance)}m
                    </td>
                    <td className="py-2 px-2 text-slate-600 whitespace-nowrap">
                      {row.accuracy === null ? '-' : `${Math.round(row.accuracy)}m`}
                    </td>
                    <td className="py-2 px-2 text-slate-400 whitespace-nowrap">
                      {row.source === 'failed-log' ? 'Failed log' : 'Legacy'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  const borders: Record<string, string> = {
    slate: 'border-l-4 border-l-slate-400',
    emerald: 'border-l-4 border-l-emerald-500',
    blue: 'border-l-4 border-l-blue-500',
    red: 'border-l-4 border-l-red-400'
  }

  return (
    <div className={`card py-3 px-4 ${borders[color]}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  )
}
