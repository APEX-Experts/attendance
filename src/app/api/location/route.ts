import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isValidCoordinates } from '@/lib/location'
import { z } from 'zod'

const ActivateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional()
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'employee') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = ActivateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  const { latitude, longitude } = parsed.data

  if (!isValidCoordinates(latitude, longitude)) {
    return NextResponse.json({ error: 'Invalid GPS coordinates' }, { status: 400 })
  }

  const employee = await prisma.employee.findUnique({ where: { id: session.user.id } })
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  if (employee.locationSet) {
    return NextResponse.json({
      error: 'Location already activated. Contact admin to reset.'
    }, { status: 409 })
  }

  await prisma.employee.update({
    where: { id: session.user.id },
    data: {
      refLatitude: latitude,
      refLongitude: longitude,
      locationSet: true,
      locationSetAt: new Date()
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Location activated successfully',
    coordinates: { latitude, longitude }
  })
}
