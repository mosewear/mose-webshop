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
 * Er is bewust GEEN btw-identificatienummer opgenomen; de eigenaar heeft
 * aangegeven dat niet te willen tonen. Vermelding daarvan is voor een
 * webshop niet verplicht, in tegenstelling tot het KvK-nummer.
 */
export const COMPANY = {
  legalName: 'MOSE',
  kvkNumber: '98043609',
} as const

/** "KvK 98043609" — het label is in beide talen gangbaar. */
export function formatKvk(): string {
  return `KvK ${COMPANY.kvkNumber}`
}
