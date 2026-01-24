import { Suspense } from 'react'
import UnsubscribeClient from './UnsubscribeClient'

export const metadata = {
  title: 'Uitschrijven | MOSE',
  description: 'Uitschrijven van de MOSE nieuwsbrief',
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    }>
      <UnsubscribeClient />
    </Suspense>
  )
}

