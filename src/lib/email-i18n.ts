// Type definitions for translations
export type EmailTranslationKeys = {
  common: {
    mose: string
    size: string
    color: string
    quantity: string
    pieces: string
    viewOrder: string
    contactUs: string
    needHelp: string
  }
  orderConfirmation: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    yourItems: string
    paymentSummary: string
    subtotal: string
    vat: string
    shipping: string
    discount: string
    total: string
    totalPaid: string
    presaleNotice: string
    presaleNoticeText: string
    expected: string
    shippingAddress: string
  }
  preorder: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    expectedDelivery: string
    deliveryInfo: string
    whatHappensNow: string
    step1: string
    step2: string
    step3: string
    step4: string
    yourPreorder: string
    paymentSummary: string
    subtotal: string
    btw: string
    shipping: string
    discount: string
    free: string
    total: string
    shippingAddress: string
    questions: string
    questionsText: string
  }
  shipping: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    trackingInfo: string
    carrier: string
    trackAndTrace: string
    trackOrder: string
    estimatedDelivery: string
    helpfulTips: string
    tip1: string
    tip2: string
    tip3: string
    workingDays: string
  }
  processing: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    description: string
    processingInfo: string
    whatHappensNow: string
    step1: string
    step2: string
    step3: string
    estimatedShipping: string
    withinDays: string
    orderSummary: string
    orderNumber: string
  }
  delivered: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    orderNumber: string
    description: string
    ctaButton: string
    feedback: string
    deliveredOn: string
    hopeEverythingPerfect: string
    yourOrderedItems: string
    shareExperience: string
    whatDoYouThink: string
    writeReview: string
    helpOthers: string
    careTips: string
    tip1: string
    tip2: string
    tip3: string
    completeYourLook: string
    discoverMore: string
    viewShop: string
  }
  cancelled: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    orderNumber: string
    description: string
    reason: string
    refundInfo: string
    ctaButton: string
    orderDetails: string
    amount: string
    refund: string
    refundText: string
    ourApologies: string
    sorryText: string
    discountCode: string
    validUntil: string
    stillInterested: string
    checkFullCollection: string
    questions: string
    questionsText: string
  }
  returnRequested: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    returnNumber: string
    orderNumber: string
    description: string
    itemsTitle: string
    processingTime: string
    returnDetails: string
    reason: string
    returnItems: string
    labelBeingGenerated: string
    labelGeneratedText: string
    nextSteps: string
    step1: string
    step2: string
    step3: string
    viewReturnStatus: string
  }
  returnLabelGenerated: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    returnNumber: string
    description: string
    instructionsTitle: string
    step1: string
    step2: string
    step3: string
    downloadButton: string
    returnTrackingCode: string
    trackReturn: string
    downloadLabel: string
    printLabel: string
    howToReturn: string
    step4: string
    important: string
    importantText: string
  }
  returnApproved: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    returnNumber: string
    description: string
    processingTime: string
    refundProcessing: string
    refundProcessingText: string
    returnItems: string
    refundSummary: string
    refundAmount: string
    labelCostPaid: string
    toBeRefunded: string
    whatHappensNow: string
    step1: string
    step2: string
    step3: string
    viewReturnStatus: string
  }
  returnRefunded: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    returnNumber: string
    description: string
    refundAmount: string
    refundMethod: string
    bankProcessing: string
    ctaButton: string
    refundedAmount: string
    refundedTo: string
    refundSummary: string
    refunded: string
    labelCostPaid: string
    whenWillISeeIt: string
    whenWillISeeItText: string
    shopMore: string
  }
  returnRejected: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    reasonForRejection: string
    questions: string
    questionsText: string
    returnNumber: string
    description: string
    reasonTitle: string
    contactInfo: string
    ctaButton: string
  }
  abandonedCart: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    heroTextPlural: string
    personalMessage: string
    personalMessageYesterday: string
    yourItems: string
    totalAmount: string
    completeOrder: string
    backToCart: string
    testimonialText: string
    testimonialAuthor: string
    whyMose: string
    freeShippingFrom: string
    returnDays: string
    sustainableMaterials: string
    fastDelivery: string
    urgencyText: string
    needHelp: string
    needHelpText: string
    unsubscribeText: string
    unsubscribe: string
    quantity: string
    total: string
    ctaButton: string
    moreItems: string
    freeShipping: string
  }
  backInStock: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    yourWaitIsOver: string
    yourWaitText: string
    interestedIn: string
    viewProduct: string
    orderNow: string
    whyOrderNow: string
    limitedStock: string
    freeShippingFrom: string
    returnDays: string
    madeInGroningen: string
    important: string
    importantText: string
    receivedBecause: string
  }
  newsletterWelcome: {
    subject: string
    title: string
    subtitle: string
    heroText: string
    promoTitle: string
    promoSubtext: string
    promoExpiry: string
    usePromoCode: string
    whatYouGet: string
    benefit1Title: string
    benefit1Text: string
    benefit2Title: string
    benefit2Text: string
    benefit3Title: string
    benefit3Text: string
    benefit4Title: string
    benefit4Text: string
    noSpam: string
    noSpamText: string
    discoverCollection: string
    viewAllItems: string
    madeInGroningen: string
    madeInGroningenText: string
    receivedBecause: string
    unsubscribe: string
  }
  insiderWelcome: {
    title: string
    subtitle: string
    intro: string
    promoTitle: string
    promoSubtext: string
    promoExpiry: string
    usePromoCode: string
    perksTitle: string
    perk1Title: string
    perk1Text: string
    perk2Title: string
    perk2Text: string
    perk3Title: string
    perk3Text: string
    perk4Title: string
    perk4Text: string
    perk5Title: string
    perk5Text: string
    whatNowTitle: string
    shopNow: string
    followUs: string
    onInstagram: string
    ps: string
  }
  insiderCommunity: {
    title: string
    subtitle: string
    intro: string
    numbers: string
    stat1: string
    stat2: string
    stat3: string
    communityTitle: string
    testimonial1: string
    testimonial2: string
    testimonial3: string
    joinTitle: string
    joinText: string
    socialInsta: string
    socialFb: string
    closing: string
    ps: string
  }
  insiderBehindScenes: {
    title: string
    subtitle: string
    intro: string
    processTitle: string
    process1: string
    process2: string
    process3: string
    limitedTitle: string
    limitedText: string
    closing: string
    followCTA: string
    followSubtext: string
    ps: string
  }
  insiderLaunchWeek: {
    title: string
    subtitle: string
    intro: string
    whatThisMeansTitle: string
    info1: string
    info2: string
    info3: string
    perksRemainTitle: string
    perk1: string
    perk2: string
    perk3: string
    statusTitle: string
    statusNotYet: string
    limitedStockTitle: string
    shopNow: string
    closing: string
    ps: string
  }
  contact: {
    subject: string
    title: string
    subtitle: string
    from: string
    email: string
    replyInfo: string
    contactDetails: string
    fromLabel: string
    subjectLabel: string
    message: string
    reply: string
    replyText: string
  }
  contactSubjects: {
    order: string
    product: string
    return: string
    other: string
  }
  newReview: {
    subject: string
    title: string
    subtitle: string
    product: string
    reviewer: string
    email: string
    rating: string
    reviewTitle: string
    reviewComment: string
    approveButton: string
    info: string
  }
  footer: {
    receivedBecause: string
    unsubscribe: string
  }
}

// Dutch translations
const nl: EmailTranslationKeys = {
  common: {
    mose: 'MOSE',
    size: 'Maat',
    color: 'Kleur',
    quantity: 'Aantal',
    pieces: 'stuks',
    viewOrder: 'BEKIJK BESTELLING',
    contactUs: 'NEEM CONTACT OP',
    needHelp: 'Hulp nodig?',
  },
  orderConfirmation: {
    subject: 'Bestelling bevestiging #{{orderNumber}} | MOSE',
    title: 'BEDANKT!',
    subtitle: 'Bestelling geplaatst',
    heroText: 'Hey {{name}}, we gaan voor je aan de slag',
    yourItems: 'Jouw items',
    paymentSummary: 'Betaaloverzicht',
    subtotal: 'Subtotaal (excl. BTW)',
    vat: 'BTW (21%)',
    shipping: 'Verzendkosten',
    discount: 'Korting',
    total: 'Totaal',
    totalPaid: 'TOTAAL BETAALD',
    presaleNotice: 'Let op: Presale items',
    presaleNoticeText: 'Je bestelling bevat presale items die verzonden worden zodra ze binnen zijn (verwacht: {{date}}). Je ontvangt een verzendbevestiging zodra alles klaar is.',
    expected: 'Verwacht',
    shippingAddress: 'Verzendadres',
  },
  preorder: {
    subject: 'Pre-order bevestigd #{{orderNumber}} | MOSE',
    title: 'PRE-ORDER BEVESTIGD!',
    subtitle: 'Exclusieve presale',
    heroText: 'Hey {{name}}, bedankt voor je pre-order! 🙌',
    expectedDelivery: 'VERWACHTE LEVERING',
    deliveryInfo: 'We informeren je zodra je bestelling verzonden wordt.',
    whatHappensNow: 'Wat gebeurt er nu?',
    step1: 'Je betaling is verwerkt ✓',
    step2: 'We reserveren je items',
    step3: 'Zodra binnen → direct verzonden',
    step4: 'Track & trace in je inbox',
    yourPreorder: 'Jouw pre-order',
    paymentSummary: 'BETAALOVERZICHT',
    subtotal: 'Subtotaal (excl. BTW)',
    btw: 'BTW (21%)',
    shipping: 'Verzendkosten',
    discount: 'Korting',
    free: 'Gratis',
    total: 'Totaal',
    shippingAddress: 'VERZENDADRES',
    questions: 'Vragen?',
    questionsText: 'We helpen je graag!',
  },
  shipping: {
    subject: 'Je bestelling is verzonden #{{orderNumber}} | MOSE',
    title: 'ONDERWEG!',
    subtitle: 'Je pakket is verzonden',
    heroText: 'Hey {{name}}, je bestelling komt eraan',
    trackingInfo: 'Tracking informatie',
    carrier: '{{carrier}}',
    trackAndTrace: 'Track & trace code',
    trackOrder: 'VOLG JE BESTELLING',
    estimatedDelivery: 'Verwachte levering',
    helpfulTips: 'Handige tips',
    tip1: 'Zorg dat iemand thuis is om het pakket in ontvangst te nemen',
    tip2: 'Controleer je brievenbus voor een bezorgkaartje',
    tip3: 'Je ontvangt een melding zodra het in de buurt is',
    workingDays: '2-3 werkdagen',
  },
  processing: {
    subject: 'Je bestelling wordt voorbereid #{{orderNumber}} | MOSE',
    title: 'IN BEHANDELING',
    subtitle: 'We pakken je order in',
    heroText: 'Hey {{name}}, we zijn voor je aan de slag!',
    description: 'Je bestelling wordt momenteel verwerkt en zorgvuldig ingepakt door ons team.',
    processingInfo: 'We zijn je order aan het voorbereiden. Je ontvangt een verzendbevestiging zodra je pakket onderweg is.',
    whatHappensNow: 'Wat gebeurt er nu?',
    step1: 'Je betaling is ontvangen en bevestigd',
    step2: 'We pakken je items zorgvuldig in',
    step3: 'Je ontvangt een tracking code zodra we verzenden',
    estimatedShipping: 'Verwachte verzending',
    withinDays: 'Binnen 1-2 werkdagen',
    orderSummary: 'Order overzicht',
    orderNumber: 'Order nummer',
  },
  delivered: {
    subject: 'Je pakket is bezorgd #{{orderNumber}} | MOSE',
    title: 'BEZORGD!',
    subtitle: 'Je pakket is aangekomen',
    heroText: 'Hey {{name}}, geniet van je nieuwe items!',
    orderNumber: 'Order nummer',
    description: 'We hopen dat alles in perfecte staat is aangekomen!',
    ctaButton: 'BEKIJK SHOP',
    feedback: 'Tevreden met je bestelling? Help andere klanten door een review te schrijven!',
    deliveredOn: 'Afgeleverd op {{date}}',
    hopeEverythingPerfect: 'We hopen dat alles in perfecte staat is aangekomen!',
    yourOrderedItems: 'Je bestelde items',
    shareExperience: 'Deel je ervaring',
    whatDoYouThink: 'Wat vind je van je bestelling?',
    writeReview: 'SCHRIJF EEN REVIEW',
    helpOthers: 'Help andere klanten met hun keuze',
    careTips: 'Verzorgingstips',
    tip1: 'Was je MOSE items op 30°C voor het beste resultaat',
    tip2: 'Hang je kledingstukken te drogen (niet in de droger)',
    tip3: 'Lees altijd het waslabel voor specifieke instructies',
    completeYourLook: 'Maak je look compleet',
    discoverMore: 'Ontdek meer items uit onze collectie',
    viewShop: 'BEKIJK SHOP',
  },
  cancelled: {
    subject: 'Order geannuleerd #{{orderNumber}} | MOSE',
    title: 'GEANNULEERD',
    subtitle: 'Order geannuleerd',
    heroText: 'Hey {{name}}, je order is geannuleerd',
    orderNumber: 'Order nummer',
    description: 'Je order is geannuleerd. Je betaling wordt automatisch teruggestort.',
    reason: 'Reden',
    refundInfo: 'Je betaling wordt automatisch teruggestort naar je originele betaalmethode binnen 3-5 werkdagen.',
    ctaButton: 'BEKIJK SHOP',
    orderDetails: 'Order details',
    amount: 'Bedrag',
    refund: 'Terugbetaling',
    refundText: 'Je betaling wordt automatisch teruggestort naar je originele betaalmethode binnen 3-5 werkdagen. Afhankelijk van je bank kan het iets langer duren voordat het bedrag zichtbaar is op je rekening.',
    ourApologies: 'Onze excuses',
    sorryText: 'Als excuus bieden we je 10% korting op je volgende bestelling:',
    discountCode: 'SORRY10',
    validUntil: 'Geldig tot 1 maand na deze email',
    stillInterested: 'Nog steeds interesse?',
    checkFullCollection: 'Bekijk onze volledige collectie en vind je perfecte MOSE item',
    questions: 'Vragen?',
    questionsText: 'Heb je vragen over je annulering? Neem gerust contact met ons op. We helpen je graag!',
  },
  returnRequested: {
    subject: 'Retourverzoek ontvangen #{{returnNumber}} | MOSE',
    title: 'RETOUR AANGEVRAAGD',
    subtitle: 'Je verzoek is ontvangen',
    heroText: 'Hey {{name}}, we hebben je retourverzoek ontvangen',
    returnNumber: 'Retour nummer',
    orderNumber: 'Order nummer',
    description: 'We hebben je retourverzoek ontvangen en gaan deze zo snel mogelijk verwerken. Je ontvangt een email zodra je retourlabel klaar is.',
    itemsTitle: 'Geretourneerde items',
    processingTime: 'We verwerken je retourverzoek binnen 1-2 werkdagen. Je ontvangt dan een retourlabel per email.',
    returnDetails: 'Retour details',
    reason: 'Reden',
    returnItems: 'Retour items',
    labelBeingGenerated: 'Je retourlabel wordt nu gegenereerd',
    labelGeneratedText: 'Je betaling voor het retourlabel is succesvol ontvangen! We genereren nu je retourlabel. Je ontvangt een email zodra het label klaar is om te downloaden.',
    nextSteps: 'Volgende stappen',
    step1: 'Download het retourlabel zodra je het ontvangt',
    step2: 'Plak het label op je pakket en stuur het terug',
    step3: 'Na ontvangst beoordelen we de kleding en krijg je een bericht',
    viewReturnStatus: 'BEKIJK RETOUR STATUS',
  },
  returnLabelGenerated: {
    subject: 'Je retourlabel is klaar #{{returnNumber}} | MOSE',
    title: 'RETOURLABEL BESCHIKBAAR!',
    subtitle: 'Je kunt nu retourneren',
    heroText: 'Hey {{name}}, je retourlabel is klaar',
    returnNumber: 'Retour nummer',
    description: 'Je retourlabel is klaar om te downloaden. Print het label en stuur je pakket terug.',
    instructionsTitle: 'Hoe retourneren?',
    step1: 'Download en print het retourlabel',
    step2: 'Pak je items in de originele verpakking',
    step3: 'Breng je pakket naar een DHL punt',
    downloadButton: 'DOWNLOAD RETOURLABEL',
    returnTrackingCode: 'Retour tracking code',
    trackReturn: 'VOLG JE RETOUR',
    downloadLabel: 'DOWNLOAD RETOURLABEL',
    printLabel: 'Print dit label en plak het op je pakket',
    howToReturn: 'Hoe retourneren?',
    step4: 'Breng je pakket naar een DHL punt',
    important: 'Let op:',
    importantText: 'Zorg dat je items ongedragen zijn en de labels er nog aan zitten. Na ontvangst krijg je binnen 5-7 werkdagen je geld terug.',
  },
  returnApproved: {
    subject: 'Je retour is goedgekeurd - Terugbetaling verwerkt #{{returnNumber}} | MOSE',
    title: 'JE RETOUR IS GOEDGEKEURD!',
    subtitle: 'Je kleding is beoordeeld',
    heroText: 'Hey {{name}}, we hebben je retour ontvangen en goedgekeurd',
    returnNumber: 'Retour nummer',
    description: 'We hebben je geretourneerde items ontvangen en goedgekeurd. Je terugbetaling wordt nu verwerkt.',
    processingTime: 'Je terugbetaling wordt binnen 3-5 werkdagen verwerkt en teruggestort naar je originele betaalmethode.',
    refundProcessing: 'Je terugbetaling wordt verwerkt',
    refundProcessingText: 'We hebben je geretourneerde kleding ontvangen en gecontroleerd. Alles ziet er goed uit! Je terugbetaling wordt nu verwerkt en je ontvangt het geld binnen 3-5 werkdagen op je rekening.',
    returnItems: 'Retour items',
    refundSummary: 'Terugbetaling overzicht',
    refundAmount: 'Terug te betalen (items)',
    labelCostPaid: 'Retourlabel kosten (al betaald)',
    toBeRefunded: 'TERUG TE BETALEN',
    whatHappensNow: 'Wat gebeurt er nu?',
    step1: 'Je terugbetaling wordt verwerkt',
    step2: 'Je ontvangt €{{amount}} teruggestort naar je originele betaalmethode',
    step3: 'Het bedrag is binnen 3-5 werkdagen zichtbaar op je rekening',
    viewReturnStatus: 'BEKIJK RETOUR STATUS',
  },
  returnRefunded: {
    subject: 'Terugbetaling voltooid #{{returnNumber}} | MOSE',
    title: 'TERUGBETALING VOLTOOID!',
    subtitle: 'Je geld is teruggestort',
    heroText: 'Hey {{name}}, je retour is verwerkt',
    returnNumber: 'Retour nummer',
    description: 'Je terugbetaling is voltooid en het bedrag is teruggestort naar je originele betaalmethode.',
    refundAmount: 'Teruggestort bedrag',
    refundMethod: 'Teruggestort naar je originele betaalmethode',
    bankProcessing: 'Afhankelijk van je bank kan het 3-5 werkdagen duren voordat het bedrag zichtbaar is op je rekening.',
    ctaButton: 'VERDER SHOPPEN',
    refundedAmount: '€{{amount}} teruggestort',
    refundedTo: 'Het bedrag is teruggestort naar je originele betaalmethode',
    refundSummary: 'Terugbetaling overzicht',
    refunded: 'TERUGGESTORT',
    labelCostPaid: 'Retourlabel kosten (al betaald)',
    whenWillISeeIt: 'Wanneer zie je het bedrag?',
    whenWillISeeItText: 'Het bedrag is teruggestort naar je originele betaalmethode. Afhankelijk van je bank kan het 3-5 werkdagen duren voordat het bedrag zichtbaar is op je rekening.',
    shopMore: 'VERDER SHOPPEN',
  },
  returnRejected: {
    subject: 'Retourverzoek afgewezen #{{returnNumber}} | MOSE',
    title: 'RETOUR AFGEWEZEN',
    subtitle: 'Retourverzoek niet goedgekeurd',
    heroText: 'Hey {{name}}, je retourverzoek kon niet worden goedgekeurd',
    reasonForRejection: 'Reden van afwijzing',
    questions: 'Vragen?',
    questionsText: 'Heb je vragen over deze afwijzing? Neem gerust contact met ons op. We helpen je graag verder!',
    returnNumber: 'Retourn human',
    description: 'Je retourverzoek is helaas afgewezen',
    reasonTitle: 'Reden voor afwijzing',
    contactInfo: 'Neem contact met ons op als je vragen hebt',
    ctaButton: 'VERDER SHOPPEN',
  },
  abandonedCart: {
    subject: '{{name}}, je MOSE items wachten nog op je!',
    title: 'NIET VERGETEN?',
    subtitle: 'Je winkelwagen wacht op je',
    heroText: 'Hey {{name}}, je hebt nog {{count}} item in je winkelwagen!',
    heroTextPlural: 'Hey {{name}}, je hebt nog {{count}} items in je winkelwagen!',
    personalMessage: 'We zagen dat je vandaag aan het shoppen was bij MOSE, maar je bestelling nog niet hebt afgerond. Geen zorgen, we hebben je items nog voor je gereserveerd!',
    personalMessageYesterday: 'We zagen dat je gisteren aan het shoppen was bij MOSE, maar je bestelling nog niet hebt afgerond. Geen zorgen, we hebben je items nog voor je gereserveerd!',
    yourItems: 'Jouw items',
    totalAmount: 'Totaalbedrag (incl. BTW)',
    completeOrder: 'MAAK BESTELLING AF',
    backToCart: 'Klik hier om terug te gaan naar je winkelwagen',
    testimonialText: 'Beste aankoop ooit! De kwaliteit is geweldig en het zit super comfortabel. Krijg constant complimenten!',
    testimonialAuthor: '- Lisa, Amsterdam',
    whyMose: 'Waarom MOSE?',
    freeShippingFrom: 'Gratis verzending vanaf €{{amount}}',
    returnDays: '{{days}} dagen retourrecht',
    sustainableMaterials: 'Duurzame & hoogwaardige materialen',
    fastDelivery: 'Snelle levering (1-2 werkdagen)',
    urgencyText: 'Je items blijven nog {{hours}} uur gereserveerd. Daarna kunnen we helaas niet garanderen dat ze nog op voorraad zijn.',
    needHelp: 'Hulp nodig?',
    needHelpText: 'Twijfel je nog of heb je vragen? Ons team staat voor je klaar!',
    unsubscribeText: 'Deze email is verzonden omdat je items in je winkelwagen hebt achtergelaten. Wil je geen herinneringen meer ontvangen?',
    unsubscribe: 'Klik hier',
    quantity: 'Aantal',
    total: 'Totaal',
    ctaButton: 'MAAK BESTELLING AF',
    moreItems: '+ {{count}} meer items',
    freeShipping: 'Gratis verzending vanaf €150',
  },
  backInStock: {
    subject: '{{productName}} is weer op voorraad! | MOSE',
    title: 'WEER OP VOORRAAD!',
    subtitle: 'Je favoriete product',
    heroText: 'Goed nieuws! {{productName}} is weer beschikbaar',
    yourWaitIsOver: 'Je wacht is voorbij',
    yourWaitText: 'We hebben goed nieuws! Het product waar je op wachtte is weer op voorraad.',
    interestedIn: 'Je hebt aangegeven dat je geïnteresseerd bent in: {{variant}}',
    viewProduct: 'BEKIJK PRODUCT',
    orderNow: 'Bestel nu voordat het weer uitverkocht is',
    whyOrderNow: 'Waarom nu bestellen?',
    limitedStock: 'Beperkte voorraad. Dit product is populair!',
    freeShippingFrom: 'Gratis verzending vanaf €{{amount}}',
    returnDays: '{{days}} dagen retourrecht',
    madeInGroningen: 'Lokaal gemaakt in Groningen',
    important: 'Let op:',
    importantText: 'Deze notificatie is éénmalig. Bestel nu om zeker te zijn van je maat en kleur!',
    receivedBecause: 'Je ontving deze email omdat je aangaf geïnteresseerd te zijn in dit product toen het uitverkocht was.',
  },
  newsletterWelcome: {
    subject: 'Welkom bij de MOSE pack!',
    title: 'WELKOM BIJ DE PACK!',
    subtitle: 'Je bent ingeschreven',
    heroText: 'Je ontvangt nu als eerste updates over drops, restocks en het atelier',
    promoTitle: 'JE 10% KORTINGSCODE',
    promoSubtext: 'Gebruik deze code bij je eerste bestelling voor {{discount}} korting',
    promoExpiry: 'Geldig tot {{date}}',
    usePromoCode: 'Vul je code in bij checkout',
    whatYouGet: 'Wat krijg je van ons?',
    benefit1Title: 'Nieuwe drops',
    benefit1Text: 'Als eerste weten wanneer nieuwe items live gaan',
    benefit2Title: 'Restocks',
    benefit2Text: 'Notificaties wanneer uitverkochte items terug zijn',
    benefit3Title: 'Behind the scenes',
    benefit3Text: 'Verhalen uit ons atelier in Groningen',
    benefit4Title: 'Exclusieve aanbiedingen',
    benefit4Text: 'Kortingen alleen voor subscribers',
    noSpam: 'Geen spam, alleen MOSE',
    noSpamText: 'We sturen alleen emails als we écht iets belangrijks te melden hebben. Geen dagelijkse spam, alleen waardevolle updates.',
    discoverCollection: 'ONTDEK ONZE COLLECTIE',
    viewAllItems: 'Bekijk alle beschikbare items',
    madeInGroningen: 'Gemaakt in Groningen',
    madeInGroningenText: 'Lokaal gemaakt. Kwaliteit die blijft. Geen poespas, wel karakter.',
    receivedBecause: 'Je ontving deze email omdat je je hebt ingeschreven voor de MOSE nieuwsbrief.',
    unsubscribe: 'Uitschrijven',
  },
  insiderWelcome: {
    title: 'WELKOM BIJ DE INSIDERS',
    subtitle: 'Je bent binnen. Hier is wat dat betekent.',
    intro: 'Bedankt dat je deel uitmaakt van de inner circle. Je bent nu officieel een MOSE insider. Je behoort tot de eersten die weten wanneer nieuwe drops lanceren, voordat het uitverkocht is.',
    promoTitle: 'JE 10% KORTINGSCODE',
    promoSubtext: 'Gebruik deze code bij je eerste bestelling voor {{discount}} korting',
    promoExpiry: 'Geldig tot {{date}}',
    usePromoCode: 'Vul je code in bij checkout',
    perksTitle: 'Wat je krijgt als insider:',
    perk1Title: 'Gemaakt in Groningen',
    perk1Text: 'Lokaal ontworpen en gemaakt',
    perk2Title: 'Gratis verzending',
    perk2Text: 'Op je eerste order',
    perk3Title: 'First dibs op drops',
    perk3Text: 'Check als eerste nieuwe releases',
    perk4Title: 'Behind-the-scenes updates',
    perk4Text: 'Exclusieve content voor insiders',
    perk5Title: 'Insider-only releases',
    perk5Text: 'Speciale drops alleen voor jou',
    whatNowTitle: 'Wat nu?',
    shopNow: 'Shop nu',
    followUs: 'Volg ons op Instagram',
    onInstagram: 'voor behind-the-scenes content',
    ps: 'P.S. Houd je inbox in de gaten. We sturen je meer insider content voor de launch.',
  },
  insiderCommunity: {
    title: 'JE BENT NIET DE ENIGE',
    subtitle: 'Een blik achter de schermen van onze community',
    intro: 'Er zijn nu honderden insiders die op de launch wachten. Niet zomaar klanten, maar mensen die snappen waar MOSE voor staat.',
    numbers: 'De cijfers:',
    stat1: '{{count}}+ insiders op de lijst',
    stat2: 'Meest populair: Hoodies (al 40% van voorraad gereserveerd)',
    stat3: 'Top 3 landen: Nederland, België, Duitsland',
    communityTitle: 'Wat de community zegt:',
    testimonial1: '"Eindelijk een Nederlands merk dat geen bullshit verkoopt. Just clean, solid basics."',
    testimonial2: '"Die hoodies zien er insane uit. Kan niet wachten tot 2 maart."',
    testimonial3: '"Love dat ze lokaal produceren. Dat maakt het verschil."',
    joinTitle: 'Word deel van de community',
    joinText: 'Volg ons op Instagram en Facebook voor daily updates, drops en insider content:',
    socialInsta: 'Instagram: @mosewearcom',
    socialFb: 'Facebook: @mosewearcom',
    closing: 'We bouwen dit samen. Tot de launch.',
    ps: 'P.S. Nog {{days}} dagen tot lancering. Ben je er klaar voor?',
  },
  insiderBehindScenes: {
    title: 'HOE WE DIT MAKEN',
    subtitle: 'Een kijkje in het proces',
    intro: 'Je vroeg erom. Hier is wat er gebeurt achter de schermen van MOSE: van idee tot product.',
    processTitle: 'Het proces:',
    process1: 'Lokaal ontworpen in Groningen. Alles start hier.',
    process2: 'Gemaakt met premium materialen. Geen goedkope troep.',
    process3: 'Limited runs. Als het op is, is het op.',
    limitedTitle: 'Waarom limited edition?',
    limitedText: 'We maken geen massa-productie. Elke drop is gelimiteerd. Dat betekent uniek, exclusief en niet voor iedereen. Vroege toegang zorgt ervoor dat jij niet misloopt.',
    closing: 'Dit is wat je steunt als je bij MOSE koopt. Geen corporate bullshit. Just honest design, lokaal gemaakt.',
    followCTA: 'Volg het proces',
    followSubtext: '@mosewearcom voor real-time updates',
    ps: 'P.S. Launch is over {{days}} dagen. Je hebt vroege toegang. Gebruik het.',
  },
  insiderLaunchWeek: {
    title: 'LANCERING OVER {{days}} DAGEN',
    subtitle: 'Dit is het. {{days}} dagen tot launch.',
    intro: '2 maart. Dat is over {{days}} dagen. Voor jou als insider betekent dat 24 uur vroege toegang voordat de rest kan shoppen.',
    whatThisMeansTitle: 'Wat dit betekent:',
    info1: 'Jij kunt al vanaf 1 maart 00:00 uur shoppen',
    info2: 'De rest van de wereld wacht tot 2 maart',
    info3: 'Limited items verdwijnen snel. Vroege toegang is key',
    perksRemainTitle: 'Je insider perks blijven:',
    perk1: '24u vroege toegang (1 maart om 00:00)',
    perk2: 'Gemaakt in Groningen',
    perk3: 'Gratis verzending op je eerste order',
    statusTitle: 'Check je status:',
    statusNotYet: '✓ Als je nog niet hebt geshopt: wacht tot 1 maart 00:00 voor vroege toegang',
    limitedStockTitle: 'Items met beperkte voorraad:',
    shopNow: 'Shop nu',
    closing: 'Dit is het moment. {{days}} dagen. Ben je klaar?',
    ps: 'P.S. Laatste reminder: 1 maart om 00:00 gaan de deuren open voor insiders. Stel je alarm.',
  },
  contact: {
    subject: 'Contactformulier: {{subject}} - {{name}}',
    title: 'NIEUW BERICHT',
    subtitle: 'Contactformulier',
    from: 'Van {{name}}',
    email: 'E-mail',
    replyInfo: 'Je kunt direct antwoorden op deze email',
    contactDetails: 'Contactgegevens',
    fromLabel: 'Van',
    subjectLabel: 'Onderwerp',
    message: 'Bericht',
    reply: 'Antwoord:',
    replyText: 'Je kunt direct antwoorden op deze email om contact op te nemen met {{name}}.',
  },
  contactSubjects: {
    order: 'Vraag over bestelling',
    product: 'Vraag over product',
    return: 'Retour of ruil',
    other: 'Iets anders',
  },
  newReview: {
    subject: 'Nieuwe review wacht op goedkeuring',
    title: 'NIEUWE REVIEW',
    subtitle: 'Er is een nieuwe review ingediend die op goedkeuring wacht',
    product: 'Product',
    reviewer: 'Reviewer',
    email: 'E-mail',
    rating: 'Beoordeling',
    reviewTitle: 'Titel',
    reviewComment: 'Review',
    approveButton: 'Bekijk en goedkeur review',
    info: 'Deze review is automatisch opgeslagen en wacht op jouw goedkeuring voordat deze live gaat op de website.',
  },
  footer: {
    receivedBecause: 'Je ontving deze email omdat',
    unsubscribe: 'Uitschrijven',
  },
}

// English translations
const en: EmailTranslationKeys = {
  common: {
    mose: 'MOSE',
    size: 'Size',
    color: 'Color',
    quantity: 'Quantity',
    pieces: 'pieces',
    viewOrder: 'VIEW ORDER',
    contactUs: 'CONTACT US',
    needHelp: 'Need help?',
  },
  orderConfirmation: {
    subject: 'Order confirmation #{{orderNumber}} | MOSE',
    title: 'THANK YOU!',
    subtitle: 'Order Placed',
    heroText: 'Hey {{name}}, we are getting to work for you',
    yourItems: 'Your Items',
    paymentSummary: 'Payment Summary',
    subtotal: 'Subtotal (excl. VAT)',
    vat: 'VAT (21%)',
    shipping: 'Shipping',
    discount: 'Discount',
    total: 'Total',
    totalPaid: 'TOTAL PAID',
    presaleNotice: 'Note: Presale items',
    presaleNoticeText: 'Your order contains presale items that will be shipped when they arrive (expected: {{date}}). You will receive a shipping confirmation when everything is ready.',
    expected: 'Expected',
    shippingAddress: 'Shipping address',
  },
  preorder: {
    subject: 'Pre-order confirmed #{{orderNumber}} | MOSE',
    title: 'PRE-ORDER CONFIRMED!',
    subtitle: 'Exclusive Presale',
    heroText: 'Hey {{name}}, thank you for your pre-order! 🙌',
    expectedDelivery: 'EXPECTED DELIVERY',
    deliveryInfo: 'We will notify you when your order ships.',
    whatHappensNow: 'What happens now?',
    step1: 'Your payment has been processed ✓',
    step2: 'We reserve your items',
    step3: 'When arrived → shipped immediately',
    step4: 'Track & trace in your inbox',
    yourPreorder: 'Your pre-order',
    paymentSummary: 'PAYMENT SUMMARY',
    subtotal: 'Subtotal (excl. VAT)',
    btw: 'VAT (21%)',
    shipping: 'Shipping',
    discount: 'Discount',
    free: 'Free',
    total: 'Total',
    shippingAddress: 'SHIPPING ADDRESS',
    questions: 'Questions?',
    questionsText: 'We are happy to help!',
  },
  shipping: {
    subject: 'Your order has been shipped #{{orderNumber}} | MOSE',
    title: 'ON THE WAY!',
    subtitle: 'Your Package Has Been Shipped',
    heroText: 'Hey {{name}}, your order is on its way',
    trackingInfo: 'Tracking Information',
    carrier: '{{carrier}}',
    trackAndTrace: 'Track & Trace Code',
    trackOrder: 'TRACK YOUR ORDER',
    estimatedDelivery: 'Estimated Delivery',
    helpfulTips: 'Helpful Tips',
    tip1: 'Make sure someone is home to receive the package',
    tip2: 'Check your mailbox for a delivery card',
    tip3: 'You will receive a notification when it is nearby',
    workingDays: '2-3 business days',
  },
  processing: {
    subject: 'Your order is being prepared #{{orderNumber}} | MOSE',
    title: 'PROCESSING',
    subtitle: 'We Are Packing Your Order',
    heroText: 'Hey {{name}}, we are working on your order!',
    description: 'Your order is currently being processed and carefully packed by our team.',
    processingInfo: 'We are preparing your order. You will receive a shipping confirmation as soon as your package is on its way.',
    whatHappensNow: 'What Happens Now?',
    step1: 'Your payment has been received and confirmed',
    step2: 'We are carefully packing your items',
    step3: 'You will receive a tracking code as soon as we ship',
    estimatedShipping: 'Estimated Shipping',
    withinDays: 'Within 1-2 business days',
    orderSummary: 'Order Summary',
    orderNumber: 'Order number',
  },
  delivered: {
    subject: 'Your package has been delivered #{{orderNumber}} | MOSE',
    title: 'DELIVERED!',
    subtitle: 'Your Package Has Arrived',
    heroText: 'Hey {{name}}, enjoy your new items!',
    orderNumber: 'Order number',
    description: 'We hope everything arrived in perfect condition!',
    ctaButton: 'VIEW SHOP',
    feedback: 'Happy with your order? Help other customers by writing a review!',
    deliveredOn: 'Delivered on {{date}}',
    hopeEverythingPerfect: 'We hope everything arrived in perfect condition!',
    yourOrderedItems: 'Your Ordered Items',
    shareExperience: 'Share Your Experience',
    whatDoYouThink: 'What do you think of your order?',
    writeReview: 'WRITE A REVIEW',
    helpOthers: 'Help other customers with their choice',
    careTips: 'Care Tips',
    tip1: 'Wash your MOSE items at 30°C for best results',
    tip2: 'Hang your garments to dry (do not tumble dry)',
    tip3: 'Always read the care label for specific instructions',
    completeYourLook: 'Complete Your Look',
    discoverMore: 'Discover more items from our collection',
    viewShop: 'VIEW SHOP',
  },
  cancelled: {
    subject: 'Order cancelled #{{orderNumber}} | MOSE',
    title: 'CANCELLED',
    subtitle: 'Order cancelled',
    heroText: 'Hey {{name}}, your order has been cancelled',
    orderNumber: 'Order number',
    description: 'Your order has been cancelled. Your payment will be refunded automatically.',
    reason: 'Reason',
    refundInfo: 'Your payment will be automatically refunded to your original payment method within 3-5 business days.',
    ctaButton: 'VIEW SHOP',
    orderDetails: 'Order details',
    amount: 'Amount',
    refund: 'Refund',
    refundText: 'Your payment will be automatically refunded to your original payment method within 3-5 business days. Depending on your bank, it may take a bit longer before the amount is visible in your account.',
    ourApologies: 'Our apologies',
    sorryText: 'As an apology, we offer you 10% discount on your next order:',
    discountCode: 'SORRY10',
    validUntil: 'Valid until 1 month after this email',
    stillInterested: 'Still interested?',
    checkFullCollection: 'Check out our full collection and find your perfect MOSE item',
    questions: 'Questions?',
    questionsText: 'Do you have questions about your cancellation? Feel free to contact us. We are happy to help!',
  },
  returnRequested: {
    subject: 'Return request received #{{returnNumber}} | MOSE',
    title: 'RETURN REQUESTED',
    subtitle: 'Your request has been received',
    heroText: 'Hey {{name}}, we have received your return request',
    returnNumber: 'Return number',
    orderNumber: 'Order number',
    description: 'We have received your return request and will process it as soon as possible. You will receive an email as soon as your return label is ready.',
    itemsTitle: 'Returned items',
    processingTime: 'We will process your return request within 1-2 business days. You will then receive a return label by email.',
    returnDetails: 'Return details',
    reason: 'Reason',
    returnItems: 'Return items',
    labelBeingGenerated: 'Your return label is now being generated',
    labelGeneratedText: 'Your payment for the return label has been successfully received! We are now generating your return label. You will receive an email as soon as the label is ready to download.',
    nextSteps: 'Next steps',
    step1: 'Download the return label as soon as you receive it',
    step2: 'Attach the label to your package and send it back',
    step3: 'After receipt, we will assess the clothing and you will receive a message',
    viewReturnStatus: 'VIEW RETURN STATUS',
  },
  returnLabelGenerated: {
    subject: 'Your return label is ready #{{returnNumber}} | MOSE',
    title: 'RETURN LABEL AVAILABLE!',
    subtitle: 'You can now return',
    heroText: 'Hey {{name}}, your return label is ready',
    returnNumber: 'Return number',
    description: 'Your return label is ready to download. Print the label and send your package back.',
    instructionsTitle: 'How to return?',
    step1: 'Download and print the return label',
    step2: 'Pack your items in the original packaging',
    step3: 'Bring your package to a DHL point',
    downloadButton: 'DOWNLOAD RETURN LABEL',
    returnTrackingCode: 'Return tracking code',
    trackReturn: 'TRACK YOUR RETURN',
    downloadLabel: 'DOWNLOAD RETURN LABEL',
    printLabel: 'Print this label and attach it to your package',
    howToReturn: 'How to return?',
    step4: 'Bring your package to a DHL point',
    important: 'Important:',
    importantText: 'Make sure your items are unworn and the tags are still attached. After receipt, you will receive your money back within 5-7 business days.',
  },
  returnApproved: {
    subject: 'Your return has been approved - Refund processed #{{returnNumber}} | MOSE',
    title: 'YOUR RETURN IS APPROVED!',
    subtitle: 'Your clothing has been assessed',
    heroText: 'Hey {{name}}, we have received and approved your return',
    returnNumber: 'Return number',
    description: 'We have received and approved your returned items. Your refund is now being processed.',
    processingTime: 'Your refund will be processed within 3-5 business days and refunded to your original payment method.',
    refundProcessing: 'Your refund is being processed',
    refundProcessingText: 'We have received and checked your returned clothing. Everything looks good! Your refund is now being processed and you will receive the money within 3-5 business days in your account.',
    returnItems: 'Return items',
    refundSummary: 'Refund summary',
    refundAmount: 'To be refunded (items)',
    labelCostPaid: 'Return label costs (already paid)',
    toBeRefunded: 'TO BE REFUNDED',
    whatHappensNow: 'What happens now?',
    step1: 'Your refund is being processed',
    step2: 'You will receive €{{amount}} refunded to your original payment method',
    step3: 'The amount will be visible in your account within 3-5 business days',
    viewReturnStatus: 'VIEW RETURN STATUS',
  },
  returnRefunded: {
    subject: 'Refund completed #{{returnNumber}} | MOSE',
    title: 'REFUND COMPLETED!',
    subtitle: 'Your money has been refunded',
    heroText: 'Hey {{name}}, your return has been processed',
    returnNumber: 'Return number',
    description: 'Your refund has been completed and the amount has been refunded to your original payment method.',
    refundAmount: 'Refunded amount',
    refundMethod: 'Refunded to your original payment method',
    bankProcessing: 'Depending on your bank, it can take 3-5 business days before the amount is visible in your account.',
    ctaButton: 'SHOP MORE',
    refundedAmount: '€{{amount}} refunded',
    refundedTo: 'The amount has been refunded to your original payment method',
    refundSummary: 'Refund summary',
    refunded: 'REFUNDED',
    labelCostPaid: 'Return label costs (already paid)',
    whenWillISeeIt: 'When will I see the amount?',
    whenWillISeeItText: 'The amount has been refunded to your original payment method. Depending on your bank, it can take 3-5 business days before the amount is visible in your account.',
    shopMore: 'SHOP MORE',
  },
  returnRejected: {
    subject: 'Return request rejected #{{returnNumber}} | MOSE',
    title: 'RETURN REJECTED',
    subtitle: 'Return Request Not Approved',
    heroText: 'Hey {{name}}, your return request could not be approved',
    reasonForRejection: 'Reason For Rejection',
    questions: 'Questions?',
    questionsText: 'Do you have questions about this rejection? Feel free to contact us. We are happy to help!',
    returnNumber: 'Return number',
    description: 'Your return request has unfortunately been rejected',
    reasonTitle: 'Reason for rejection',
    contactInfo: 'Contact us if you have any questions',
    ctaButton: 'SHOP MORE',
  },
  abandonedCart: {
    subject: '{{name}}, your MOSE items are still waiting for you!',
    title: 'FORGOT SOMETHING?',
    subtitle: 'Your Cart Is Waiting For You',
    heroText: 'Hey {{name}}, you still have {{count}} item in your cart!',
    heroTextPlural: 'Hey {{name}}, you still have {{count}} items in your cart!',
    personalMessage: 'We saw that you were shopping at MOSE today, but you have not yet completed your order. No worries, we still have your items reserved for you!',
    personalMessageYesterday: 'We saw that you were shopping at MOSE yesterday, but you have not yet completed your order. No worries, we still have your items reserved for you!',
    yourItems: 'Your Items',
    totalAmount: 'Total amount (incl. VAT)',
    completeOrder: 'COMPLETE ORDER',
    backToCart: 'Click here to go back to your cart',
    testimonialText: 'Best purchase ever! The quality is amazing and it fits super comfortably. I get constant compliments!',
    testimonialAuthor: '- Lisa, Amsterdam',
    whyMose: 'Why MOSE?',
    freeShippingFrom: 'Free shipping from €{{amount}}',
    returnDays: '{{days}} days return policy',
    sustainableMaterials: 'Sustainable & high-quality materials',
    fastDelivery: 'Fast delivery (1-2 business days)',
    urgencyText: 'Your items will remain reserved for another {{hours}} hours. After that, we unfortunately cannot guarantee that they are still in stock.',
    needHelp: 'Need Help?',
    needHelpText: 'Still doubting or have questions? Our team is here for you!',
    unsubscribeText: 'This email was sent because you left items in your cart. Do you not want to receive reminders anymore?',
    unsubscribe: 'Click here',
    quantity: 'Quantity',
    total: 'Total',
    ctaButton: 'COMPLETE ORDER',
    moreItems: '+ {{count}} more items',
    freeShipping: 'Free shipping from €150',
  },
  backInStock: {
    subject: '{{productName}} is back in stock! | MOSE',
    title: 'BACK IN STOCK!',
    subtitle: 'Your Favorite Product',
    heroText: 'Good news! {{productName}} is available again',
    yourWaitIsOver: 'Your Wait Is Over',
    yourWaitText: 'We have good news! The product you were waiting for is back in stock.',
    interestedIn: 'You indicated that you are interested in: {{variant}}',
    viewProduct: 'VIEW PRODUCT',
    orderNow: 'Order now before it is sold out again',
    whyOrderNow: 'Why Order Now?',
    limitedStock: 'Limited stock. This product is popular!',
    freeShippingFrom: 'Free shipping from €{{amount}}',
    returnDays: '{{days}} days return policy',
    madeInGroningen: 'Locally made in Groningen',
    important: 'Important:',
    importantText: 'This notification is one-time only. Order now to be sure of your size and color!',
    receivedBecause: 'You received this email because you indicated that you were interested in this product when it was sold out.',
  },
  newsletterWelcome: {
    subject: 'Welcome to the MOSE pack!',
    title: 'WELCOME TO THE PACK!',
    subtitle: 'You Are Subscribed',
    heroText: 'You will now be the first to receive updates about drops, restocks and the atelier',
    promoTitle: 'YOUR 10% DISCOUNT CODE',
    promoSubtext: 'Use this code on your first order for {{discount}} off',
    promoExpiry: 'Valid until {{date}}',
    usePromoCode: 'Enter your code at checkout',
    whatYouGet: 'What You Get From Us?',
    benefit1Title: 'New drops',
    benefit1Text: 'Be the first to know when new items go live',
    benefit2Title: 'Restocks',
    benefit2Text: 'Notifications when sold-out items are back',
    benefit3Title: 'Behind the scenes',
    benefit3Text: 'Stories from our atelier in Groningen',
    benefit4Title: 'Exclusive offers',
    benefit4Text: 'Discounts only for subscribers',
    noSpam: 'No Spam, Only MOSE',
    noSpamText: 'We only send emails when we really have something important to share. No daily spam, only valuable updates.',
    discoverCollection: 'DISCOVER OUR COLLECTION',
    viewAllItems: 'View all available items',
    madeInGroningen: 'Made In Groningen',
    madeInGroningenText: 'Locally made. Quality that lasts. No nonsense, just character.',
    receivedBecause: 'You received this email because you subscribed to the MOSE newsletter.',
    unsubscribe: 'Unsubscribe',
  },
  insiderWelcome: {
    title: 'WELCOME TO THE INSIDERS',
    subtitle: 'You\'re in. Here\'s what that means.',
    intro: 'Thanks for being part of the inner circle. You\'re now officially a MOSE insider. You\'re one of the first to know when new drops launch, before they sell out.',
    promoTitle: 'YOUR 10% DISCOUNT CODE',
    promoSubtext: 'Use this code on your first order for {{discount}} off',
    promoExpiry: 'Valid until {{date}}',
    usePromoCode: 'Enter your code at checkout',
    perksTitle: 'What you get as an insider:',
    perk1Title: 'Made in Groningen',
    perk1Text: 'Locally designed and made',
    perk2Title: 'Free shipping',
    perk2Text: 'On your first order',
    perk3Title: 'First dibs on drops',
    perk3Text: 'Check out new releases first',
    perk4Title: 'Behind-the-scenes updates',
    perk4Text: 'Exclusive content for insiders',
    perk5Title: 'Insider-only releases',
    perk5Text: 'Special drops just for you',
    whatNowTitle: 'What now?',
    shopNow: 'Shop now',
    followUs: 'Follow us on Instagram',
    onInstagram: 'for behind-the-scenes content',
    ps: 'P.S. Keep an eye on your inbox. We\'ll send you more insider content before launch.',
  },
  insiderCommunity: {
    title: 'YOU\'RE NOT ALONE',
    subtitle: 'A behind-the-scenes look at our community',
    intro: 'There are now hundreds of insiders waiting for the launch. Not just customers, but people who get what MOSE stands for.',
    numbers: 'The numbers:',
    stat1: '{{count}}+ insiders on the list',
    stat2: 'Most popular: Hoodies (already 40% of stock reserved)',
    stat3: 'Top 3 countries: Netherlands, Belgium, Germany',
    communityTitle: 'What the community says:',
    testimonial1: '"Finally a Dutch brand that doesn\'t sell bullshit. Just clean, solid basics."',
    testimonial2: '"Those hoodies look insane. Can\'t wait for March 2nd."',
    testimonial3: '"Love that they produce locally. That makes the difference."',
    joinTitle: 'Join the community',
    joinText: 'Follow us on Instagram and Facebook for daily updates, drops and insider content:',
    socialInsta: 'Instagram: @mosewearcom',
    socialFb: 'Facebook: @mosewearcom',
    closing: 'We\'re building this together. See you at launch.',
    ps: 'P.S. {{days}} days until launch. Are you ready?',
  },
  insiderBehindScenes: {
    title: 'HOW WE MAKE THIS',
    subtitle: 'A look into the process',
    intro: 'You asked for it. Here\'s what happens behind the scenes at MOSE: from idea to product.',
    processTitle: 'The process:',
    process1: 'Locally designed in Groningen. Everything starts here.',
    process2: 'Made with premium materials. No cheap stuff.',
    process3: 'Limited runs. When it\'s gone, it\'s gone.',
    limitedTitle: 'Why limited edition?',
    limitedText: 'We don\'t do mass production. Every drop is limited. That means unique, exclusive and not for everyone. Early access makes sure you don\'t miss out.',
    closing: 'This is what you support when you buy at MOSE. No corporate bullshit. Just honest design, locally made.',
    followCTA: 'Follow the process',
    followSubtext: '@mosewearcom for real-time updates',
    ps: 'P.S. Launch is in {{days}} days. You have early access. Use it.',
  },
  insiderLaunchWeek: {
    title: 'LAUNCH IN {{days}} DAYS',
    subtitle: 'This is it. {{days}} days until launch.',
    intro: 'March 2nd. That\'s {{days}} days away. For you as an insider, that means 24 hours early access before everyone else can shop.',
    whatThisMeansTitle: 'What this means:',
    info1: 'You can shop from March 1st 00:00',
    info2: 'The rest of the world waits until March 2nd',
    info3: 'Limited items sell out fast. Early access is key',
    perksRemainTitle: 'Your insider perks remain:',
    perk1: '24h early access (March 1st at 00:00)',
    perk2: 'Made in Groningen',
    perk3: 'Free shipping on your first order',
    statusTitle: 'Check your status:',
    statusNotYet: '✓ If you haven\'t shopped yet: wait until March 1st 00:00 for early access',
    limitedStockTitle: 'Items with limited stock:',
    shopNow: 'Shop now',
    closing: 'This is the moment. {{days}} days. Are you ready?',
    ps: 'P.S. Final reminder: March 1st at 00:00 the doors open for insiders. Set your alarm.',
  },
  contact: {
    subject: 'Contact form: {{subject}} - {{name}}',
    title: 'NEW MESSAGE',
    subtitle: 'Contact form',
    from: 'From {{name}}',
    email: 'Email',
    replyInfo: 'You can reply directly to this email',
    contactDetails: 'Contact details',
    fromLabel: 'From',
    subjectLabel: 'Subject',
    message: 'Message',
    reply: 'Reply:',
    replyText: 'You can reply directly to this email to contact {{name}}.',
  },
  contactSubjects: {
    order: 'Question about order',
    product: 'Question about product',
    return: 'Return or exchange',
    other: 'Something else',
  },
  newReview: {
    subject: 'New review awaiting approval',
    title: 'NEW REVIEW',
    subtitle: 'A new review has been submitted and is awaiting your approval',
    product: 'Product',
    reviewer: 'Reviewer',
    email: 'Email',
    rating: 'Rating',
    reviewTitle: 'Title',
    reviewComment: 'Review',
    approveButton: 'View and approve review',
    info: 'This review has been automatically saved and is awaiting your approval before going live on the website.',
  },
  footer: {
    receivedBecause: 'You received this email because',
    unsubscribe: 'Unsubscribe',
  },
}

// Resources object (kept for potential future use)
const resources = {
  nl: { translation: nl },
  en: { translation: en },
}

/**
 * Get translation function for a specific locale
 * Simple, direct approach without i18next complexity
 * @param locale - Language code ('nl' or 'en')
 * @returns Translation function
 */
export async function getEmailT(locale: string = 'nl') {
  const translations = locale === 'en' ? en : nl
  
  // Return a simple translation function that supports nested keys
  return (key: string, options?: Record<string, any>) => {
    // Split key by dots to support nested keys like 'orderConfirmation.title'
    const keys = key.split('.')
    let value: any = translations
    
    // Navigate through nested object
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Key not found - return the key itself for debugging
        console.warn(`[email-i18n] Translation key not found: ${key}`)
        return key
      }
    }
    
    // If final value is not a string, return the key
    if (typeof value !== 'string') {
      console.warn(`[email-i18n] Translation value is not a string: ${key}`)
      return key
    }
    
    // Interpolate variables if provided
    if (options) {
      return interpolate(value, options)
    }
    
    return value
  }
}

/**
 * Helper to interpolate variables in a string
 * @param text - Text with {{variable}} placeholders
 * @param vars - Variables to interpolate
 * @returns Interpolated text
 */
export function interpolate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] || ''))
}

// Export translation objects for direct access if needed
export { nl, en }

