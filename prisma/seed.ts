import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('Admin@123!', 12)

  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: adminPassword }
  })

  const defaults: { key: string; value: string }[] = [
    { key: 'company_name', value: 'My Company' },
    { key: 'work_start_time', value: '09:00' },
    { key: 'work_end_time', value: '18:00' },
    { key: 'late_grace_minutes', value: '0' },
    { key: 'allowed_radius_meters', value: '300' },
    { key: 'work_days', value: '0,1,2,3,4' },
    { key: 'work_hours', value: '8' },
    { key: 'timezone', value: 'Africa/Cairo' }
  ]

  for (const s of defaults) {
    await prisma.settings.upsert({
      where: { key: s.key },
      update: {},
      create: s
    })
  }

  console.log('✅ Seeded! Admin: admin / Admin@123!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
