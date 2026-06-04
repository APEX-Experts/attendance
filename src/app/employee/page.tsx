import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/lib/settings'
import { formatInTimeZone } from 'date-fns-tz'
import AttendanceWidget from '@/components/AttendanceWidget'
import LocationActivation from '@/components/LocationActivation'

export default async function EmployeeDashboard() {
  const session = await getServerSession(authOptions)
  const employeeId = session!.user.id

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      name: true, employeeCode: true, salary: true,
      locationSet: true, refLatitude: true, refLongitude: true
    }
  })

  if (!employee) return <div className="text-red-600">Employee not found</div>

  const settings = await getSettings()
  const today = formatInTimeZone(new Date(), settings.timezone, 'yyyy-MM-dd')

  const todayRecords = await prisma.attendance.findMany({
    where: { employeeId, date: today },
    orderBy: { timestamp: 'asc' }
  })

  const checkIn = todayRecords.find(r => r.type === 'CHECK_IN')
  const checkOut = todayRecords.find(r => r.type === 'CHECK_OUT')

  const now = new Date()
  const thisMonth = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: {
        gte: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        lte: today
      },
      type: 'CHECK_IN',
      isValid: true
    }
  })

  return (
    <div className="space-y-4">
      <div className="card text-center py-8">
        <p className="text-slate-500 text-sm">{today}</p>
        <h1 className="text-2xl font-bold text-slate-800 mt-1">Welcome, {employee.name}</h1>
        <p className="text-sm font-mono text-blue-600 mt-1">{employee.employeeCode}</p>
      </div>

      {!employee.locationSet ? (
        <LocationActivation />
      ) : (
        <AttendanceWidget
          checkIn={checkIn ? {
            time: formatInTimeZone(checkIn.timestamp, settings.timezone, 'HH:mm'),
            distance: checkIn.distance
          } : null}
          checkOut={checkOut ? {
            time: formatInTimeZone(checkOut.timestamp, settings.timezone, 'HH:mm'),
            distance: checkOut.distance
          } : null}
        />
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-blue-600">{thisMonth.length}</p>
          <p className="text-xs text-slate-500 mt-1">Present this month</p>
        </div>
        <div className="card text-center py-4">
          <p className="text-2xl font-bold text-slate-700">{employee.salary.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Monthly Salary (EGP)</p>
        </div>
        <div className="card text-center py-4">
          <p className={`text-2xl font-bold ${employee.locationSet ? 'text-emerald-600' : 'text-yellow-500'}`}>
            {employee.locationSet ? '✓' : '!'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Location {employee.locationSet ? 'Active' : 'Pending'}</p>
        </div>
      </div>
    </div>
  )
}
