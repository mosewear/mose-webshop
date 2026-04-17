import * as React from 'react'
import { Section } from '@react-email/components'
import { EMAIL_COLORS } from '../tokens'

interface EmailModuleProps {
  children: React.ReactNode
  /** Achtergrond van het module-blok */
  background?: string
  /** Buitenpadding van de module */
  padding?: string
  /** Ruimte tussen deze module en de volgende */
  gap?: string
  /** Optionele harde zwarte rand (voor brutalist "boxed" modules) */
  bordered?: boolean
  /** Optionele className voor mobiele tweaks */
  innerClassName?: string
  /** Align content center/left */
  align?: 'left' | 'center' | 'right'
}

/**
 * Modulair blok met achtergrond + padding. Elke module staat
 * los op de #eeeae2 canvas met een kleine gap ertussen.
 */
export default function EmailModule({
  children,
  background = EMAIL_COLORS.paper,
  padding = '28px 30px',
  gap = '12px',
  bordered = false,
  innerClassName = 'mose-pad',
  align = 'left',
}: EmailModuleProps) {
  return (
    <Section style={{ paddingBottom: gap }}>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        border={0}
        style={{
          backgroundColor: background,
          border: bordered ? `2px solid ${EMAIL_COLORS.borderStrong}` : 'none',
        }}
      >
        <tbody>
          <tr>
            <td
              align={align}
              className={innerClassName}
              style={{ padding }}
            >
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
