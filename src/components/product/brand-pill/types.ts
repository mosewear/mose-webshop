/**
 * Shared types voor de 5 brand-pill designs.
 *
 * Elk design ontvangt dezelfde set props zodat de BrandDiscoveryWidget
 * (en de admin-preview) ze 1-op-1 kan switchen op basis van de
 * `pdp_brand_widget_design` setting.
 */

import type { RefObject } from 'react'
import type { InstagramPost } from '@/lib/instagram/types'

export interface PillDesignProps {
  /** Eerste 3 posts uit de IG feed voor de thumbnail-rotatie. */
  posts: InstagramPost[]
  /** Index van de actieve thumbnail. */
  currentIdx: number
  /** Of de jongste post < 48u oud is (toont NIEUW-badge). */
  isFresh: boolean

  // Tekst-strings — de parent geeft alle varianten door, het design
  // kiest welke ervan past binnen z'n layout.
  headline: string
  subline: string
  sublineShort: string
  tagline: string
  freshLabel: string
  /** IG-gebruikersnaam zonder @ (bv. "mosewearcom"). */
  username: string

  // Interactiviteit
  ariaLabel: string
  ariaExpanded: boolean
  onClick: () => void
  onMouseEnter: () => void
  triggerRef?: RefObject<HTMLButtonElement | null>

  /**
   * Wanneer true wordt het design als statisch visueel preview
   * gerenderd: pointer-events uit, tab-order skipped, geen aria
   * "haspopup". Gebruikt door de admin-design-selector.
   */
  preview?: boolean
  /**
   * Visibility-class strategie voor entry-animatie (mount-delay,
   * cart-open). Wanneer false start de pill verborgen + pointer-
   * events-none. Default true.
   */
  visible?: boolean
}

export const PILL_DESIGN_IDS = [
  'classic',
  'story-card',
  'polaroid',
  'avatar',
  'minimal',
  'strip',
  'ticker',
] as const

export type PillDesignId = (typeof PILL_DESIGN_IDS)[number]

export interface PillDesignMeta {
  id: PillDesignId
  name: string
  description: string
}

/**
 * Admin-zichtbare metadata per design. NL-only (admin is NL-only).
 * Volgorde van dit array bepaalt ook de volgorde in de selector.
 */
export const PILL_DESIGN_REGISTRY: readonly PillDesignMeta[] = [
  {
    id: 'classic',
    name: 'Classic',
    description:
      'Horizontale pill met thumbnail en twee regels tekst. Opvallend genoeg om te zien, klein genoeg om niet in de weg te zitten.',
  },
  {
    id: 'story-card',
    name: 'Story Card',
    description:
      'Verticale magazine-cover met grote portrait-thumbnail bovenaan en een zwarte titelbalk eronder. Maximale visuele impact.',
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    description:
      'Schuingeplaatst polaroid-fotokaartje met witte rand en handgeschreven gevoel. Persoonlijk en distinctief.',
  },
  {
    id: 'avatar',
    name: 'Avatar',
    description:
      'Ronde profielfoto met @username, alsof iemand je tagt op Instagram. Sociaal en uitnodigend.',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description:
      'Compact tekst-tag met IG-icoon. Voor wie de pill bewust subtiel wil houden zonder visuele afleiding.',
  },
  {
    id: 'strip',
    name: 'Strip',
    description:
      'Brede contact-sheet pill met 3 IG-thumbnails naast elkaar en een zwarte CTA-balk rechts. Maximum visuele content in één blik.',
  },
  {
    id: 'ticker',
    name: 'Ticker',
    description:
      'News-bar met thumbnail links en een zwart paneel met scrollende brand-tekst rechts. Subtiele beweging trekt de aandacht zonder opdringerig te zijn.',
  },
] as const
