import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { fromZonedTime } from 'date-fns-tz'
import { z } from 'zod'

const UpdateSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/)
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid time format (HH:mm)' }, { status: 400 })

  const record = await prisma.attendance.findUnique({ where: { id: params.id } })
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

  const settings = await getSettings()
  const timestamp = fromZonedTime(`${record.date}T${parsed.data.time}:00`, settings.timezone)

  await prisma.attendance.update({
    where: { id: params.id },
    data: { timestamp, userAgent: `admin-edit:${session.user.id}` }
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const record = await prisma.attendance.findUnique({ where: { id: params.id } })
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

  await prisma.attendance.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
