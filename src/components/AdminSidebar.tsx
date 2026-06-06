'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/employees', label: 'Employees', icon: '👥' },
  { href: '/admin/reports', label: 'Reports', icon: '📋' },
  { href: '/admin/failed-attempts', label: 'Failed Attempts', icon: '!' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' }
]

export default function AdminSidebar({ username }: { username: string }) {
  const path = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">A</div>
          <div>
            <p className="text-white font-semibold text-sm">Attendance</p>
            <p className="text-slate-400 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(item => {
          const active = item.href === '/admin' ? path === '/admin' : path.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {username[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{username}</p>
            <p className="text-slate-400 text-xs">Administrator</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full text-left text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Sign Out →
        </button>
      </div>
    </aside>
  )
}
