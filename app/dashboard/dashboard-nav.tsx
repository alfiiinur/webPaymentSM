'use client'

import { useRouter } from 'next/navigation'

export default function DashboardNav({ email }: { email: string }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user' }),
    })
    router.push('/dashboard/login')
    router.refresh()
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold">Hongjoo Store</span>
          <span className="text-muted-foreground text-sm hidden sm:inline">Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-[200px]">{email}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
