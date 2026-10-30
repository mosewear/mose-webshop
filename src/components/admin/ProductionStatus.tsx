type Props = { order: { production_status?: string; production_checked_at?: string|null; production_stale?: boolean; production_source_url?: string|null } }
export default function ProductionStatus({order}:Props) {
  if(!order.production_status) return null
  return <div className="mt-1 text-xs">
    <p className={order.production_stale?'font-semibold text-amber-800':'text-gray-700'}>{order.production_status}{order.production_stale?' · controle verouderd':''}</p>
    {order.production_checked_at && <p className="text-gray-500">Tapstitch-scherm · {new Date(order.production_checked_at).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>}
    {order.production_source_url && <a href={order.production_source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Bekijk bij Tapstitch</a>}
  </div>
}
