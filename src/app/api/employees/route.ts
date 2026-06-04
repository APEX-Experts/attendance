import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const CreateSchema = z.object({
  employeeCode: z.string().min(1).max(20).regex(/^[A-Z0-9-_]+$/i),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  salary: z.number().positive()
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, employeeCode: true, name: true, email: true, salary: true,
      locationSet: true, locationSetAt: true, refLatitude: true,
      refLongitude: true, isActive: true, createdAt: true
    }
  })
  return NextResponse.json(employees)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { employeeCode, name, email, password, salary } = parsed.data
  const normalizedEmail = email.toLowerCase()

  const [codeExists, emailExists] = await Promise.all([
    prisma.employee.findUnique({ where: { employeeCode: employeeCode.toUpperCase() } }),
    prisma.employee.findUnique({ where: { email: normalizedEmail } })
  ])
  if (codeExists) return NextResponse.json({ error: 'Employee code already exists' }, { status: 409 })
  if (emailExists) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)
  const employee = await prisma.employee.create({
    data: { employeeCode: employeeCode.toUpperCase(), name, email: normalizedEmail, password: hashed, salary }
  })

  return NextResponse.json({ id: employee.id, employeeCode: employee.employeeCode, name: employee.name, email: employee.email }, { status: 201 })
}
