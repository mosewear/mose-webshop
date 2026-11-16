'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

export default function ReturnLabel({ id, eligible, email, parcel, sent, pendingEmail, tracking }: {
  id: string; eligible: boolean; email: string | null; parcel: boolean; sent: boolean; pendingEmail: boolean; tracking: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endpoint = `/api/admin/shopify/orders/${id}/return`

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const grams = Number(new FormData(event.currentTarget).get('grams'))
    setBusy(true)
    setError('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parcel ? { action: 'email' } : { action: 'create', grams }),
      })
      const result = await response.json()
      if (!response.ok) setError(result.error)
    } catch {
      setError('De retouractie kon niet worden bevestigd. Controleer hieronder de actuele status.')
    } finally {
      router.refresh()
      setBusy(false)
    }
  }

  return <section id="retour" className="space-y-3 border border-gray-200 p-5">
    <h2 className="text-lg font-bold">Retourlabel op kosten van MOSE</h2>
    {parcel && <div className="space-y-2">
      <p>Retourlabel beschikbaar{tracking ? ` · DHL ${tracking}` : ''}</p>
      <a href={endpoint} className="underline">Download retourlabel (pdf)</a>
      {sent && <p>E-mail verstuurd naar {email}.</p>}
      {pendingEmail && !sent && <p>Verzending e-mail niet bevestigd. Controleer het e-maillogboek.</p>}
    </div>}
    {!parcel && !eligible && <p>Beschikbaar voor betaalde, verzonden bestellingen met een Nederlands verzendadres en e-mailadres.</p>}
    {((!parcel && eligible) || (parcel && !sent && !pendingEmail && email)) && (
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        {!parcel && <label className="grid gap-1 text-sm font-semibold">
          Gewicht inclusief verpakking (gram)
          <input name="grams" type="number" required min={1} max={20000} className="border border-gray-300 p-2" />
        </label>}
        <button disabled={busy} className="bg-black px-4 py-2 text-white disabled:opacity-50">
          {busy ? 'Bezig…' : parcel ? 'Mail label naar ' + email : 'DHL-retourlabel aanmaken'}
        </button>
      </form>
    )}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>
}
