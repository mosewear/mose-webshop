'use client'

import { useTranslations } from 'next-intl'

interface TableData {
  type: 'table'
  columns: string[]
  rows: string[][]
  how_to_measure?: { label: string; description: string }[]
  /** Eén zin over hoe het kledingstuk valt. Staat bovenaan, want dat is de
   *  vraag waarmee iemand deze maatgids opent: welke maat moet ik hebben. */
  fit_note?: string
  /**
   * Welke maat bij welk lichaam past: lengte en borstomtrek. Staat boven de
   * kledingstuktabel. Zonder dit blok vergeleken klanten hun eigen arm met de
   * mouwlengte van het kledingstuk (die door de verlaagde schouder korter
   * is) en kwamen ze een of twee maten te groot uit.
   */
  body_guide?: { title: string; columns: string[]; rows: string[][]; note?: string }
  /** Kop boven de kledingstuktabel, bijvoorbeeld "Maten van de hoodie, plat gemeten". */
  garment_title?: string
}

interface SpecsData {
  type: 'specs'
  fields: { label: string; value: string }[]
  care_instructions?: { label: string; description: string }[]
  /** Zelfde rol als bij de maattabel: één zin over hoe het valt of past. */
  fit_note?: string
}

type SizeGuideContent = TableData | SpecsData

interface Props {
  content: SizeGuideContent
  onClose: () => void
}

export default function DynamicSizeGuideModal({ content, onClose }: Props) {
  const t = useTranslations('product.sizeGuide')
  // RENDER TABLE
  if (content.type === 'table') {
    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
        onClick={onClose}
        aria-label={t('close')}
      >
        <div 
          className="bg-white border-4 border-black p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[calc(95vh-100px)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase">{t('title')}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label={t('close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Pasvormregel bovenaan: wie de maatgids opent wil eerst weten of
              het kledingstuk normaal valt, en pas daarna de centimeters. */}
          {content.fit_note && (
            <p className="mb-3 sm:mb-4 border-l-4 border-brand-primary bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-black sm:text-sm">
              {content.fit_note}
            </p>
          )}

          {content.body_guide && (
            <section className="mb-5 sm:mb-6" aria-labelledby="maat-lichaam">
              <h3 id="maat-lichaam" className="mb-2 text-sm font-bold uppercase tracking-wider sm:text-base">
                {content.body_guide.title}
              </h3>
              <table className="w-full border-2 border-black text-xs sm:text-sm">
                <thead>
                  <tr className="bg-brand-primary text-white">
                    {content.body_guide.columns.map((col, i) => (
                      <th key={i} className="px-3 py-2 text-left font-bold sm:px-4">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {content.body_guide.rows.map((row, i) => (
                    <tr key={i} className={`border-b-2 border-black ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      {row.map((cell, j) => (
                        <td key={j} className={`px-3 py-2 sm:px-4 ${j === 0 ? 'font-bold' : ''}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {content.body_guide.note && (
                <p className="mt-2 text-xs leading-relaxed text-gray-700 sm:text-sm">{content.body_guide.note}</p>
              )}
            </section>
          )}

          {content.garment_title && (
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wider sm:text-base">{content.garment_title}</h3>
          )}

          {/* Scroll hint for mobile */}
          <div className="sm:hidden mb-2 text-xs text-gray-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>{t('swipeHint')}</span>
          </div>
          
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full border-2 border-black min-w-[500px]">
              <thead>
                <tr className="bg-black text-white">
                  {content.columns.map((col, i) => (
                    <th key={i} className="px-3 sm:px-4 py-2 sm:py-3 text-left font-bold text-xs sm:text-sm">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm">
                {content.rows.map((row, i) => (
                  <tr key={i} className={`border-b-2 border-black ${i % 2 === 1 ? 'bg-gray-50' : ''}`}>
                    {row.map((cell, j) => (
                      <td key={j} className={`px-3 sm:px-4 py-2 sm:py-3 ${j === 0 ? 'font-bold' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {content.how_to_measure && content.how_to_measure.length > 0 && (
            <div className="mt-4 sm:mt-6 bg-gray-50 border-2 border-gray-300 p-3 sm:p-4 text-xs sm:text-sm space-y-2">
              <h3 className="font-bold text-sm sm:text-base">{t('howToMeasure')}</h3>
              {content.how_to_measure.map((item, i) => (
                <p key={i}>
                  <span className="font-semibold">{item.label}:</span> {item.description}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="mose-button mose-button--primary mt-4 sm:mt-6 w-full"
          >
            {t('closeButton')}
          </button>
        </div>
      </div>
    )
  }

  // RENDER SPECS
  if (content.type === 'specs') {
    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
        onClick={onClose}
        aria-label={t('closeSpecs')}
      >
        <div 
          className="bg-white border-4 border-black p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[calc(95vh-100px)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase">{t('specsTitle')}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label={t('closeSpecs')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {content.fit_note && (
            <p className="mb-4 border-l-4 border-brand-primary bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-black sm:text-sm">
              {content.fit_note}
            </p>
          )}

          <div className="space-y-3">
            {content.fields.map((field, i) => (
              <div key={i} className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200 last:border-b-0">
                <div className="font-bold text-sm sm:text-base">{field.label}</div>
                <div className="text-sm sm:text-base">{field.value}</div>
              </div>
            ))}
          </div>

          {content.care_instructions && content.care_instructions.length > 0 && (
            <div className="mt-6 bg-gray-50 border-2 border-gray-300 p-3 sm:p-4 text-xs sm:text-sm space-y-2">
              <h3 className="font-bold text-sm sm:text-base">{t('careInstructions')}</h3>
              {content.care_instructions.map((item, i) => (
                <p key={i}>
                  <span className="font-semibold">{item.label}:</span> {item.description}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={onClose}
            className="mose-button mose-button--primary mt-4 sm:mt-6 w-full"
          >
            {t('closeButton')}
          </button>
        </div>
      </div>
    )
  }

  return null
}

