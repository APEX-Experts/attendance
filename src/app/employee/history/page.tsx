import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { buildMonthlyReport } from '@/lib/salary'
import { formatInTimeZone } from 'date-fns-tz'
import MonthNavigator from '@/components/MonthNavigator'

interface PageProps {
  searchParams: { year?: string; month?: string }
}

export default async function EmployeeHistoryPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  const employeeId = session!.user.id

  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { name: true, salary: true }
  })
  if (!employee) return <div className="text-red-600">Error</div>

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const attendance = await prisma.attendance.findMany({
    where: { employeeId, date: { gte: start, lte: end }, isValid: true },
    orderBy: { timestamp: 'asc' }
  })

  const settings = await getSettings()
  const today = formatInTimeZone(new Date(), settings.timezone, 'yyyy-MM-dd')

  const report = buildMonthlyReport({
    year, month,
    salary: employee.salary,
    workDays: settings.work_days,
    workStartTime: settings.work_start_time,
    workEndTime: settings.work_end_time,
    lateGraceMinutes: settings.late_grace_minutes,
    workHours: settings.work_hours,
    today,
    timezone: settings.timezone,
    attendance: attendance.map(a => ({
      type: a.type, date: a.date, timestamp: a.timestamp,
      latitude: a.latitude, longitude: a.longitude,
      distance: a.distance, isValid: a.isValid
    }))
  })

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">My Attendance</h1>
            <p className="text-sm text-slate-500">{monthName}</p>
          </div>
          <MonthNavigator year={year} month={month} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-emerald-600">{report.presentDays}</p>
          <p className="text-xs text-slate-500">Present / {report.workDaysInMonth}</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-red-500">{report.absentDays}</p>
          <p className="text-xs text-slate-500">Absent days</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-yellow-500">{report.totalLateMinutes}m</p>
          <p className="text-xs text-slate-500">Late minutes ({report.lateDays} days)</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-orange-500">{report.totalEarlyMinutes}m</p>
          <p className="text-xs text-slate-500">Early-out minutes ({report.earlyDays} days)</p>
        </div>
        <div className="card text-center py-3 col-span-2">
          <p className="text-2xl font-bold text-red-500">-{report.totalDeductions.toFixed(0)}</p>
          <p className="text-xs text-slate-500">Total deductions (EGP)</p>
        </div>
        <div className="card text-center py-3 col-span-2">
          <p className="text-3xl font-bold text-blue-600">{report.netSalary.toFixed(0)}</p>
          <p className="text-xs text-slate-500">Est. net salary (EGP)</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Date</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Status</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">In</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Out</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Late</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Early Out</th>
            </tr>
          </thead>
          <tbody>
            {report.days.map(day => (
              <tr
                key={day.date}
                className={`border-b border-slate-100 ${
                  day.status === 'absent'   ? 'bg-red-50' :
                  day.status === 'off'      ? 'bg-slate-50' :
                  day.status === 'today'    ? 'bg-blue-50' :
                  day.status === 'upcoming' ? 'opacity-40' : ''
                }`}
              >
                <td className="py-2 px-2 text-slate-700 text-xs">{day.date}</td>
                <td className="py-2 px-2">
                  {day.status === 'present'  ? <span className="badge-green text-xs">Present</span> :
                   day.status === 'absent'   ? <span className="badge-red text-xs">Absent</span> :
                   day.status === 'today'    ? <span className="badge-blue text-xs">Today</span> :
                   day.status === 'upcoming' ? <span className="badge-gray text-xs">Upcoming</span> :
                   <span className="badge-gray text-xs">Off</span>}
                </td>
                <td className="py-2 px-2">
                  {day.checkIn ? (
                    <span className={`text-xs ${day.checkIn.isLate ? 'text-yellow-600 font-medium' : 'text-slate-600'}`}>
                      {day.checkIn.time}
                    </span>
                  ) : '—'}
                </td>
                <td className="py-2 px-2 text-xs text-slate-600">{day.checkOut?.time ?? '—'}</td>
                <td className="py-2 px-2">
                  {day.checkIn?.isLate
                    ? <span className="badge-yellow text-xs">{day.checkIn.lateMinutes}m</span>
                    : day.checkIn ? <span className="text-emerald-600 text-xs">✓</span> : '—'}
                </td>
                <td className="py-2 px-2">
                  {day.checkOut?.isEarly
                    ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{day.checkOut.earlyMinutes}m</span>
                    : day.checkOut ? <span className="text-emerald-600 text-xs">✓</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
