import { createClient } from '@/lib/supabase/client'

export async function logAdminAction(params: {
  action: 'create' | 'update' | 'delete' | 'status_change' | 'refund'
  entityType: 'order' | 'product' | 'customer' | 'settings' | 'return' | 'promo_code'
  entityId?: string
  details?: Record<string, any>
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('admin_audit_log').insert({
    admin_user_id: user.id,
    admin_email: user.email,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    details: params.details || {},
  })
}
