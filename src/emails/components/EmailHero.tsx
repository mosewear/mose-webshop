import { Section } from '@react-email/components'
import { EMAIL_COLORS, EMAIL_FONTS } from '../tokens'

interface EmailHeroProps {
  /** Kleine eyebrow-badge boven de titel (bv. "✓ Bestelling Bevestigd") */
  badge?: string
  badgeColor?: string
  /** Grote Anton-titel. Gebruik \n voor een line break. */
  title: string
  /** Kleine subtitle onder de titel */
  subtitle?: string
  /** 'dark' (default, zwarte achtergrond, witte tekst) | 'paper' (witte achtergrond) | 'primary' (teal) */
  variant?: 'dark' | 'paper' | 'primary'
  /** Optionele grotere titel-class */
  size?: 'md' | 'lg'
}

export default function EmailHero({
  badge,
  badgeColor,
  title,
  subtitle,
  variant = 'dark',
  size = 'md',
}: EmailHeroProps) {
  const bg =
    variant === 'dark'
      ? EMAIL_COLORS.black
      : variant === 'primary'
        ? EMAIL_COLORS.primary
        : EMAIL_COLORS.paper
  const titleColor =
    variant === 'paper' ? EMAIL_COLORS.ink : EMAIL_COLORS.paper
  const subtitleColor =
    variant === 'paper' ? EMAIL_COLORS.textMuted : '#bfbfbf'
  const badgeColorFinal =
    badgeColor ||
    (variant === 'primary' ? EMAIL_COLORS.paper : EMAIL_COLORS.primary)

  return (
    <Section style={{ paddingBottom: '12px' }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{ backgroundColor: bg }}
      >
        <tbody>
          {badge ? (
            <tr>
              <td
                align="center"
                style={{
                  padding: '40px 24px 0 24px',
                }}
              >
                <div
                  style={{
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '11px',
                    letterSpacing: '0.35em',
                    textTransform: 'uppercase',
                    color: badgeColorFinal,
                    fontWeight: 800,
                  }}
                >
                  {badge}
                </div>
              </td>
            </tr>
          ) : null}
          <tr>
            <td
              align="center"
              className="mose-pad-lg"
              style={{ padding: badge ? '18px 36px 36px 36px' : '44px 36px' }}
            >
              <h1
                className={
                  size === 'lg' ? 'mose-hero-title-lg' : 'mose-hero-title'
                }
                style={{
                  margin: 0,
                  padding: 0,
                  fontFamily: EMAIL_FONTS.display,
                  fontWeight: 400,
                  fontSize: size === 'lg' ? '84px' : '70px',
                  lineHeight: 0.9,
                  letterSpacing: '-0.01em',
                  color: titleColor,
                  textTransform: 'uppercase',
                }}
                dangerouslySetInnerHTML={{
                  __html: title.replace(/\n/g, '<br/>'),
                }}
              />
              {subtitle ? (
                <div
                  style={{
                    marginTop: '18px',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '14px',
                    lineHeight: 1.65,
                    color: subtitleColor,
                    maxWidth: '420px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                  }}
                >
                  {subtitle}
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
