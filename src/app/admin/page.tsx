import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { formatInTimeZone } from 'date-fns-tz'
import BulkAttendanceWidget from '@/components/BulkAttendanceWidget'

export default async function AdminDashboard() {
  const settings = await getSettings()
  const today = formatInTimeZone(new Date(), settings.timezone, 'yyyy-MM-dd')

  const [
    totalEmployees,
    activeEmployees,
    todayAttendance,
    todayFailedAttempts,
    legacyInvalidAttempts
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { isActive: true } }),
    prisma.attendance.findMany({
      where: { date: today, isValid: true },
      include: { employee: { select: { name: true, employeeCode: true } } },
      orderBy: { timestamp: 'desc' }
    }),
    prisma.failedAttendanceAttempt.count({ where: { date: today } }),
    prisma.attendance.count({ where: { date: today, isValid: false } })
  ])

  const checkedInIds = new Set(todayAttendance.filter(a => a.type === 'CHECK_IN').map(a => a.employeeId))
  const checkedOutIds = new Set(todayAttendance.filter(a => a.type === 'CHECK_OUT').map(a => a.employeeId))
  const presentCount = checkedInIds.size

  // getDay: 0=Sun..6=Sat, matching the numbering used in settings.work_days
  const todayDow = Number(formatInTimeZone(new Date(), settings.timezone, 'i')) % 7
  const isWorkDay = settings.work_days.includes(todayDow)
  const absentCount = isWorkDay ? activeEmployees - presentCount : 0

  const invalidAttempts = todayFailedAttempts + legacyInvalidAttempts

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <p className="text-slate-500 -mt-4 mb-6 text-sm">{today}</p>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Employees" value={totalEmployees} color="blue" icon="👥" />
        <StatCard title="Present Today" value={presentCount} color="green" icon="✅" />
        <StatCard title="Absent Today" value={absentCount} color="red" icon="❌" />
        <StatCard title="Invalid Attempts" value={invalidAttempts} color="yellow" icon="⚠️" />
      </div>

      <div className="mb-6">
        <BulkAttendanceWidget
          workStartTime={settings.work_start_time}
          workEndTime={settings.work_end_time}
          today={today}
        />
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Today&apos;s Attendance</h2>
        {todayAttendance.length === 0 ? (
          <p className="text-slate-400 text-sm">No attendance records yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">Employee</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Code</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Action</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Time</th>
                  <th className="text-left py-2 text-slate-500 font-medium">Distance</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map(rec => (
                  <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 font-medium">{rec.employee.name}</td>
                    <td className="py-2 text-slate-500">{rec.employee.employeeCode}</td>
                    <td className="py-2">
                      <span className={rec.type === 'CHECK_IN' ? 'badge-green' : 'badge-blue'}>
                        {rec.type === 'CHECK_IN' ? 'Check In' : 'Check Out'}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">
                      {formatInTimeZone(rec.timestamp, settings.timezone, 'HH:mm')}
                    </td>
                    <td className="py-2 text-slate-600">{rec.distance}m</td>
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

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  }
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <div className={`w-10 h-10 rounded-full ${colors[color]} flex items-center justify-center text-lg`}>
          {value}
        </div>
      </div>
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  )
}
