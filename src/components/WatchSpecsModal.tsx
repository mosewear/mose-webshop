'use client'

interface WatchSpecsModalProps {
  onClose: () => void
}

export default function WatchSpecsModal({ onClose }: WatchSpecsModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn"
      onClick={onClose}
      aria-label="Sluit specificaties"
    >
      <div 
        className="bg-white border-4 border-black p-4 sm:p-6 md:p-8 max-w-2xl w-full max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-display uppercase">SPECIFICATIES</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Sluit specificaties"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Kastmaat</div>
            <div className="text-sm sm:text-base">42mm diameter</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Materiaal Kast</div>
            <div className="text-sm sm:text-base">RVS 316L (roestvrij staal)</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Materiaal Band</div>
            <div className="text-sm sm:text-base">RVS 316L schakelband</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Glas</div>
            <div className="text-sm sm:text-base">Saffierglas (krasbestendig)</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Uurwerk</div>
            <div className="text-sm sm:text-base">Automatisch Japans uurwerk</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Waterbestendig</div>
            <div className="text-sm sm:text-base">10 ATM (100 meter)</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Polsomtrek</div>
            <div className="text-sm sm:text-base">15-20cm (verstelbaar)</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Bandbreedte</div>
            <div className="text-sm sm:text-base">20mm</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3 border-b-2 border-gray-200">
            <div className="font-bold text-sm sm:text-base">Gewicht</div>
            <div className="text-sm sm:text-base">±120 gram</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] gap-3 py-3">
            <div className="font-bold text-sm sm:text-base">Garantie</div>
            <div className="text-sm sm:text-base">2 jaar fabrieksgarantie</div>
          </div>
        </div>

        <div className="mt-6 bg-gray-50 border-2 border-gray-300 p-3 sm:p-4 text-xs sm:text-sm space-y-2">
          <h3 className="font-bold text-sm sm:text-base">Onderhoud & Verzorging</h3>
          <p><span className="font-semibold">Reiniging:</span> Reinig met zachte doek en lauw water</p>
          <p><span className="font-semibold">Waterbestendig:</span> Geschikt voor zwemmen, niet voor duiken</p>
          <p><span className="font-semibold">Service:</span> Automatisch uurwerk heeft geen batterij nodig</p>
          <p><span className="font-semibold">Opbergen:</span> Bewaar in droge omgeving, bij voorkeur in horloge box</p>
        </div>
      </div>
    </div>
  )
}

