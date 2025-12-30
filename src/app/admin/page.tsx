import { createAdminClient } from '@/lib/supabase/admin'

export default async function AdminDashboardPage() {
  const { supabase } = await createAdminClient()

  // Fetch quick stats
  const [
    { count: productCount },
    { count: orderCount },
    { count: customerCount },
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-4xl font-display uppercase tracking-tight mb-2">Dashboard</h1>
        <p className="text-gray-600">Welkom terug in het MOSE Admin Panel</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Products */}
        <div className="bg-white p-6 border-2 border-black">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Producten</p>
              <p className="text-4xl font-display text-brand-primary mt-2">{productCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-brand-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white p-6 border-2 border-black">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Orders</p>
              <p className="text-4xl font-display text-brand-primary mt-2">{orderCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-brand-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Customers */}
        <div className="bg-white p-6 border-2 border-black">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Klanten</p>
              <p className="text-4xl font-display text-brand-primary mt-2">{customerCount || 0}</p>
            </div>
            <div className="w-12 h-12 bg-brand-primary/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-8 border-2 border-black">
        <h2 className="text-2xl font-display uppercase tracking-tight mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin/products/new"
            className="p-4 border-2 border-brand-primary hover:bg-brand-primary hover:text-white transition-colors flex flex-col items-center gap-3 text-center"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-bold uppercase text-sm">Nieuw Product</span>
          </a>

          <a
            href="/admin/categories"
            className="p-4 border-2 border-black hover:bg-black hover:text-white transition-colors flex flex-col items-center gap-3 text-center"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="font-bold uppercase text-sm">Categorieën</span>
          </a>

          <a
            href="/admin/orders"
            className="p-4 border-2 border-black hover:bg-black hover:text-white transition-colors flex flex-col items-center gap-3 text-center"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-bold uppercase text-sm">Orders</span>
          </a>

          <a
            href="/admin/inventory"
            className="p-4 border-2 border-black hover:bg-black hover:text-white transition-colors flex flex-col items-center gap-3 text-center"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="font-bold uppercase text-sm">Voorraad</span>
          </a>
        </div>
      </div>
    </div>
  )
}

