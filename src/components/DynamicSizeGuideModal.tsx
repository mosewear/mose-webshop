'use client'

import { useTranslations } from 'next-intl'

interface TableData {
  type: 'table'
  columns: string[]
  rows: string[][]
  how_to_measure?: { label: string; description: string }[]
}

interface SpecsData {
  type: 'specs'
  fields: { label: string; value: string }[]
  care_instructions?: { label: string; description: string }[]
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
            className="mt-4 sm:mt-6 w-full py-3 sm:py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors text-sm sm:text-base"
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
            className="mt-4 sm:mt-6 w-full py-3 sm:py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors text-sm sm:text-base"
          >
            {t('closeButton')}
          </button>
        </div>
      </div>
    )
  }

  return null
}

