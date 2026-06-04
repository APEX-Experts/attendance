import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'

const BulkSchema = z.object({
  type: z.enum(['CHECK_IN', 'CHECK_OUT']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional()
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = BulkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { type, date } = parsed.data
  const settings = await getSettings()
  const time = parsed.data.time ?? formatInTimeZone(new Date(), settings.timezone, 'HH:mm')
  const timestamp = fromZonedTime(`${date}T${time}:00`, settings.timezone)

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: { id: true, refLatitude: true, refLongitude: true }
  })

  // For CHECK_OUT: only employees who already checked in on that date
  let targets = employees
  if (type === 'CHECK_OUT') {
    const checkedInIds = new Set(
      (await prisma.attendance.findMany({
        where: { date, type: 'CHECK_IN' },
        select: { employeeId: true }
      })).map(r => r.employeeId)
    )
    targets = employees.filter(e => checkedInIds.has(e.id))
  }

  // Skip employees who already have the record type for that date
  const existingIds = new Set(
    (await prisma.attendance.findMany({
      where: { date, type, employeeId: { in: targets.map(e => e.id) } },
      select: { employeeId: true }
    })).map(r => r.employeeId)
  )

  const toCreate = targets.filter(e => !existingIds.has(e.id))

  if (toCreate.length === 0) {
    return NextResponse.json({
      created: 0,
      skipped: existingIds.size,
      message: `All employees already have ${type === 'CHECK_IN' ? 'check-in' : 'check-out'} for ${date}.`
    })
  }

  await prisma.attendance.createMany({
    data: toCreate.map(e => ({
      employeeId: e.id,
      type,
      date,
      timestamp,
      latitude: e.refLatitude ?? 0,
      longitude: e.refLongitude ?? 0,
      distance: 0,
      isValid: true,
      ipAddress: 'admin-bulk',
      userAgent: `admin-bulk:${session.user.id}`
    }))
  })

  return NextResponse.json({
    created: toCreate.length,
    skipped: existingIds.size,
    date,
    time,
    message: `${type === 'CHECK_IN' ? 'Checked in' : 'Checked out'} ${toCreate.length} employee(s) on ${date}${existingIds.size > 0 ? `, skipped ${existingIds.size} already recorded` : ''}.`
  })
}
