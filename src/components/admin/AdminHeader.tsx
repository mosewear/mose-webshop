'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AdminHeaderProps {
  adminUser: {
    id: string
    role: string
  }
}

export default function AdminHeader({ adminUser }: AdminHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b-2 border-gray-200 px-6 py-4 flex items-center justify-between">
      {/* Page Title Area */}
      <div>
        <h1 className="text-2xl font-display uppercase tracking-tight">Admin Dashboard</h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* View Site Link */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-black hover:bg-black hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Site
        </a>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  )
}

