import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import EmployeeNav from '@/components/EmployeeNav'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'employee') redirect('/login')

  return (
    <div className="min-h-screen bg-slate-100">
      <EmployeeNav name={session.user.name ?? 'Employee'} />
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
