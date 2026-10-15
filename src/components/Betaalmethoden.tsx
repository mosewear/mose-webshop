import Image from 'next/image'

/**
 * De betaalmethoden, als rij logo's.
 *
 * Op het afrekenscherm stond nergens met welke methodes je kunt betalen. Je
 * vult je adres in en drukt op een knop, en pas daarna blijkt wat er mogelijk
 * is. In Nederland loopt het grootste deel van alle webwinkelbetalingen via
 * iDEAL, en dat logo vóór de knop is daar de geruststelling die hoort bij
 * "mag ik hier mijn adres achterlaten".
 *
 * Alleen methodes die ook echt aanstaan bij Mollie. Een logo tonen dat straks
 * niet in de betaalpagina staat, is erger dan geen logo.
 */

const METHODEN = [
  { naam: 'iDEAL', bestand: '/payment-icons/ideal.webp' },
  { naam: 'Mastercard', bestand: '/payment-icons/mastercard.png' },
  { naam: 'Visa', bestand: '/payment-icons/visa.png' },
  { naam: 'Bancontact', bestand: '/payment-icons/Bancontact.png' },
  { naam: 'Apple Pay', bestand: '/payment-icons/applepay.png' },
]

export default function Betaalmethoden({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {METHODEN.map((m) => (
        <span
          key={m.naam}
          className="flex h-7 w-11 items-center justify-center border border-gray-300 bg-white px-1"
          title={m.naam}
        >
          <Image
            src={m.bestand}
            alt={m.naam}
            width={36}
            height={22}
            className="h-auto max-h-5 w-auto object-contain"
          />
        </span>
      ))}
    </div>
  )
}
