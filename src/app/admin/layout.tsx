import { requireAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'MOSE Admin',
    template: '%s | MOSE Admin'
  },
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    title: 'MOSE Admin',
    statusBarStyle: 'black'
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { authorized, adminUser } = await requireAdmin()

  if (!authorized) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* Sidebar - Mobile: slide-in, Desktop: always visible */}
      <AdminSidebar adminUser={adminUser!} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <AdminHeader adminUser={adminUser!} />

        {/* Page Content - Mobile optimized padding */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  )
}

