import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { buildMonthlyReport } from '@/lib/salary'
import { formatInTimeZone } from 'date-fns-tz'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = session.user.role === 'admin'
  const isOwn = session.user.id === params.id
  if (!isAdmin && !isOwn) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))

  const employee = await prisma.employee.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, employeeCode: true, salary: true }
  })
  if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0)
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

  const attendance = await prisma.attendance.findMany({
    where: { employeeId: params.id, date: { gte: start, lte: end }, isValid: true },
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
      type: a.type,
      date: a.date,
      timestamp: a.timestamp,
      latitude: a.latitude,
      longitude: a.longitude,
      distance: a.distance,
      isValid: a.isValid
    }))
  })

  return NextResponse.json({ employee, report, year, month })
}
