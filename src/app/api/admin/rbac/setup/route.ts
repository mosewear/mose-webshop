import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const { authorized } = await requireAdmin(['admin'])
    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized — admin role required' }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if column exists by querying a profile with admin_role
    const { error: checkError } = await supabase
      .from('profiles')
      .select('admin_role')
      .limit(1)

    if (checkError) {
      return NextResponse.json({
        error: 'The admin_role column does not exist yet. Please run the migration first.',
        migration: `supabase/migrations/20260416100000_add_admin_roles.sql`,
        sql: [
          "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT 'viewer';",
          "UPDATE profiles SET admin_role = 'admin' WHERE is_admin = true AND (admin_role IS NULL OR admin_role = 'viewer');"
        ]
      }, { status: 400 })
    }

    // Backfill: ensure all existing admins without a role get 'admin'
    const { data: adminsWithoutRole, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, admin_role')
      .eq('is_admin', true)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    let updated = 0
    for (const admin of adminsWithoutRole || []) {
      if (!admin.admin_role || admin.admin_role === 'viewer') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ admin_role: 'admin' })
          .eq('id', admin.id)

        if (!updateError) updated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `RBAC setup complete. ${updated} admin(s) backfilled to 'admin' role.`,
      admins: adminsWithoutRole?.map(a => ({
        id: a.id,
        email: a.email,
        role: a.admin_role || 'admin (backfilled)'
      }))
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
