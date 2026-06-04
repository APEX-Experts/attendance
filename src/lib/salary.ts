import { format, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from 'date-fns'
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz'

export interface DayRecord {
  date: string
  checkIn?: {
    time: string
    isLate: boolean
    lateMinutes: number
    lat: number
    lon: number
    dist: number
    valid: boolean
  }
  checkOut?: {
    time: string
    isEarly: boolean
    earlyMinutes: number
    lat: number
    lon: number
    dist: number
    valid: boolean
  }
  status: 'present' | 'absent' | 'off' | 'upcoming' | 'today'
}

export interface MonthlySummary {
  days: DayRecord[]
  workDaysInMonth: number
  presentDays: number
  absentDays: number
  lateDays: number
  totalLateMinutes: number
  earlyDays: number
  totalEarlyMinutes: number
  absentDeduction: number
  lateDeduction: number
  earlyDeduction: number
  totalDeductions: number
  netSalary: number
  grossSalary: number
}

export function buildMonthlyReport(params: {
  year: number
  month: number
  salary: number
  workDays: number[]
  workStartTime: string
  workEndTime: string
  lateGraceMinutes: number
  workHours: number
  today: string
  timezone: string
  attendance: Array<{
    type: 'CHECK_IN' | 'CHECK_OUT'
    date: string
    timestamp: Date
    latitude: number
    longitude: number
    distance: number
    isValid: boolean
  }>
}): MonthlySummary {
  const {
    year, month, salary, workDays,
    workStartTime, workEndTime, lateGraceMinutes, workHours,
    today, timezone, attendance
  } = params

  const dailyRate = salary / 30
  const minuteRate = dailyRate / workHours / 60

  const monthStart = startOfMonth(new Date(year, month - 1, 1))
  const monthEnd = endOfMonth(monthStart)
  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const validAttendance = attendance.filter(rec => rec.isValid)
  const byDate = new Map<string, typeof validAttendance>()
  for (const rec of validAttendance) {
    const list = byDate.get(rec.date) ?? []
    list.push(rec)
    byDate.set(rec.date, list)
  }

  const days: DayRecord[] = []
  let workDaysInMonth = 0
  let presentDays = 0
  let absentDays = 0
  let lateDays = 0
  let totalLateMinutes = 0
  let earlyDays = 0
  let totalEarlyMinutes = 0
  let absentDeduction = 0
  let lateDeduction = 0
  let earlyDeduction = 0

  for (const day of allDays) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dow = getDay(day)
    const isWorkDay = workDays.includes(dow)

    if (dateStr > today) {
      days.push({ date: dateStr, status: isWorkDay ? 'upcoming' : 'off' })
      continue
    }

    if (!isWorkDay) {
      days.push({ date: dateStr, status: 'off' })
      continue
    }

    workDaysInMonth++
    const recs = byDate.get(dateStr) ?? []
    const ciRec = recs.find(r => r.type === 'CHECK_IN')
    const coRec = recs.find(r => r.type === 'CHECK_OUT')

    // Expected times in company timezone converted to UTC for comparison
    const expectedStartUtc = new Date(
      fromZonedTime(`${dateStr}T${workStartTime}:00`, timezone).getTime() +
      lateGraceMinutes * 60_000
    )
    const expectedEndUtc = fromZonedTime(`${dateStr}T${workEndTime}:00`, timezone)

    // ── Today: show attendance, no absent deduction yet ────────────────
    if (dateStr === today) {
      if (!ciRec) {
        days.push({ date: dateStr, status: 'today' })
        continue
      }

      presentDays++
      const ciTime = new Date(ciRec.timestamp)
      const lateMs = ciTime.getTime() - expectedStartUtc.getTime()
      const lateMinutes = lateMs > 0 ? Math.floor(lateMs / 60_000) : 0

      const dayRec: DayRecord = {
        date: dateStr,
        status: 'present',
        checkIn: {
          time: formatInTimeZone(ciTime, timezone, 'HH:mm'),
          isLate: lateMinutes > 0,
          lateMinutes,
          lat: ciRec.latitude,
          lon: ciRec.longitude,
          dist: ciRec.distance,
          valid: ciRec.isValid
        }
      }

      if (coRec) {
        const coTime = new Date(coRec.timestamp)
        const earlyMs = expectedEndUtc.getTime() - coTime.getTime()
        const earlyMinutes = earlyMs > 0 ? Math.floor(earlyMs / 60_000) : 0
        dayRec.checkOut = {
          time: formatInTimeZone(coTime, timezone, 'HH:mm'),
          isEarly: earlyMinutes > 0,
          earlyMinutes,
          lat: coRec.latitude,
          lon: coRec.longitude,
          dist: coRec.distance,
          valid: coRec.isValid
        }
      }

      days.push(dayRec)
      continue
    }

    // ── Past days: full deduction calculation ──────────────────────────
    if (!ciRec) {
      absentDays++
      absentDeduction += dailyRate
      days.push({ date: dateStr, status: 'absent' })
      continue
    }

    presentDays++
    const ciTime = new Date(ciRec.timestamp)

    const rawLateMs = ciTime.getTime() - expectedStartUtc.getTime()
    const lateMinutes = rawLateMs > 0 ? Math.floor(rawLateMs / 60_000) : 0
    if (lateMinutes > 0) {
      lateDays++
      totalLateMinutes += lateMinutes
      lateDeduction += lateMinutes * minuteRate
    }

    let coInfo: DayRecord['checkOut']
    if (coRec) {
      const coTime = new Date(coRec.timestamp)
      const earlyMs = expectedEndUtc.getTime() - coTime.getTime()
      const earlyMinutes = earlyMs > 0 ? Math.floor(earlyMs / 60_000) : 0
      if (earlyMinutes > 0) {
        earlyDays++
        totalEarlyMinutes += earlyMinutes
        earlyDeduction += earlyMinutes * minuteRate
      }
      coInfo = {
        time: formatInTimeZone(coTime, timezone, 'HH:mm'),
        isEarly: earlyMinutes > 0,
        earlyMinutes,
        lat: coRec.latitude,
        lon: coRec.longitude,
        dist: coRec.distance,
        valid: coRec.isValid
      }
    }

    days.push({
      date: dateStr,
      status: 'present',
      checkIn: {
        time: formatInTimeZone(ciTime, timezone, 'HH:mm'),
        isLate: lateMinutes > 0,
        lateMinutes,
        lat: ciRec.latitude,
        lon: ciRec.longitude,
        dist: ciRec.distance,
        valid: ciRec.isValid
      },
      checkOut: coInfo
    })
  }

  const totalDeductions = absentDeduction + lateDeduction + earlyDeduction

  return {
    days,
    workDaysInMonth,
    presentDays,
    absentDays,
    lateDays,
    totalLateMinutes,
    earlyDays,
    totalEarlyMinutes,
    absentDeduction,
    lateDeduction,
    earlyDeduction,
    totalDeductions,
    netSalary: salary - totalDeductions,
    grossSalary: salary
  }
}
