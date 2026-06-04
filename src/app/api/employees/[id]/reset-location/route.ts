import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.employee.update({
    where: { id: params.id },
    data: { refLatitude: null, refLongitude: null, locationSet: false, locationSetAt: null }
  })

  return NextResponse.json({ success: true, message: 'Location reset. Employee must re-activate.' })
}
