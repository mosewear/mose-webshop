'use client'

import { Clock, Package, Truck } from 'lucide-react'

interface PresaleInfoBoxProps {
  expectedDate?: string | null
  description?: string
}

export default function PresaleInfoBox({ 
  expectedDate,
  description 
}: PresaleInfoBoxProps) {
  const defaultDescription = expectedDate
    ? `Dit product is in pre-sale. We verwachten deze binnen ${expectedDate} en verzenden direct na binnenkomst.`
    : 'Dit product is in pre-sale en wordt verzonden zodra het binnenkomt.'

  return (
    <div className="bg-[#86A35A]/10 border-2 border-[#86A35A] p-4 my-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[#86A35A] border-2 border-black flex items-center justify-center">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-black uppercase tracking-wide mb-2 text-sm">
            Pre-sale Product
          </h4>
          <p className="text-sm text-gray-800 leading-relaxed mb-3">
            {description || defaultDescription}
          </p>
          <div className="flex flex-col gap-2 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#86A35A]" />
              <span>Je bestelling wordt verwerkt zodra het product binnen is</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#86A35A]" />
              <span>Je ontvangt een verzendbevestiging met track & trace</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



