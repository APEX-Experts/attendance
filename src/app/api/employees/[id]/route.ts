import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const UpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  salary: z.number().positive().optional(),
  password: z.string().min(6).optional(),
  isActive: z.boolean().optional()
})

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const emp = await prisma.employee.findUnique({
    where: { id: params.id },
    select: {
      id: true, employeeCode: true, name: true, email: true, salary: true,
      locationSet: true, locationSetAt: true, refLatitude: true,
      refLongitude: true, isActive: true, createdAt: true
    }
  })
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(emp)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const updateData: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email.toLowerCase()
  if (parsed.data.salary !== undefined) updateData.salary = parsed.data.salary
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive
  if (parsed.data.password) updateData.password = await bcrypt.hash(parsed.data.password, 12)

  const emp = await prisma.employee.update({ where: { id: params.id }, data: updateData })
  return NextResponse.json({ success: true, id: emp.id })
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.employee.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
