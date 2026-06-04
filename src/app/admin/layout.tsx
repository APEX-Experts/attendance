import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import AdminSidebar from '@/components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'admin') redirect('/login')

  return (
    <div className="flex min-h-screen">
      <AdminSidebar username={session.user.name ?? 'Admin'} />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  )
}
