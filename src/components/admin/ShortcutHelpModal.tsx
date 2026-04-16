'use client'

import { useEffect, useCallback } from 'react'

const SHORTCUTS = [
  { keys: ['⌘', 'K'], description: 'Command palette openen' },
  { keys: ['Esc'], description: 'Modals sluiten' },
  { keys: ['G', 'O'], description: 'Ga naar Orders' },
  { keys: ['G', 'P'], description: 'Ga naar Producten' },
  { keys: ['G', 'C'], description: 'Ga naar Klanten' },
  { keys: ['G', 'D'], description: 'Ga naar Dashboard' },
  { keys: ['?'], description: 'Sneltoetsen tonen' },
  { keys: ['↑', '↓'], description: 'Navigeer in resultaten' },
  { keys: ['↵'], description: 'Selectie openen' },
]

interface ShortcutHelpModalProps {
  open: boolean
  onClose: () => void
}

export default function ShortcutHelpModal({ open, onClose }: ShortcutHelpModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (!open) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center px-3 sm:px-0 pt-[10vh] sm:pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="bg-white border-2 border-black w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-200">
          <h2 className="text-sm font-bold uppercase tracking-wide">Sneltoetsen</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.description} className="flex items-center gap-3">
              <div className="flex items-center gap-1 shrink-0">
                {shortcut.keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-medium">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="text-gray-400 text-xs mx-0.5">+</span>
                    )}
                  </span>
                ))}
              </div>
              <span className="text-xs text-gray-600 truncate">{shortcut.description}</span>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t-2 border-gray-200 text-xs text-gray-400">
          Tip: G-toetsen werken als twee-toetsen sequentie (druk G, dan de letter)
        </div>
      </div>
    </div>
  )
}
