import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function EmployeesPage() {
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, employeeCode: true, name: true, email: true, salary: true,
      locationSet: true, isActive: true, createdAt: true,
      refLatitude: true, refLongitude: true
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Employees</h1>
          <p className="text-slate-500 text-sm mt-1">{employees.length} total</p>
        </div>
        <Link href="/admin/employees/new" className="btn-primary">+ Add Employee</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 text-slate-500 font-medium">Code</th>
              <th className="text-left py-3 text-slate-500 font-medium">Name</th>
              <th className="text-left py-3 text-slate-500 font-medium">Email</th>
              <th className="text-left py-3 text-slate-500 font-medium">Salary</th>
              <th className="text-left py-3 text-slate-500 font-medium">Location</th>
              <th className="text-left py-3 text-slate-500 font-medium">Status</th>
              <th className="text-left py-3 text-slate-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 font-mono font-medium text-blue-600">{emp.employeeCode}</td>
                <td className="py-3 font-medium">{emp.name}</td>
                <td className="py-3 text-slate-500">{emp.email}</td>
                <td className="py-3">{emp.salary.toLocaleString()} EGP</td>
                <td className="py-3">
                  {emp.locationSet ? (
                    <span className="badge-green">✓ Activated</span>
                  ) : (
                    <span className="badge-yellow">Pending</span>
                  )}
                </td>
                <td className="py-3">
                  {emp.isActive ? (
                    <span className="badge-green">Active</span>
                  ) : (
                    <span className="badge-red">Inactive</span>
                  )}
                </td>
                <td className="py-3">
                  <Link href={`/admin/employees/${emp.id}`} className="text-blue-600 hover:text-blue-800 mr-3 text-sm font-medium">
                    Edit
                  </Link>
                  <Link href={`/admin/reports/${emp.id}`} className="text-slate-600 hover:text-slate-800 text-sm font-medium">
                    Report
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
