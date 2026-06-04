import { prisma } from './prisma'

export interface AppSettings {
  company_name: string
  work_start_time: string
  work_end_time: string
  late_grace_minutes: number
  allowed_radius_meters: number
  work_days: number[]
  work_hours: number
  timezone: string
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.settings.findMany()
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return {
    company_name: map.company_name ?? 'My Company',
    work_start_time: map.work_start_time ?? '09:00',
    work_end_time: map.work_end_time ?? '18:00',
    late_grace_minutes: parseInt(map.late_grace_minutes ?? '0'),
    allowed_radius_meters: parseInt(map.allowed_radius_meters ?? '300'),
    work_days: (map.work_days ?? '0,1,2,3,4').split(',').map(Number),
    work_hours: parseInt(map.work_hours ?? '8'),
    timezone: map.timezone ?? 'Africa/Cairo'
  }
}

export async function updateSetting(key: string, value: string) {
  return prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
}
