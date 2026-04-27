interface CampaignThemeProviderProps {
  color: string | null
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export default function CampaignThemeProvider({ color }: CampaignThemeProviderProps) {
  if (!color || !HEX_RE.test(color)) return null

  // Inject a CSS custom property at the document root so other surfaces
  // (banner, popup, future micro-interactions) can opt in via
  // `var(--campaign-color)`. Sanitised before render — no string
  // interpolation can escape the regex.
  const css = `:root { --campaign-color: ${color}; }`

  return <style id="mose-campaign-theme">{css}</style>
}
