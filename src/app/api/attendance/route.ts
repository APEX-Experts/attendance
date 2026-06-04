import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { haversineDistance, isValidCoordinates } from '@/lib/location'
import { getSettings } from '@/lib/settings'
import { formatInTimeZone } from 'date-fns-tz'
import { z } from 'zod'

const AttendanceSchema = z.object({
  type: z.enum(['CHECK_IN', 'CHECK_OUT']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional()
})

const rateLimitMap = new Map<string, number[]>()

function checkRateLimit(employeeId: string): boolean {
  const now = Date.now()
  const window = 60_000
  const maxAttempts = 10
  const attempts = (rateLimitMap.get(employeeId) ?? []).filter(t => now - t < window)
  attempts.push(now)
  rateLimitMap.set(employeeId, attempts)
  return attempts.length <= maxAttempts
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const employeeId = session.user.id

  if (!checkRateLimit(employeeId)) {
    return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 })
  }

  const body = await req.json()
  const parsed = AttendanceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
  }

  const { type, latitude, longitude } = parsed.data

  if (!isValidCoordinates(latitude, longitude)) {
    return NextResponse.json({ error: 'Invalid GPS coordinates' }, { status: 400 })
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
  if (!employee || !employee.isActive) {
    return NextResponse.json({ error: 'Account not found or inactive' }, { status: 403 })
  }

  if (!employee.locationSet || employee.refLatitude === null || employee.refLongitude === null) {
    return NextResponse.json({ error: 'Please activate your location first' }, { status: 403 })
  }

  const settings = await getSettings()
  const distance = haversineDistance(employee.refLatitude, employee.refLongitude, latitude, longitude)
  const isValid = distance <= settings.allowed_radius_meters

  if (!isValid) {
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
    await prisma.attendance.create({
      data: {
        employeeId, type, latitude, longitude,
        distance: Math.round(distance),
        isValid: false, ipAddress: ip,
        userAgent: req.headers.get('user-agent') ?? '',
        date: formatInTimeZone(new Date(), settings.timezone, 'yyyy-MM-dd')
      }
    }).catch(() => {})

    return NextResponse.json({
      error: `Location out of range. You are ${Math.round(distance)}m away (max ${settings.allowed_radius_meters}m).`,
      distance: Math.round(distance),
      allowed: settings.allowed_radius_meters
    }, { status: 403 })
  }

  const today = formatInTimeZone(new Date(), settings.timezone, 'yyyy-MM-dd')

  const existing = await prisma.attendance.findMany({
    where: { employeeId, date: today }
  })

  if (type === 'CHECK_IN') {
    const alreadyIn = existing.find(r => r.type === 'CHECK_IN')
    if (alreadyIn) {
      return NextResponse.json({ error: 'Already checked in today' }, { status: 409 })
    }
  }

  if (type === 'CHECK_OUT') {
    const hasIn = existing.find(r => r.type === 'CHECK_IN')
    if (!hasIn) {
      return NextResponse.json({ error: 'Must check in before checking out' }, { status: 409 })
    }
    const alreadyOut = existing.find(r => r.type === 'CHECK_OUT')
    if (alreadyOut) {
      return NextResponse.json({ error: 'Already checked out today' }, { status: 409 })
    }
  }

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'

  const record = await prisma.attendance.create({
    data: {
      employeeId, type, latitude, longitude,
      distance: Math.round(distance),
      isValid: true,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') ?? '',
      date: today
    }
  })

  return NextResponse.json({
    success: true,
    message: `${type === 'CHECK_IN' ? 'Checked in' : 'Checked out'} successfully`,
    time: formatInTimeZone(record.timestamp, settings.timezone, 'HH:mm'),
    distance: Math.round(distance)
  })
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getSettings()
  const today = formatInTimeZone(new Date(), settings.timezone, 'yyyy-MM-dd')

  const records = await prisma.attendance.findMany({
    where: { employeeId: session.user.id, date: today },
    orderBy: { timestamp: 'asc' }
  })

  return NextResponse.json({
    date: today,
    checkIn: records.find(r => r.type === 'CHECK_IN') ?? null,
    checkOut: records.find(r => r.type === 'CHECK_OUT') ?? null
  })
}
