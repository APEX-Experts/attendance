'use client'

import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'

interface Props {
  year: number
  month: number
  employeeId?: string
}

export default function MonthNavigator({ year, month, employeeId }: Props) {
  const router = useRouter()
  const path = usePathname()

  function go(y: number, m: number) {
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`${path}?year=${y}&month=${m}`)
  }

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => go(year, month - 1)} className="btn-secondary px-3 py-1.5 text-sm">←</button>
      <span className="font-medium text-slate-700 min-w-[120px] text-center">{monthName} {year}</span>
      <button onClick={() => go(year, month + 1)} className="btn-secondary px-3 py-1.5 text-sm">→</button>
    </div>
  )
}
