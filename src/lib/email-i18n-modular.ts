/**
 * Modular email template translations.
 *
 * All MOSE emails moved to a modular design system with new copy/keys
 * (badge, heroGreeting, heroSubtitle, status, preheader, …). These keys
 * live here — kept separate from the legacy dictionary in `email-i18n.ts`
 * so we don't touch the existing (still used) keys and can freely iterate
 * on modular copy.
 *
 * The `getEmailT` loader merges this dictionary ON TOP of the legacy one
 * (modular wins when there's overlap) and falls back to Dutch when an
 * English key is missing, so recipients never see raw translation keys.
 */

export type ModularDict = Record<string, Record<string, string>>

export const modularNl: ModularDict = {
  common: {
    piece: 'stuk',
    pieces: 'stuks',
    presale: 'PRESALE',
  },

  // ────────────────────────────────────────────────────────────────
  // Order Confirmation
  // ────────────────────────────────────────────────────────────────
  orderConfirmation: {
    status: 'Order Confirmed',
    badge: '✓ Bestelling Bevestigd',
    heroGreeting: 'Thanks',
    heroSubtitle: "Je bestelling is binnen. We pakken 'm zorgvuldig voor je in.",
    preheader: 'Je MOSE order {{orderNumber}} is bevestigd. We pakken \u2019m zorgvuldig voor je in.',
    orderNumber: 'Ordernummer',
    deliveryLabel: 'Bezorging',
    deliveryWindow: '2–3 WERKDAGEN',
    yourItems: 'Jouw Items',
    shippingAddress: 'Bezorgadres',
    totalPaid: 'Totaal Betaald',
    paid: 'Paid',
    paymentSummary: 'Breakdown',
    subtotal: 'Subtotaal (excl. btw)',
    vat: 'BTW 21%',
    shipping: 'Verzending',
    discount: 'Korting',
    free: 'Gratis',
    presaleNotice: 'Presale items in je bestelling',
    presaleNoticeText:
      'Een of meer items in je bestelling zijn pre-sale. Deze worden verwacht rond {{date}}.',
    trackCta: 'Track mijn bestelling',
    questions: 'Vragen?',
    shopMoreTitle: 'Ontdek meer in de MOSE collectie',
    shopMoreCta: 'Shop de collectie →',
  },

  // ────────────────────────────────────────────────────────────────
  // Preorder
  // ────────────────────────────────────────────────────────────────
  preorder: {
    status: 'Pre-order Confirmed',
    badge: '▲ Pre-Order Gereserveerd',
    heroGreeting: 'Reserved',
    heroSubtitle:
      'Je plek is geclaimd. Zodra de drop live gaat, pakken we jouw bestelling als eerste in.',
    preheader:
      'Je MOSE pre-order {{orderNumber}} is gereserveerd. Verwacht rond {{date}}.',
    orderNumber: 'Pre-order',
    expectedLabel: 'Verwacht',
    expectedDelivery: 'Verwachte levering',
    deliveryInfo: 'We houden je op de hoogte zodra je bestelling onderweg is.',
    whatHappensNow: 'Wat gebeurt er nu',
    step1: 'We reserveren jouw maten.',
    step2:
      'Zodra de drop binnenkomt pakken we jouw bestelling als eerste in.',
    step3: 'Je ontvangt een track & trace zodra het pakket verzonden is.',
    step4: 'Tot die tijd geen zorgen: je plek is veilig.',
    yourPreorder: 'Jouw Pre-order',
    shippingAddress: 'Bezorgadres',
    totalReserved: 'Totaal Gereserveerd',
    paid: 'Paid',
    paymentSummary: 'Breakdown',
    subtotal: 'Subtotaal (excl. btw)',
    btw: 'BTW 21%',
    shipping: 'Verzending',
    discount: 'Korting',
    free: 'Gratis',
    trackCta: 'Bekijk mijn pre-order',
    questions: 'Vragen?',
    shopMoreTitle: 'Ontdek meer in de MOSE collectie',
    shopMoreCta: 'Shop nu →',
  },

  // ────────────────────────────────────────────────────────────────
  // Shipping
  // ────────────────────────────────────────────────────────────────
  shipping: {
    status: 'Shipped',
    badge: '→ Onderweg naar jou',
    heroGreeting: 'Shipped',
    heroSubtitle:
      'Je MOSE is onderweg. Track het pakket hieronder en hou je brievenbus in de gaten.',
    preheader:
      'Je MOSE pakket {{orderNumber}} is onderweg. Track het met code {{tracking}}.',
    order: 'Ordernummer',
    estimatedDelivery: 'Verwacht',
    trackAndTrace: 'Track & Trace',
    trackOrder: 'Track mijn pakket',
    helpfulTips: 'Handige tips',
    tip1Title: 'Hou je brievenbus in de gaten',
    tip1: 'Het pakket komt binnen 1–3 werkdagen aan.',
    tip2Title: 'Mail notificaties',
    tip2:
      'Je ontvangt updates van de vervoerder zodra het pakket onderweg is.',
    tip3Title: 'Niet thuis?',
    tip3:
      'Geen zorgen: de pakketbezorger levert opnieuw of bij de buren.',
    workingDays: '2–3 werkdagen',
    questions: 'Vragen over je pakket?',
  },

  // ────────────────────────────────────────────────────────────────
  // Processing
  // ────────────────────────────────────────────────────────────────
  processing: {
    status: 'Processing',
    badge: '▸ In behandeling',
    heroGreeting: 'Packing',
    heroSubtitle:
      "We pakken je bestelling zorgvuldig in. Zodra 'ie onderweg is hoor je van ons.",
    preheader: 'Je MOSE order #{{orderNumber}} wordt nu voor je ingepakt.',
    orderNumber: 'Ordernummer',
    statusLabel: 'Status',
    statusValue: 'In Behandeling',
    description:
      'Gemiddelde verwerkingstijd is 1 werkdag. Alleen gewijzigd adres? Mail ons zo snel mogelijk, we proberen het nog mee te nemen.',
    whatNext: 'Wat gebeurt er nu',
    step1: 'Onze pakkers pakken jouw items zorgvuldig in.',
    step2: 'We printen je verzendlabel.',
    step3: 'Het pakket gaat richting onze vervoerder.',
    step4: 'Je ontvangt een tracking link zodra het onderweg is.',
    viewOrder: 'Bekijk mijn bestelling',
    questions: 'Vragen?',
  },

  // ────────────────────────────────────────────────────────────────
  // Delivered
  // ────────────────────────────────────────────────────────────────
  delivered: {
    status: 'Delivered',
    badge: '✓ Afgeleverd',
    heroGreeting: 'Delivered',
    heroSubtitle:
      'Je pakket ligt waar het hoort. Tijd om die MOSE te dragen.',
    preheader:
      'Je MOSE pakket #{{orderNumber}} is afgeleverd. Hopelijk geniet je ervan.',
    orderNumber: 'Ordernummer',
    statusLabel: 'Status',
    statusValue: 'Afgeleverd',
    description:
      'Hopelijk geniet je van je nieuwe MOSE. Als er ook maar iets niet 100% goed is, horen we dat graag — we lossen het voor je op.',
    feedbackTitle: 'Deel je ervaring',
    feedback:
      'We zijn nieuwsgierig wat je ervan vindt. Laat een review achter en help anderen hun MOSE te vinden.',
    ctaButton: 'Shop de collectie',
    questions: 'Iets niet goed?',
    shopMoreTitle: 'Dubbel zo goed: shop de drop',
  },

  // ────────────────────────────────────────────────────────────────
  // Cancelled
  // ────────────────────────────────────────────────────────────────
  cancelled: {
    status: 'Cancelled',
    badge: '✕ Geannuleerd',
    heroGreeting: 'Order Gecanceld',
    heroSubtitle:
      'Je bestelling is geannuleerd. Je betaling wordt automatisch teruggestort.',
    preheader:
      'Je MOSE order #{{orderNumber}} is geannuleerd. Je betaling wordt automatisch teruggestort.',
    orderNumber: 'Ordernummer',
    statusLabel: 'Status',
    statusValue: 'Geannuleerd',
    description:
      'Sorry voor het ongemak. We proberen dit in de toekomst te voorkomen. Heb je vragen over deze annulering? We helpen je graag.',
    reason: 'Reden van annulering',
    refundTitle: 'Terugbetaling',
    refundInfo:
      'Je wordt automatisch teruggestort op de originele betaalmethode binnen 3–5 werkdagen.',
    ctaButton: 'Terug naar de shop',
    questions: 'Vragen over de annulering?',
  },

  // ────────────────────────────────────────────────────────────────
  // Returns
  // ────────────────────────────────────────────────────────────────
  returnRequested: {
    status: 'Return Requested',
    badge: '↺ Retour Geregistreerd',
    heroGreeting: 'Return',
    heroSubtitle:
      'We hebben je retour-aanvraag ontvangen. Binnen 2 werkdagen hoor je of alles is goedgekeurd.',
    preheader:
      'Je retour {{returnNumber}} is ontvangen. We verwerken het binnen 2 werkdagen.',
    returnNumber: 'Retour',
    orderNumber: 'Order',
    description:
      'Zodra we je aanvraag hebben beoordeeld sturen we je het retourlabel. Verstuur je items in de originele staat met labels nog bevestigd.',
    itemsTitle: 'Te retourneren items',
    processingTimeTitle: 'Verwerkingstijd',
    processingTime:
      'We beoordelen retour-aanvragen binnen 2 werkdagen. Je hoort zo snel mogelijk van ons.',
    viewCta: 'Bekijk mijn retour',
    questions: 'Vragen?',
  },

  returnLabelGenerated: {
    status: 'Label Ready',
    badge: '▼ Retourlabel Klaar',
    heroGreeting: 'Label',
    heroSubtitle:
      'Je retourlabel is klaar. Download het, plak het op het pakket en breng hem langs bij het afleverpunt.',
    preheader:
      'Je retourlabel voor {{returnNumber}} staat klaar. Download en plak het op je pakket.',
    returnNumber: 'Retour',
    statusLabel: 'Status',
    statusValue: 'Label Klaar',
    downloadButton: 'Download retourlabel',
    labelFootnote:
      'Kan je het label niet openen? Kopieer deze link in je browser.',
    instructionsTitle: 'Hoe retourneren',
    step1:
      'Print het label en plak het goed zichtbaar op het pakket.',
    step2:
      'Stop de items in de originele verpakking met labels nog bevestigd.',
    step3:
      'Breng het pakket naar een PostNL/DHL afleverpunt in de buurt.',
    step4:
      'Zodra we het pakket ontvangen hoor je zo snel mogelijk van ons.',
    trackCta: 'Volg mijn retour',
    questions: 'Iets niet duidelijk?',
  },

  returnApproved: {
    status: 'Return Approved',
    badge: '✓ Goedgekeurd',
    heroGreeting: 'Approved',
    heroSubtitle:
      'We hebben je retour goedgekeurd. De terugbetaling wordt nu in gang gezet.',
    preheader:
      'Je retour is goedgekeurd. We storten {{amount}} terug binnen 3–5 werkdagen.',
    returnNumber: 'Retour',
    statusLabel: 'Status',
    statusValue: 'Goedgekeurd',
    description:
      'Je ziet het bedrag meestal binnen 3–5 werkdagen terug op je rekening. Afhankelijk van je bank kan dit soms iets langer duren.',
    refundProcessing: 'Refund · In verwerking',
    refundLabel: 'Terugbetaling',
    refundAmount: 'Bedrag',
    refundMethod:
      'Op de originele betaalmethode binnen 3–5 werkdagen.',
    refundSoon: 'Wordt automatisch teruggestort',
    nextStepsTitle: 'Wat nu',
    nextSteps:
      'Zodra de terugbetaling is verwerkt sturen we je een bevestigingsmail met het exacte moment van afronding.',
    ctaButton: 'Terug naar shoppen',
    questions: 'Vragen?',
  },

  returnRefunded: {
    status: 'Refunded',
    badge: '€ Teruggestort',
    heroGreeting: 'Refunded',
    heroSubtitle:
      'Je terugbetaling is onderweg naar je rekening. Merci voor je vertrouwen in MOSE.',
    preheader:
      '{{amount}} is teruggestort op je rekening. Merci voor je vertrouwen in MOSE.',
    returnNumber: 'Retour',
    refundCompleted: 'Refund · Completed',
    refundLabel: 'Terugbetaling',
    refundAmount: 'Teruggestort',
    processed: 'Verwerking voltooid',
    methodLabel: 'Methode',
    methodBody: 'Betaalmethode: {{method}}',
    description:
      'Afhankelijk van je bank kan het 1–3 werkdagen duren voordat je het bedrag daadwerkelijk op je rekening ziet verschijnen.',
    ctaButton: 'Terug naar shoppen',
    questions: 'Vragen?',
  },

  returnRejected: {
    status: 'Return Rejected',
    badge: '✕ Niet Verwerkbaar',
    heroGreeting: 'Sorry',
    heroSubtitle:
      'We kunnen je retour helaas niet verwerken. Neem even contact op en we helpen je verder.',
    preheader:
      'We kunnen retour {{returnNumber}} helaas niet verwerken. Neem contact op en we helpen je verder.',
    returnNumber: 'Retour',
    statusLabel: 'Status',
    statusValue: 'Afgewezen',
    description:
      'Deze retour voldoet helaas niet aan onze retourvoorwaarden. Als je denkt dat dit onterecht is, laat het ons weten. We kijken er graag opnieuw naar.',
    reasonTitle: 'Reden',
    phoneHint: 'Liever bellen?',
    ctaButton: 'Neem contact op',
  },

  // ────────────────────────────────────────────────────────────────
  // Abandoned cart & back in stock
  // ────────────────────────────────────────────────────────────────
  abandonedCart: {
    status: 'Cart Reminder',
    badge: '▲ Still Yours',
    heroTitle: 'Don\u2019t Forget.',
    subtitle:
      '{{customerName}}, we bewaren je cart — maar niet voor eeuwig.',
    preheader:
      '{{customerName}}, je winkelwagen wacht nog op je.',
    description:
      'Je hebt items achtergelaten in je winkelwagen. Rond je bestelling af voordat je maat wegraakt.',
    itemsTitle: 'In je cart',
    itemsMeta: 'items',
    quantity: 'Aantal',
    total: 'Totaal',
    moreItems: '+ {{hiddenCount}} meer items',
    ctaButton: 'Ga terug naar je cart',
    ctaFootnote: 'Jouw items wachten op je.',
    freeShippingTitle: 'Altijd gratis verzending',
    freeShipping:
      'Bij elke bestelling, zonder minimum. Gewoon omdat het hoort.',
  },

  backInStock: {
    status: 'Back in Stock',
    badge: '▲ Restocked',
    heroTitle: 'Back In Stock.',
    subtitle: 'Het item waar je op wachtte is er weer. Maar niet lang.',
    preheader:
      '{{productName}} is terug op voorraad — claim \u2019m voor hij weer weg is.',
    description:
      'Limited stock — ga er snel bij zodat je niet opnieuw op de wachtlijst hoeft.',
    limitedStockTitle: 'Beperkte voorraad',
    limitedStock:
      'Op = op. Geen garantie dat deze restock lang blijft staan.',
    ctaButton: 'Bekijk product',
  },

  // ────────────────────────────────────────────────────────────────
  // Contact form
  // ────────────────────────────────────────────────────────────────
  contact: {
    status: 'Contact Form',
    badge: '▲ Inbox',
    heroTitle: 'New Message.',
    subtitle: 'Er is een nieuw bericht binnengekomen via het contactformulier.',
    preheader:
      'Nieuw bericht van {{customerName}} via het contactformulier.',
    detailsTitle: 'Verzender',
    from: 'Van',
    email: 'E-mail',
    subject: 'Onderwerp',
    message: 'Bericht',
    replyInfo: 'Reageer direct door te antwoorden naar {{email}}.',
  },

  newReview: {
    status: 'Review',
    badge: '▲ New Review',
    heroTitle: 'New Review.',
    subtitle:
      'Er wacht een nieuwe review op moderatie. Bekijk en keur goed in het dashboard.',
    preheader:
      'Nieuwe review ({{rating}}/5) van {{reviewerName}} — klaar voor moderatie.',
    detailsTitle: 'Review details',
    product: 'Product',
    reviewer: 'Reviewer',
    email: 'E-mail',
    rating: 'Rating',
    reviewTitle: 'Titel',
    reviewComment: 'Bericht',
    approveButton: 'Beoordeel review',
    info:
      'Reviews zijn pas zichtbaar op de productpagina nadat jij ze hebt goedgekeurd.',
  },

  newsletterWelcome: {
    status: 'Newsletter',
    badge: '▲ Welcome',
    heroTitle: 'You\u2019re In.',
    heroText:
      'Je staat op de lijst. Vanaf nu ontvang je de nieuwste drops als eerste.',
    preheader:
      'Welkom bij MOSE — als eerste op de hoogte van drops, restocks en insider-only pieces.',
    promoTitle: 'Jouw welkomstcode',
    promoSubtext:
      'Gebruik deze code voor 10% korting op je eerste bestelling.',
    promoExpiry: 'Geldig tot {{date}}',
    whatYouGet:
      'Dit is wat je van ons kunt verwachten — geen spam, alleen relevant.',
    benefitsTitle: 'Wat je krijgt',
    benefit1Title: 'Nieuwe drops',
    benefit1Text: 'Als eerste horen wanneer er iets nieuws lanceert.',
    benefit2Title: 'Restock alerts',
    benefit2Text:
      'Direct een seintje wanneer populaire pieces terug zijn.',
    benefit3Title: 'Exclusieve deals',
    benefit3Text:
      'Newsletter-only kortingen die je nergens anders krijgt.',
    discoverCollection: 'Ontdek de collectie',
    receivedBecause:
      'Je ontvangt deze mail omdat je je aanmeldde met {{email}}.',
  },

  // ────────────────────────────────────────────────────────────────
  // Insider series
  // ────────────────────────────────────────────────────────────────
  insiderWelcome: {
    status: 'Insider Club',
    badge: '▲ Insider Club',
    heroTitle: 'Welcome Insider.',
    heroSubtitle:
      'Je zit erin. Als eerste zien wat er aankomt, toegang tot drops voor iedereen, en alleen voor insiders.',
    preheader:
      'Welkom in de MOSE Insider Club — als eerste zien wat er aankomt.',
    tagline: 'Made in Groningen — Dressed Worldwide',
    intro:
      'We pakken streetwear anders aan — doordacht, duurzaam en alleen in beperkte drops. Als insider krijg jij de eerste pick.',
    promoLabel: 'Welcome Drop Code',
    validUntil: 'Geldig tot {{date}}',
    perksTitle: 'Wat je krijgt',
    perk1Title: 'Early Access',
    perk1Text: 'Als eerste zien wat er aankomt, 24u voor iedereen.',
    perk2Title: 'Gratis Verzending',
    perk2Text:
      'Altijd gratis verzending binnen Nederland — ook op pre-orders.',
    perk3Title: 'Insider Only Drops',
    perk3Text: 'Limited pieces die alleen insiders kunnen claimen.',
    perk4Title: 'Behind the Scenes',
    perk4Text:
      'De verhalen achter MOSE — waar materiaal, design en productie samenkomen.',
    ctaButton: 'Bekijk de collectie',
    emailLabel: 'Je insider email',
    questions: 'Vragen?',
  },

  insiderCommunity: {
    status: 'Community',
    badge: '▲ Insider Community',
    heroTitle: 'Built Together.',
    subtitle:
      'MOSE groeit organisch — doordat insiders het delen. Bedankt dat je erbij bent.',
    preheader:
      '{{subscriberCount}} insiders zijn al binnen. Nog {{daysUntilLaunch}} dagen tot de drop.',
    intro:
      'Je bent geen klant — je bent insider. Dat betekent dat jouw feedback mede bepaalt wat we volgend seizoen produceren.',
    numbers: 'In cijfers',
    stat1: '{{subscriberCount}} insiders zijn al binnen.',
    stat2: '100% in Nederland en België geleverd.',
    stat3: 'Meer dan 90% positieve reviews op onze drops.',
    subscriberLabel: 'Insiders',
    daysLabel: 'Dagen tot drop',
    productsTitle: 'Featured drops',
    productsIntro: 'Een greep uit wat nu bij insiders loopt.',
    viewProduct: 'Bekijk →',
    presaleTitle: 'Shop nu in presale',
    presaleSubtitle: 'De drop komt eraan',
    presaleText: 'Als insider krijg je 24u vroege toegang.',
    presaleCTA: 'Claim je plek',
    communityTitle: 'Uit de community',
    testimonial1:
      '"Eindelijk een Nederlands merk dat geen bullshit verkoopt. Just clean, solid basics."',
    testimonial2:
      '"Die hoodies zien er insane uit. Kan niet wachten tot de drop."',
    testimonial3: '"Love dat ze lokaal produceren. Dat maakt het verschil."',
    joinTitle: 'Kom erbij op socials',
    socialInsta: '@mosewear op Instagram',
    ps: 'PS — nog {{daysUntilLaunch}} dagen tot de officiële drop.',
  },

  insiderBehindScenes: {
    status: 'Behind the Scenes',
    badge: '▲ Behind the Scenes',
    heroTitle: 'Behind The Scenes.',
    subtitle:
      'Waar materiaal, design en productie samenkomen. Alleen voor insiders.',
    preheader:
      'Achter de schermen bij MOSE — het verhaal achter de volgende drop.',
    intro:
      'Drops maak je niet in een week. Dit is het verhaal achter wat er nu op ons atelier gebeurt.',
    processTitle: 'Het proces',
    process1: 'Research & materiaal selectie.',
    process2: 'Pattern cutting & eerste samples.',
    process3: 'Kleine batch productie in Europa.',
    limitedTitle: 'Limited edition',
    limitedText:
      'Elke drop is beperkt — als het weg is, is het weg. Geen restocks.',
    followCTA: 'Volg op Instagram',
    followSubtext: 'Daily behind-the-scenes content.',
    closing: 'Bedankt dat je erbij bent. Jouw support maakt het mogelijk.',
  },

  insiderLaunchWeek: {
    status: 'Launch Week',
    badge: '▲ Launch Week',
    heroTitle: 'Launch Week.',
    subtitle:
      'Nog {{daysUntilLaunch}} dagen. Zorg dat je klaar staat.',
    preheader:
      'Nog {{daysUntilLaunch}} dagen tot de drop — dit is wat je moet weten.',
    intro:
      'Over {{daysUntilLaunch}} dagen openen we de drop. Als insider zit je vooraan.',
    countdownLabel: 'Dagen tot drop',
    accessLabel: 'Early access',
    whatThisMeansTitle: 'Wat dit betekent',
    info1: 'Jij krijgt als eerste toegang — 24 uur eerder.',
    info2: 'Limited stock per stuk — op = op.',
    info3: 'Geen restocks, geen tweede kansen.',
    perksRemainTitle: 'Je insider perks',
    perk1: 'Early access tot de drop.',
    perk2: 'Altijd gratis verzending in NL.',
    perk3: 'Insider-only pieces.',
    statusTitle: 'Status check',
    statusAlready: 'Al ingelogd? Dan staat alles klaar.',
    statusNotYet:
      'Nog niet? Log vandaag in zodat je op drop day geen tijd verliest.',
    limitedStockTitle: 'Extra beperkt',
    shopNow: 'Shop de drop',
    closing: 'Zorg dat je op tijd bent. Insider love.',
    ps: 'PS — zet je notifications aan zodat je de drop niet mist.',
  },
}

// ---------------------------------------------------------------------------
// English translations (modular)
// ---------------------------------------------------------------------------

export const modularEn: ModularDict = {
  common: {
    piece: 'piece',
    pieces: 'pieces',
    presale: 'PRESALE',
  },

  orderConfirmation: {
    status: 'Order Confirmed',
    badge: '✓ Order Confirmed',
    heroGreeting: 'Thanks',
    heroSubtitle:
      "We've got your order. We'll pack it with care and keep you posted.",
    preheader:
      "Your MOSE order {{orderNumber}} is confirmed. We'll pack it with care.",
    orderNumber: 'Order number',
    deliveryLabel: 'Delivery',
    deliveryWindow: '2–3 BUSINESS DAYS',
    yourItems: 'Your Items',
    shippingAddress: 'Shipping address',
    totalPaid: 'Total Paid',
    paid: 'Paid',
    paymentSummary: 'Breakdown',
    subtotal: 'Subtotal (excl. VAT)',
    vat: 'VAT 21%',
    shipping: 'Shipping',
    discount: 'Discount',
    free: 'Free',
    presaleNotice: 'Presale items in your order',
    presaleNoticeText:
      'One or more items in your order are pre-sale. They are expected around {{date}}.',
    trackCta: 'Track my order',
    questions: 'Questions?',
    shopMoreTitle: 'Discover more from the MOSE collection',
    shopMoreCta: 'Shop the collection →',
  },

  preorder: {
    status: 'Pre-order Confirmed',
    badge: '▲ Pre-Order Reserved',
    heroGreeting: 'Reserved',
    heroSubtitle:
      "Your spot is locked in. The moment the drop goes live, we'll pack your order first.",
    preheader:
      'Your MOSE pre-order {{orderNumber}} is reserved. Expected around {{date}}.',
    orderNumber: 'Pre-order',
    expectedLabel: 'Expected',
    expectedDelivery: 'Expected delivery',
    deliveryInfo:
      "We'll keep you posted the moment your order is on its way.",
    whatHappensNow: 'What happens next',
    step1: 'We reserve your sizes.',
    step2: 'As soon as the drop arrives, we pack your order first.',
    step3: 'You get a track & trace the minute your package ships.',
    step4: "Until then: your spot is safe, no worries.",
    yourPreorder: 'Your Pre-order',
    shippingAddress: 'Shipping address',
    totalReserved: 'Total Reserved',
    paid: 'Paid',
    paymentSummary: 'Breakdown',
    subtotal: 'Subtotal (excl. VAT)',
    btw: 'VAT 21%',
    shipping: 'Shipping',
    discount: 'Discount',
    free: 'Free',
    trackCta: 'View my pre-order',
    questions: 'Questions?',
    shopMoreTitle: 'Discover more from the MOSE collection',
    shopMoreCta: 'Shop now →',
  },

  shipping: {
    status: 'Shipped',
    badge: '→ On its way to you',
    heroGreeting: 'Shipped',
    heroSubtitle:
      'Your MOSE is on its way. Track the package below and keep an eye on your mailbox.',
    preheader:
      'Your MOSE package {{orderNumber}} is on its way. Track it with code {{tracking}}.',
    order: 'Order number',
    estimatedDelivery: 'Expected',
    trackAndTrace: 'Track & Trace',
    trackOrder: 'Track my package',
    helpfulTips: 'Helpful tips',
    tip1Title: 'Keep an eye on your mailbox',
    tip1: 'The package arrives within 1–3 business days.',
    tip2Title: 'Carrier notifications',
    tip2:
      "You'll get updates from the carrier as soon as the package is moving.",
    tip3Title: 'Not home?',
    tip3:
      'No stress: the courier will redeliver or leave it with a neighbour.',
    workingDays: '2–3 business days',
    questions: 'Questions about your package?',
  },

  processing: {
    status: 'Processing',
    badge: '▸ Being handled',
    heroGreeting: 'Packing',
    heroSubtitle:
      "We're packing your order with care. You'll hear from us the moment it ships.",
    preheader: 'Your MOSE order #{{orderNumber}} is being packed right now.',
    orderNumber: 'Order number',
    statusLabel: 'Status',
    statusValue: 'Processing',
    description:
      "Average processing time is 1 business day. Need to change your address? Email us ASAP and we'll try to squeeze it in.",
    whatNext: 'What happens next',
    step1: 'Our packers carefully pack your items.',
    step2: 'We print your shipping label.',
    step3: 'The package moves to our carrier.',
    step4: "You get a tracking link the second it's on its way.",
    viewOrder: 'View my order',
    questions: 'Questions?',
  },

  delivered: {
    status: 'Delivered',
    badge: '✓ Delivered',
    heroGreeting: 'Delivered',
    heroSubtitle:
      "Your package is where it belongs. Time to wear that MOSE.",
    preheader:
      'Your MOSE package #{{orderNumber}} has been delivered. Hope you love it.',
    orderNumber: 'Order number',
    statusLabel: 'Status',
    statusValue: 'Delivered',
    description:
      "Hope you're loving your new MOSE. If anything is less than 100% right, let us know — we'll sort it for you.",
    feedbackTitle: 'Share your experience',
    feedback:
      "We're curious what you think. Drop a review and help others find their MOSE.",
    ctaButton: 'Shop the collection',
    questions: 'Something off?',
    shopMoreTitle: 'Twice as good: shop the drop',
  },

  cancelled: {
    status: 'Cancelled',
    badge: '✕ Cancelled',
    heroGreeting: 'Order Cancelled',
    heroSubtitle:
      'Your order has been cancelled. Your payment will be refunded automatically.',
    preheader:
      'Your MOSE order #{{orderNumber}} has been cancelled. Your payment will be refunded automatically.',
    orderNumber: 'Order number',
    statusLabel: 'Status',
    statusValue: 'Cancelled',
    description:
      "Sorry for the inconvenience. We'll do better next time. Got questions about this cancellation? We're here to help.",
    reason: 'Reason for cancellation',
    refundTitle: 'Refund',
    refundInfo:
      'You will be refunded automatically to the original payment method within 3–5 business days.',
    ctaButton: 'Back to the shop',
    questions: 'Questions about the cancellation?',
  },

  returnRequested: {
    status: 'Return Requested',
    badge: '↺ Return Registered',
    heroGreeting: 'Return',
    heroSubtitle:
      "We received your return request. You'll hear back within 2 business days.",
    preheader:
      "Your return {{returnNumber}} was received. We'll process it within 2 business days.",
    returnNumber: 'Return',
    orderNumber: 'Order',
    description:
      "Once we review your request we'll send you the return label. Ship items in original condition with tags still attached.",
    itemsTitle: 'Items to return',
    processingTimeTitle: 'Processing time',
    processingTime:
      "We review return requests within 2 business days. We'll reach out as soon as possible.",
    viewCta: 'View my return',
    questions: 'Questions?',
  },

  returnLabelGenerated: {
    status: 'Label Ready',
    badge: '▼ Return Label Ready',
    heroGreeting: 'Label',
    heroSubtitle:
      'Your return label is ready. Download it, stick it on the package and drop it off at a collection point.',
    preheader:
      'Your return label for {{returnNumber}} is ready. Download and stick it on your package.',
    returnNumber: 'Return',
    statusLabel: 'Status',
    statusValue: 'Label Ready',
    downloadButton: 'Download return label',
    labelFootnote:
      "Can't open the label? Copy this link into your browser.",
    instructionsTitle: 'How to return',
    step1:
      'Print the label and stick it clearly visible on the package.',
    step2:
      'Put the items back in the original packaging with tags still attached.',
    step3:
      'Drop the package at a PostNL/DHL collection point near you.',
    step4:
      "Once we receive the package we'll be in touch as fast as we can.",
    trackCta: 'Follow my return',
    questions: 'Anything unclear?',
  },

  returnApproved: {
    status: 'Return Approved',
    badge: '✓ Approved',
    heroGreeting: 'Approved',
    heroSubtitle:
      'We approved your return. Your refund is now being processed.',
    preheader:
      "Your return is approved. We'll refund {{amount}} within 3–5 business days.",
    returnNumber: 'Return',
    statusLabel: 'Status',
    statusValue: 'Approved',
    description:
      "You'll usually see the amount back on your account within 3–5 business days. Depending on your bank this can take slightly longer.",
    refundProcessing: 'Refund · Processing',
    refundLabel: 'Refund',
    refundAmount: 'Amount',
    refundMethod:
      'Back to the original payment method within 3–5 business days.',
    refundSoon: 'Refunded automatically',
    nextStepsTitle: "What's next",
    nextSteps:
      "As soon as the refund is processed we'll send a confirmation email with the exact completion time.",
    ctaButton: 'Back to shopping',
    questions: 'Questions?',
  },

  returnRefunded: {
    status: 'Refunded',
    badge: '€ Refunded',
    heroGreeting: 'Refunded',
    heroSubtitle:
      'Your refund is on its way to your account. Thanks for trusting MOSE.',
    preheader:
      '{{amount}} has been refunded to your account. Thanks for trusting MOSE.',
    returnNumber: 'Return',
    refundCompleted: 'Refund · Completed',
    refundLabel: 'Refund',
    refundAmount: 'Refunded',
    processed: 'Processing completed',
    methodLabel: 'Method',
    methodBody: 'Payment method: {{method}}',
    description:
      'Depending on your bank it can take 1–3 business days before you actually see the amount appear in your account.',
    ctaButton: 'Back to shopping',
    questions: 'Questions?',
  },

  returnRejected: {
    status: 'Return Rejected',
    badge: '✕ Unable to process',
    heroGreeting: 'Sorry',
    heroSubtitle:
      "We can't process your return. Please get in touch and we'll help you out.",
    preheader:
      "We can't process return {{returnNumber}}. Reach out and we'll help you out.",
    returnNumber: 'Return',
    statusLabel: 'Status',
    statusValue: 'Rejected',
    description:
      "This return doesn't meet our return conditions. If you think that's wrong, let us know — we're happy to review again.",
    reasonTitle: 'Reason',
    phoneHint: 'Prefer to call?',
    ctaButton: 'Contact us',
  },

  abandonedCart: {
    status: 'Cart Reminder',
    badge: '▲ Still Yours',
    heroTitle: "Don't Forget.",
    subtitle:
      "{{customerName}}, we're holding your cart — but not forever.",
    preheader:
      '{{customerName}}, your cart is still waiting for you.',
    description:
      'You left items in your cart. Complete your order before your size sells out.',
    itemsTitle: 'In your cart',
    itemsMeta: 'items',
    quantity: 'Qty',
    total: 'Total',
    moreItems: '+ {{hiddenCount}} more items',
    ctaButton: 'Back to your cart',
    ctaFootnote: 'Your items are waiting.',
    freeShippingTitle: 'Always free shipping',
    freeShipping:
      'On every order, no minimum. Just because it should be.',
  },

  backInStock: {
    status: 'Back in Stock',
    badge: '▲ Restocked',
    heroTitle: 'Back In Stock.',
    subtitle:
      "The item you were waiting for is back. But not for long.",
    preheader:
      '{{productName}} is back in stock — claim it before it goes again.',
    description:
      "Limited stock — move fast so you don't have to hop back on the waitlist.",
    limitedStockTitle: 'Limited stock',
    limitedStock:
      'When it\u2019s gone, it\u2019s gone. No guarantees this restock sticks around.',
    ctaButton: 'View product',
  },

  contact: {
    status: 'Contact Form',
    badge: '▲ Inbox',
    heroTitle: 'New Message.',
    subtitle: 'A new message came in through the contact form.',
    preheader: 'New message from {{customerName}} through the contact form.',
    detailsTitle: 'Sender',
    from: 'From',
    email: 'Email',
    subject: 'Subject',
    message: 'Message',
    replyInfo: 'Reply directly by responding to {{email}}.',
  },

  newReview: {
    status: 'Review',
    badge: '▲ New Review',
    heroTitle: 'New Review.',
    subtitle:
      'A new review is waiting for moderation. Review and approve in the dashboard.',
    preheader:
      'New review ({{rating}}/5) from {{reviewerName}} — ready for moderation.',
    detailsTitle: 'Review details',
    product: 'Product',
    reviewer: 'Reviewer',
    email: 'Email',
    rating: 'Rating',
    reviewTitle: 'Title',
    reviewComment: 'Message',
    approveButton: 'Moderate review',
    info:
      'Reviews are only visible on the product page after you approve them.',
  },

  newsletterWelcome: {
    status: 'Newsletter',
    badge: '▲ Welcome',
    heroTitle: "You're In.",
    heroText:
      "You're on the list. From now on you'll get the latest drops first.",
    preheader:
      'Welcome to MOSE — first to know about drops, restocks and insider-only pieces.',
    promoTitle: 'Your welcome code',
    promoSubtext: 'Use this code for 10% off your first order.',
    promoExpiry: 'Valid until {{date}}',
    whatYouGet:
      "Here's what to expect from us — no spam, only relevant.",
    benefitsTitle: 'What you get',
    benefit1Title: 'New drops',
    benefit1Text: 'First to hear when something new launches.',
    benefit2Title: 'Restock alerts',
    benefit2Text: 'Instant heads-up when popular pieces are back.',
    benefit3Title: 'Exclusive deals',
    benefit3Text:
      "Newsletter-only discounts you won't get anywhere else.",
    discoverCollection: 'Discover the collection',
    receivedBecause:
      'You got this email because you signed up with {{email}}.',
  },

  insiderWelcome: {
    status: 'Insider Club',
    badge: '▲ Insider Club',
    heroTitle: 'Welcome Insider.',
    heroSubtitle:
      "You're in. First to see what's coming, access to drops before everyone else, and insider-only pieces.",
    preheader:
      "Welcome to the MOSE Insider Club — first to see what's coming.",
    tagline: 'Made in Groningen — Dressed Worldwide',
    intro:
      'We approach streetwear differently — thoughtful, sustainable and in limited drops only. As an insider, you get first pick.',
    promoLabel: 'Welcome Drop Code',
    validUntil: 'Valid until {{date}}',
    perksTitle: 'What you get',
    perk1Title: 'Early Access',
    perk1Text: "First to see what's coming, 24h before everyone else.",
    perk2Title: 'Free Shipping',
    perk2Text:
      'Always free shipping within the Netherlands — even on pre-orders.',
    perk3Title: 'Insider Only Drops',
    perk3Text: 'Limited pieces only insiders can claim.',
    perk4Title: 'Behind the Scenes',
    perk4Text:
      'The stories behind MOSE — where material, design and production meet.',
    ctaButton: 'View the collection',
    emailLabel: 'Your insider email',
    questions: 'Questions?',
  },

  insiderCommunity: {
    status: 'Community',
    badge: '▲ Insider Community',
    heroTitle: 'Built Together.',
    subtitle:
      'MOSE grows organically — because insiders share it. Thanks for being part of it.',
    preheader:
      "{{subscriberCount}} insiders are already in. {{daysUntilLaunch}} days until the drop.",
    intro:
      "You're not a customer — you're an insider. That means your feedback shapes what we produce next season.",
    numbers: 'In numbers',
    stat1: '{{subscriberCount}} insiders are already in.',
    stat2: '100% delivered across the Netherlands & Belgium.',
    stat3: 'Over 90% positive reviews on our drops.',
    subscriberLabel: 'Insiders',
    daysLabel: 'Days to drop',
    productsTitle: 'Featured drops',
    productsIntro: "A taste of what's live with insiders right now.",
    viewProduct: 'View →',
    presaleTitle: 'Shop presale now',
    presaleSubtitle: 'The drop is coming',
    presaleText: 'As an insider you get 24h early access.',
    presaleCTA: 'Claim your spot',
    communityTitle: 'From the community',
    testimonial1:
      '"Finally a Dutch brand that doesn\'t sell bullshit. Just clean, solid basics."',
    testimonial2:
      '"Those hoodies look insane. Can\'t wait for the drop."',
    testimonial3:
      '"Love that they produce locally. That makes the difference."',
    joinTitle: 'Join us on social',
    socialInsta: '@mosewear on Instagram',
    ps: 'PS — {{daysUntilLaunch}} days until the official drop.',
  },

  insiderBehindScenes: {
    status: 'Behind the Scenes',
    badge: '▲ Behind the Scenes',
    heroTitle: 'Behind The Scenes.',
    subtitle:
      'Where material, design and production meet. Insiders only.',
    preheader:
      "Behind the scenes at MOSE — the story behind the next drop.",
    intro:
      "Drops aren't made in a week. Here's the story behind what's happening in our atelier right now.",
    processTitle: 'The process',
    process1: 'Research & material selection.',
    process2: 'Pattern cutting & first samples.',
    process3: 'Small batch production in Europe.',
    limitedTitle: 'Limited edition',
    limitedText:
      "Every drop is limited — when it's gone, it's gone. No restocks.",
    followCTA: 'Follow on Instagram',
    followSubtext: 'Daily behind-the-scenes content.',
    closing:
      'Thanks for being part of it. Your support makes it possible.',
  },

  insiderLaunchWeek: {
    status: 'Launch Week',
    badge: '▲ Launch Week',
    heroTitle: 'Launch Week.',
    subtitle: '{{daysUntilLaunch}} days left. Make sure you\u2019re ready.',
    preheader:
      "{{daysUntilLaunch}} days until the drop — here's what you need to know.",
    intro:
      "In {{daysUntilLaunch}} days we open the drop. As an insider you're up front.",
    countdownLabel: 'Days to drop',
    accessLabel: 'Early access',
    whatThisMeansTitle: 'What this means',
    info1: "You get access first — 24 hours early.",
    info2: "Limited stock per piece — when it's gone, it's gone.",
    info3: 'No restocks, no second chances.',
    perksRemainTitle: 'Your insider perks',
    perk1: 'Early access to the drop.',
    perk2: 'Always free shipping in NL.',
    perk3: 'Insider-only pieces.',
    statusTitle: 'Status check',
    statusAlready: 'Already logged in? Then you\u2019re ready to go.',
    statusNotYet:
      "Not yet? Log in today so you don't lose time on drop day.",
    limitedStockTitle: 'Extra limited',
    shopNow: 'Shop the drop',
    closing: 'Be ready on time. Insider love.',
    ps: "PS — turn on notifications so you don't miss the drop.",
  },
}
