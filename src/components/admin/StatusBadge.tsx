import {
  orderStatus,
  paymentStatus,
  returnStatus,
  statusClasses,
  type StatusMeta,
} from '@/lib/status-registry'

type Kind = 'order' | 'payment' | 'return'

interface StatusBadgeProps {
  status: string | null | undefined
  /** Welke statuskaart gebruikt moet worden. `paid` betekent namelijk iets
   *  anders als orderstatus dan als betaalstatus. */
  kind?: Kind
  size?: 'sm' | 'md'
  className?: string
}

const RESOLVERS: Record<Kind, (s?: string | null) => StatusMeta> = {
  order: orderStatus,
  payment: paymentStatus,
  return: returnStatus,
}

/**
 * Eén badge voor elke status in de admin.
 *
 * Vervangt vijf losse `getStatusColor`/`getStatusLabel`-kaarten die voor
 * dezelfde status verschillende kleuren en vier verschillende labels gaven.
 * De markering vóór het label zorgt dat de status ook zonder kleur leesbaar is.
 */
export default function StatusBadge({
  status,
  kind = 'order',
  size = 'sm',
  className = '',
}: StatusBadgeProps) {
  const meta = RESOLVERS[kind](status)
  const maat = size === 'md' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wide whitespace-nowrap ${statusClasses(meta)} ${maat} ${className}`}
    >
      <span aria-hidden="true">{meta.mark}</span>
      {meta.label}
    </span>
  )
}
