import { requireAdmin } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

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
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <AdminSidebar adminUser={adminUser!} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <AdminHeader adminUser={adminUser!} />

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

