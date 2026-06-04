import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'

const CreateSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['CHECK_IN', 'CHECK_OUT']),
  time: z.string().regex(/^\d{2}:\d{2}$/)
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { employeeId, date, type, time } = parsed.data

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date_type: { employeeId, date, type } }
  })
  if (existing?.isValid) return NextResponse.json({ error: `${type === 'CHECK_IN' ? 'Check-in' : 'Check-out'} already exists for this day` }, { status: 409 })

  if (type === 'CHECK_OUT') {
    const hasIn = await prisma.attendance.findFirst({
      where: { employeeId, date, type: 'CHECK_IN', isValid: true }
    })
    if (!hasIn) return NextResponse.json({ error: 'Cannot add check-out without a check-in' }, { status: 400 })
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const settings = await getSettings()
  const timestamp = fromZonedTime(`${date}T${time}:00`, settings.timezone)

  const data = {
    employeeId,
    type,
    date,
    timestamp,
    latitude: employee.refLatitude ?? 0,
    longitude: employee.refLongitude ?? 0,
    distance: 0,
    isValid: true,
    ipAddress: 'admin-override',
    userAgent: `admin:${session.user.id}`
  }

  const record = existing
    ? await prisma.attendance.update({ where: { id: existing.id }, data })
    : await prisma.attendance.create({ data })

  return NextResponse.json(record, { status: 201 })
}
