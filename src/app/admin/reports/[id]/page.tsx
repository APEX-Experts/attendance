import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { buildMonthlyReport } from '@/lib/salary'
import Link from 'next/link'
import MonthNavigator from '@/components/MonthNavigator'
import AdminAttendanceTable from '@/components/AdminAttendanceTable'
import { formatInTimeZone } from 'date-fns-tz'
import type { Attendance } from '@prisma/client'

interface PageProps {
  params: { id: string }
  searchParams: { year?: string; month?: string }
}

export default async function EmployeeReportPage({ params, searchParams }: PageProps) {
  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, employeeCode: true, salary: true }
  })
  if (!employee) return <div className="text-red-600">Employee not found</div>

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const attendance: Attendance[] = await prisma.attendance.findMany({
    where: { employeeId: params.id, date: { gte: start, lte: end } },
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

  const rawRecords = attendance.map(a => ({
    id: a.id,
    type: a.type,
    date: a.date,
    time: formatInTimeZone(a.timestamp, settings.timezone, 'HH:mm')
  }))

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/reports" className="text-slate-500 hover:text-slate-700">← Reports</Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold">{employee.name}</span>
      </div>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{employee.name}</h1>
          <p className="text-sm font-mono text-blue-600">{employee.employeeCode} — {monthName}</p>
          <p className="text-xs text-slate-400 mt-1">
            Work: {settings.work_start_time} → {settings.work_end_time}
            {settings.late_grace_minutes > 0 && ` · ${settings.late_grace_minutes}m grace`}
          </p>
        </div>
        <MonthNavigator year={year} month={month} employeeId={params.id} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card label="Gross Salary"        value={`${report.grossSalary.toLocaleString()} EGP`}              color="slate" />
        <Card label="Present Days"        value={`${report.presentDays} / ${report.workDaysInMonth}`}        color="green" />
        <Card label="Absent Days"         value={String(report.absentDays)}                                  color="red" />
        <Card label="Late Days"           value={`${report.lateDays} (${report.totalLateMinutes}m)`}         color="yellow" />
        <Card label="Early-Out Days"      value={`${report.earlyDays} (${report.totalEarlyMinutes}m)`}       color="orange" />
        <Card label="Absent Deduction"    value={`-${report.absentDeduction.toFixed(2)} EGP`}               color="red" />
        <Card label="Late Deduction"      value={`-${report.lateDeduction.toFixed(2)} EGP`}                 color="yellow" />
        <Card label="Early-Out Deduction" value={`-${report.earlyDeduction.toFixed(2)} EGP`}                color="orange" />
        <Card label="Total Deductions"    value={`-${report.totalDeductions.toFixed(2)} EGP`}               color="red" />
        <Card label="Net Salary"          value={`${report.netSalary.toFixed(2)} EGP`}                      color="green" bold />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Daily Attendance</h2>
          <span className="text-xs text-slate-400">Click ✎ to edit · ✕ to delete · + Add to insert</span>
        </div>
        <AdminAttendanceTable
          employeeId={params.id}
          days={report.days}
          rawRecords={rawRecords}
          workStartTime={settings.work_start_time}
          workEndTime={settings.work_end_time}
        />
      </div>
    </div>
  )
}

function Card({ label, value, color, bold }: { label: string; value: string; color: string; bold?: boolean }) {
  const borders: Record<string, string> = {
    green:  'border-l-4 border-l-emerald-500',
    red:    'border-l-4 border-l-red-400',
    yellow: 'border-l-4 border-l-yellow-400',
    orange: 'border-l-4 border-l-orange-400',
    slate:  'border-l-4 border-l-slate-400'
  }
  return (
    <div className={`card py-3 px-4 ${borders[color]}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-base ${bold ? 'text-xl font-bold text-emerald-700' : 'font-semibold text-slate-800'}`}>{value}</p>
    </div>
  )
}
