'use client'

import { useTranslations } from 'next-intl'

interface WatchSpecsModalProps {
  onClose: () => void
}

export default function WatchSpecsModal({ onClose }: WatchSpecsModalProps) {
  const t = useTranslations('product.sizeGuide')
  const tSpecs = useTranslations('product.watchSpecs')
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={onClose}
      aria-label={t('closeSpecs')}
    >
      <div 
        className="bg-white border-4 border-black p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto"
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
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('caseSize')}</div>
            <div className="text-sm sm:text-base">{tSpecs('caseSizeValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('caseMaterial')}</div>
            <div className="text-sm sm:text-base">{tSpecs('caseMaterialValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('bandMaterial')}</div>
            <div className="text-sm sm:text-base">{tSpecs('bandMaterialValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('glass')}</div>
            <div className="text-sm sm:text-base">{tSpecs('glassValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('movement')}</div>
            <div className="text-sm sm:text-base">{tSpecs('movementValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('waterResistant')}</div>
            <div className="text-sm sm:text-base">{tSpecs('waterResistantValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('wristSize')}</div>
            <div className="text-sm sm:text-base">{tSpecs('wristSizeValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('bandWidth')}</div>
            <div className="text-sm sm:text-base">{tSpecs('bandWidthValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">{tSpecs('weight')}</div>
            <div className="text-sm sm:text-base">{tSpecs('weightValue')}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3">
            <div className="font-bold text-sm sm:text-base">{tSpecs('warranty')}</div>
            <div className="text-sm sm:text-base">{tSpecs('warrantyValue')}</div>
          </div>
        </div>

        <div className="mt-6 bg-gray-50 border-2 border-gray-300 p-3 sm:p-4 text-xs sm:text-sm space-y-2">
          <h3 className="font-bold text-sm sm:text-base">{t('careInstructions')}</h3>
          <p><span className="font-semibold">{tSpecs('cleaningLabel')}:</span> {tSpecs('cleaningText')}</p>
          <p><span className="font-semibold">{tSpecs('waterLabel')}:</span> {tSpecs('waterText')}</p>
          <p><span className="font-semibold">{tSpecs('serviceLabel')}:</span> {tSpecs('serviceText')}</p>
          <p><span className="font-semibold">{tSpecs('storageLabel')}:</span> {tSpecs('storageText')}</p>
        </div>
      </div>
    </div>
  )
}


