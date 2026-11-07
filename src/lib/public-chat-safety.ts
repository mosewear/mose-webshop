/** Customer-facing AI chat must never disclose internal sourcing details. */
const internalSourcingTerms = /\b(?:tapstitch|dropship(?:ping|per|ped)?|print[ -]?on[ -]?demand|production partner|fulfilment partner|fulfillment partner|productiepartner|leverancier|supplier)\b/i

/**
 * AI answers are not trusted as public product copy. If an answer accidentally
 * exposes an internal fulfilment term, replace the whole answer with safe,
 * truthful customer information, not just the name inside the sentence.
 */
export function safeCustomerChatReply(reply: string, locale: string): string {
  if (!internalSourcingTerms.test(reply)) return reply
  return locale === 'en'
    ? 'You order from MOSE. Delivery options and shipping costs are shown at checkout. For questions about a specific order, Team MOSE can help.'
    : 'Je bestelt bij MOSE. De bezorgopties en verzendkosten zie je bij het afrekenen. Voor vragen over een bestelling helpt Team MOSE je graag.'
}

/** Strip supplier names from imported product descriptions before AI sees them. */
export function safeCustomerProductDescription(description: string): string {
  return description
    .replace(/\btapstitch(?:[’']s)?\s*/gi, '')
    .replace(/\b(?:dropship(?:ping|per|ped)?|print[ -]?on[ -]?demand)\b/gi, '')
    .trim()
}
