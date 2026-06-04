'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function EmployeeNav({ name }: { name: string }) {
  const path = usePathname()

  return (
    <nav className="bg-slate-800 text-white">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-sm">Attendance</span>
          <Link
            href="/employee"
            className={`text-sm px-3 py-1 rounded-lg ${path === '/employee' ? 'bg-blue-600' : 'text-slate-300 hover:text-white'}`}
          >
            Today
          </Link>
          <Link
            href="/employee/history"
            className={`text-sm px-3 py-1 rounded-lg ${path.startsWith('/employee/history') ? 'bg-blue-600' : 'text-slate-300 hover:text-white'}`}
          >
            History
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-300 text-sm">{name}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-slate-400 hover:text-white text-xs"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
