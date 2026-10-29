/**
 * Wettelijke bedrijfsgegevens van MOSE.
 *
 * Een Nederlandse webshop is verplicht het KvK-nummer te vermelden
 * (Handelsregisterwet, plus de informatieplicht bij verkoop op afstand).
 * Het stond nergens op de site: niet in de footer, niet in de algemene
 * voorwaarden, niet in het privacybeleid. Het is ook een afkeurgrond bij
 * verificatie door Trustpilot en Google Merchant Center.
 *
 * Deze waarden staan bewust in code en niet in `site_settings`: ze wijzigen
 * vrijwel nooit, en een verkeerd of leeg veld in de database zou stilletjes
 * een wettelijk verplichte vermelding doen verdwijnen. Verhuis ze pas naar
 * de admin als daar een reden voor ontstaat.
 *
 * Btw-identificatienummer bevestigd door de eigenaar op 28 oktober 2026.
 */
export const COMPANY = {
  legalName: 'MOSE',
  contactAddress: 'Helper Brink 27a, 9722 EG Groningen',
  kvkNumber: '98043609',
  vatNumber: 'NL868336270B01',
} as const

/** "KvK 98043609" — het label is in beide talen gangbaar. */
export function formatKvk(): string {
  return `KvK ${COMPANY.kvkNumber}`
}

/** Btw-identificatie bij de openbare bedrijfsgegevens. */
export function formatVat(): string {
  return `BTW / VAT ${COMPANY.vatNumber}`
}
