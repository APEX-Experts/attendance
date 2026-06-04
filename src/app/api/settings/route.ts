import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getSettings())
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, string>

  const allowed = [
    'company_name', 'work_start_time', 'work_end_time',
    'late_grace_minutes', 'allowed_radius_meters',
    'work_days', 'work_hours', 'timezone'
  ]

  for (const key of allowed) {
    if (body[key] !== undefined) {
      await prisma.settings.upsert({
        where: { key },
        update: { value: String(body[key]) },
        create: { key, value: String(body[key]) }
      })
    }
  }

  return NextResponse.json({ success: true })
}
