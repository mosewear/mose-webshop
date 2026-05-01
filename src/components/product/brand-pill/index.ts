/**
 * Brand-pill design registry.
 *
 * Centrale export voor de 5 designs + lookup-helper. De
 * BrandDiscoveryWidget en de admin-design-selector gebruiken hier
 * dezelfde mapping zodat een nieuw design op één plek toevoegen
 * (component + registry-entry in `types.ts`) genoeg is.
 */

import type { ComponentType } from 'react'
import type { PillDesignId, PillDesignProps } from './types'
import PillClassic from './PillClassic'
import PillStoryCard from './PillStoryCard'
import PillPolaroid from './PillPolaroid'
import PillAvatar from './PillAvatar'
import PillMinimal from './PillMinimal'

export type { PillDesignId, PillDesignProps, PillDesignMeta } from './types'
export { PILL_DESIGN_IDS, PILL_DESIGN_REGISTRY } from './types'

const COMPONENT_BY_ID: Record<PillDesignId, ComponentType<PillDesignProps>> = {
  classic: PillClassic,
  'story-card': PillStoryCard,
  polaroid: PillPolaroid,
  avatar: PillAvatar,
  minimal: PillMinimal,
}

export function getPillComponent(
  id: PillDesignId
): ComponentType<PillDesignProps> {
  return COMPONENT_BY_ID[id] ?? PillClassic
}
