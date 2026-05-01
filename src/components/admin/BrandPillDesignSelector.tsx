'use client'

/**
 * BrandPillDesignSelector
 *
 * Admin-UI om visueel tussen de 5 brand-pill designs te kiezen voor
 * de productpagina. Rendert ELK design met dezelfde props als op de
 * live PDP — admins zien dus exact wat ze selecteren, inclusief
 * thumbnail-rotatie, NIEUW-badge en pulse-animatie.
 *
 * Data-strategie:
 *   * Probeer client-side de IG-feed op te halen via supabase RPC
 *     `get_instagram_display_data` (zelfde bron als de PDP).
 *   * Geen feed beschikbaar of nog geen posts: val terug op een
 *     statische placeholder-thumbnail (`/hero-mose-new.png`) zodat
 *     de previews altijd renderen.
 *
 * Interactie: één klik op een card selecteert het design en triggert
 * `onChange`. De parent (admin settings page) bepaalt save-flow.
 */

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  PILL_DESIGN_REGISTRY,
  getPillComponent,
  type PillDesignId,
} from '@/components/product/brand-pill'
import type { InstagramPost } from '@/lib/instagram/types'

interface BrandPillDesignSelectorProps {
  value: PillDesignId
  onChange: (next: PillDesignId) => void
  disabled?: boolean
  /**
   * IG-username voor de Avatar-design (zonder @). Default
   * "mosewearcom" — komt normaal van de admin instagram_settings.
   */
  username?: string
}

/**
 * Statische fallback-post voor wanneer er nog geen IG-feed is. We
 * verzinnen geen mooie tekst — gewoon één placeholder-image die in
 * elk design netjes past.
 */
const FALLBACK_POSTS: InstagramPost[] = [
  {
    id: 'preview-fallback',
    instagram_id: null,
    permalink: '#',
    media_type: 'IMAGE',
    media_url: '/hero-mose-new.png',
    thumbnail_url: null,
    caption: null,
    caption_en: null,
    like_count: null,
    taken_at: null,
    is_pinned: false,
    pin_order: null,
    source: 'manual',
  },
]

export default function BrandPillDesignSelector({
  value,
  onChange,
  disabled = false,
  username = 'mosewearcom',
}: BrandPillDesignSelectorProps) {
  const [posts, setPosts] = useState<InstagramPost[]>(FALLBACK_POSTS)
  const [currentIdx, setCurrentIdx] = useState(0)

  // Probeer client-side de IG-feed op te halen via dezelfde RPC die
  // de homepage en PDP server-side gebruiken. Failure of leeg →
  // gewoon doorgaan met de fallback-posts (al in state).
  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('get_instagram_display_data')
        if (cancelled || error) return
        const payload = (data ?? {}) as { posts?: InstagramPost[] }
        const fetched = Array.isArray(payload.posts) ? payload.posts : []
        if (fetched.length > 0) setPosts(fetched.slice(0, 3))
      } catch {
        // Stil falen — fallback-posts blijven actief.
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  // Roteer thumbnails ook in de admin-preview, zodat admins zien dat
  // de pill leeft. 4s interval = trager dan live (7s) zou statisch
  // ogen in een grid van 5 simultane previews. 4s voelt energiek.
  useEffect(() => {
    if (posts.length < 2) return
    const t = window.setInterval(
      () => setCurrentIdx((idx) => (idx + 1) % posts.length),
      4000
    )
    return () => window.clearInterval(t)
  }, [posts.length])

  const sharedPreviewProps = useMemo(
    () => ({
      posts,
      currentIdx: posts.length > 0 ? currentIdx % posts.length : 0,
      isFresh: true, // Toon NIEUW-badge in preview zodat admins ook die zien
      headline: 'WIE ZIJN WIJ?',
      subline: 'Ontdek ons op Instagram',
      sublineShort: 'Op Instagram',
      tagline: 'ONTMOET ONS',
      freshLabel: 'NIEUW',
      username,
      ariaLabel: '',
      ariaExpanded: false,
      onClick: () => undefined,
      onMouseEnter: () => undefined,
      preview: true,
      visible: true,
    }),
    [posts, currentIdx, username]
  )

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-600">
        Klik op een design om te kiezen. De preview hieronder rendert
        exact wat de bezoeker op de productpagina ziet — inclusief
        roterende thumbnail, NIEUW-badge en live pulse-indicator.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {PILL_DESIGN_REGISTRY.map((meta) => {
          const Pill = getPillComponent(meta.id)
          const selected = value === meta.id
          return (
            <button
              key={meta.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(meta.id)}
              aria-pressed={selected}
              className={`group relative flex flex-col items-stretch text-left bg-white border-2 transition-colors p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/40 ${
                selected
                  ? 'border-black ring-2 ring-brand-primary'
                  : 'border-gray-200 hover:border-gray-400'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Selected indicator rechtsboven */}
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-brand-primary text-white border-2 border-black z-10"
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              )}

              {/* Preview-zone — vaste min-height zodat alle cards
                  visueel dezelfde body hebben, ongeacht welk design
                  hoger of breder is. */}
              <div className="flex items-center justify-center min-h-[200px] py-4">
                <Pill {...sharedPreviewProps} />
              </div>

              {/* Naam + omschrijving */}
              <div className="mt-2 pt-3 border-t border-gray-100">
                <p className="font-bold text-sm text-black uppercase tracking-wide">
                  {meta.name}
                </p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {meta.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
