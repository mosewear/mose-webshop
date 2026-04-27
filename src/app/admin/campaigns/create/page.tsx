import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CampaignForm from '@/components/admin/campaigns/CampaignForm'

export const dynamic = 'force-dynamic'

export default function CreateCampaignPage() {
  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/campaigns"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar campagnes
        </Link>
        <h1 className="text-3xl font-display font-bold">Nieuwe campagne</h1>
        <p className="text-sm text-gray-600 mt-1">
          Kies een snelle start of begin met een leeg canvas. Je kan altijd nog tweaken.
        </p>
      </div>

      <CampaignForm mode="create" />
    </div>
  )
}
