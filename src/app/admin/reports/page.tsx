import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ReportsPage() {
  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, employeeCode: true, name: true, salary: true }
  })

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Reports</h1>
      <p className="text-slate-500 text-sm mb-6">Monthly salary & attendance reports</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map(emp => (
          <div key={emp.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-800">{emp.name}</p>
                <p className="text-xs font-mono text-blue-600">{emp.employeeCode}</p>
              </div>
              <span className="text-slate-400 text-sm">{emp.salary.toLocaleString()} EGP</span>
            </div>
            <Link
              href={`/admin/reports/${emp.id}?year=${year}&month=${month}`}
              className="btn-primary w-full text-center block text-sm py-1.5"
            >
              View Report
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
