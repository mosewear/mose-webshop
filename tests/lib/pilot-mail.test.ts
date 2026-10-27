vi.mock('server-only', () => ({}))
import { describe, it, expect, vi } from 'vitest'
import { pilotMail } from '@/lib/mose-edit-pilot'

describe('the actual pilot text alternative', () => {
  it('preserves shopping and unsubscribe destinations while removing preview padding and HTML', () => {
    const input = '<head><title>Title</title><style>body{color:red}</style></head><div style="display:none;font-size:1px">Hidden preview</div><p>Kies je hoodie.</p><a href="https://mosewear.com/nl/product/mose-essential-hoodie?color=Groen&amp;utm_content=hero--a">Bekijk kleuren</a><a href="{{{ pm:unsubscribe }}}">Afmelden</a>'
    const mail = pilotMail(input, 'Proefgroep: bevestigd')
    expect(mail.tekst).toContain('Bekijk kleuren (https://mosewear.com/nl/product/mose-essential-hoodie?')
    expect(mail.tekst).toContain('color=Groen&utm_content=hero--a')
    expect(mail.tekst).toContain('utm_term=proefgroep-bevestigd')
    expect(mail.tekst).toContain('Afmelden ({{{ pm:unsubscribe }}})')
    expect(mail.tekst).not.toMatch(/<a|&amp;|Hidden preview|body\{color/)
  })
})
