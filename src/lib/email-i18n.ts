import i18n from 'i18next'

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
    orderDetails: string
    reason: string
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
    returnDetails: string
    orderNumber: string
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
    returnTrackingCode: string
    trackReturn: string
    downloadLabel: string
    printLabel: string
    howToReturn: string
    step1: string
    step2: string
    step3: string
    step4: string
    important: string
    importantText: string
  }
  returnApproved: {
    subject: string
    title: string
    subtitle: string
    heroText: string
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
  contact: {
    subject: string
    title: string
    subtitle: string
    from: string
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
    subject: 'Bestelling bevestiging #{{orderId}} - MOSE',
    title: 'BEDANKT!',
    subtitle: 'Bestelling Geplaatst',
    heroText: 'Hey {{name}}, we gaan voor je aan de slag',
    yourItems: 'Jouw Items',
    paymentSummary: 'Betaaloverzicht',
    subtotal: 'Subtotaal (excl. BTW)',
    vat: 'BTW (21%)',
    shipping: 'Verzendkosten',
    total: 'Totaal',
    totalPaid: 'TOTAAL BETAALD',
    presaleNotice: 'Let op: Pre-sale items',
    presaleNoticeText: 'Je bestelling bevat pre-sale items die verzonden worden zodra ze binnen zijn (verwacht: {{date}}). Je ontvangt een verzendbevestiging zodra alles klaar is.',
    expected: 'Verwacht',
  },
  preorder: {
    subject: 'Pre-order bevestigd #{{orderId}} - MOSE',
    title: 'PRE-ORDER BEVESTIGD!',
    subtitle: 'Exclusieve Pre-sale',
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
    free: 'Gratis',
    total: 'Totaal',
    shippingAddress: 'VERZENDADRES',
    questions: 'Vragen?',
    questionsText: 'We helpen je graag!',
  },
  shipping: {
    subject: 'Je bestelling is verzonden #{{orderId}} - MOSE',
    title: 'ONDERWEG!',
    subtitle: 'Je Pakket Is Verzonden',
    heroText: 'Hey {{name}}, je bestelling komt eraan',
    trackingInfo: 'Tracking Informatie',
    carrier: '{{carrier}}',
    trackAndTrace: 'Track & Trace Code',
    trackOrder: 'VOLG JE BESTELLING',
    estimatedDelivery: 'Verwachte Levering',
    helpfulTips: 'Handige Tips',
    tip1: 'Zorg dat iemand thuis is om het pakket in ontvangst te nemen',
    tip2: 'Controleer je brievenbus voor een bezorgkaartje',
    tip3: 'Je ontvangt een melding zodra het in de buurt is',
    workingDays: '2-3 werkdagen',
  },
  processing: {
    subject: 'Je bestelling wordt voorbereid #{{orderId}} - MOSE',
    title: 'IN BEHANDELING',
    subtitle: 'We Pakken Je Order In',
    heroText: 'Hey {{name}}, we zijn voor je aan de slag!',
    whatHappensNow: 'Wat Gebeurt Er Nu?',
    step1: 'Je betaling is ontvangen en bevestigd',
    step2: 'We pakken je items zorgvuldig in',
    step3: 'Je ontvangt een tracking code zodra we verzenden',
    estimatedShipping: 'Verwachte Verzending',
    withinDays: 'Binnen 1-2 werkdagen',
    orderSummary: 'Order Overzicht',
    orderNumber: 'Order nummer',
  },
  delivered: {
    subject: 'Je pakket is bezorgd #{{orderId}} - MOSE',
    title: 'BEZORGD!',
    subtitle: 'Je Pakket Is Aangekomen',
    heroText: 'Hey {{name}}, geniet van je nieuwe items!',
    deliveredOn: 'Afgeleverd op {{date}}',
    hopeEverythingPerfect: 'We hopen dat alles in perfecte staat is aangekomen!',
    yourOrderedItems: 'Je Bestelde Items',
    shareExperience: 'Deel Je Ervaring',
    whatDoYouThink: 'Wat vind je van je bestelling?',
    writeReview: 'SCHRIJF EEN REVIEW',
    helpOthers: 'Help andere klanten met hun keuze',
    careTips: 'Verzorgingstips',
    tip1: 'Was je MOSE items op 30°C voor het beste resultaat',
    tip2: 'Hang je kledingstukken te drogen (niet in de droger)',
    tip3: 'Lees altijd het waslabel voor specifieke instructies',
    completeYourLook: 'Maak Je Look Compleet',
    discoverMore: 'Ontdek meer items uit onze collectie',
    viewShop: 'BEKIJK SHOP',
  },
  cancelled: {
    subject: 'Order geannuleerd #{{orderId}} - MOSE',
    title: 'GEANNULEERD',
    subtitle: 'Order Geannuleerd',
    heroText: 'Hey {{name}}, je order is geannuleerd',
    orderDetails: 'Order Details',
    reason: 'Reden',
    amount: 'Bedrag',
    refund: 'Terugbetaling',
    refundText: 'Je betaling wordt automatisch teruggestort naar je originele betaalmethode binnen 3-5 werkdagen. Afhankelijk van je bank kan het iets langer duren voordat het bedrag zichtbaar is op je rekening.',
    ourApologies: 'Onze Excuses',
    sorryText: 'Als excuus bieden we je 10% korting op je volgende bestelling:',
    discountCode: 'SORRY10',
    validUntil: 'Geldig tot 1 maand na deze email',
    stillInterested: 'Nog Steeds Interesse?',
    checkFullCollection: 'Bekijk onze volledige collectie en vind je perfecte MOSE item',
    questions: 'Vragen?',
    questionsText: 'Heb je vragen over je annulering? Neem gerust contact met ons op. We helpen je graag!',
  },
  returnRequested: {
    subject: 'Retourverzoek ontvangen #{{returnId}} - MOSE',
    title: 'RETOUR AANGEVRAAGD',
    subtitle: 'Je Verzoek Is Ontvangen',
    heroText: 'Hey {{name}}, we hebben je retourverzoek ontvangen',
    returnDetails: 'Retour Details',
    orderNumber: 'Order Nummer',
    reason: 'Reden',
    returnItems: 'Retour Items',
    labelBeingGenerated: 'Je Retourlabel Wordt Nu Gegenereerd',
    labelGeneratedText: 'Je betaling voor het retourlabel is succesvol ontvangen! We genereren nu je retourlabel. Je ontvangt een email zodra het label klaar is om te downloaden.',
    nextSteps: 'Volgende Stappen',
    step1: 'Download het retourlabel zodra je het ontvangt',
    step2: 'Plak het label op je pakket en stuur het terug',
    step3: 'Na ontvangst beoordelen we de kleding en krijg je een bericht',
    viewReturnStatus: 'BEKIJK RETOUR STATUS',
  },
  returnLabelGenerated: {
    subject: 'Je retourlabel is klaar #{{returnId}} - MOSE',
    title: 'RETOURLABEL BESCHIKBAAR!',
    subtitle: 'Je Kunt Nu Retourneren',
    heroText: 'Hey {{name}}, je retourlabel is klaar',
    returnTrackingCode: 'Retour Tracking Code',
    trackReturn: 'VOLG JE RETOUR',
    downloadLabel: 'DOWNLOAD RETOURLABEL',
    printLabel: 'Print dit label en plak het op je pakket',
    howToReturn: 'Hoe Retourneren?',
    step1: 'Download en print het retourlabel',
    step2: 'Pak je items in de originele verpakking',
    step3: 'Plak het label op je pakket',
    step4: 'Breng je pakket naar een PostNL punt',
    important: 'Let op:',
    importantText: 'Zorg dat je items ongedragen zijn en de labels er nog aan zitten. Na ontvangst krijg je binnen 5-7 werkdagen je geld terug.',
  },
  returnApproved: {
    subject: 'Je retour is goedgekeurd - Terugbetaling verwerkt #{{returnId}} - MOSE',
    title: 'JE RETOUR IS GOEDGEKEURD!',
    subtitle: 'Je Kleding Is Beoordeeld',
    heroText: 'Hey {{name}}, we hebben je retour ontvangen en goedgekeurd',
    refundProcessing: 'Je Terugbetaling Wordt Verwerkt',
    refundProcessingText: 'We hebben je geretourneerde kleding ontvangen en gecontroleerd. Alles ziet er goed uit! Je terugbetaling wordt nu verwerkt en je ontvangt het geld binnen 3-5 werkdagen op je rekening.',
    returnItems: 'Retour Items',
    refundSummary: 'Terugbetaling Overzicht',
    refundAmount: 'Terug te betalen (items)',
    labelCostPaid: 'Retourlabel kosten (al betaald)',
    toBeRefunded: 'TERUG TE BETALEN',
    whatHappensNow: 'Wat Gebeurt Er Nu?',
    step1: 'Je terugbetaling wordt verwerkt',
    step2: 'Je ontvangt €{{amount}} teruggestort naar je originele betaalmethode',
    step3: 'Het bedrag is binnen 3-5 werkdagen zichtbaar op je rekening',
    viewReturnStatus: 'BEKIJK RETOUR STATUS',
  },
  returnRefunded: {
    subject: 'Terugbetaling voltooid #{{returnId}} - MOSE',
    title: 'TERUGBETALING VOLTOOID!',
    subtitle: 'Je Geld Is Teruggestort',
    heroText: 'Hey {{name}}, je retour is verwerkt',
    refundedAmount: '€{{amount}} teruggestort',
    refundedTo: 'Het bedrag is teruggestort naar je originele betaalmethode',
    refundSummary: 'Terugbetaling Overzicht',
    refunded: 'TERUGGESTORT',
    labelCostPaid: 'Retourlabel kosten (al betaald)',
    whenWillISeeIt: 'Wanneer Zie Je Het Bedrag?',
    whenWillISeeItText: 'Het bedrag is teruggestort naar je originele betaalmethode. Afhankelijk van je bank kan het 3-5 werkdagen duren voordat het bedrag zichtbaar is op je rekening.',
    shopMore: 'VERDER SHOPPEN',
  },
  returnRejected: {
    subject: 'Retourverzoek afgewezen #{{returnId}} - MOSE',
    title: 'RETOUR AFGEWEZEN',
    subtitle: 'Retourverzoek Niet Goedgekeurd',
    heroText: 'Hey {{name}}, je retourverzoek kon niet worden goedgekeurd',
    reasonForRejection: 'Reden van Afwijzing',
    questions: 'Vragen?',
    questionsText: 'Heb je vragen over deze afwijzing? Neem gerust contact met ons op. We helpen je graag verder!',
  },
  abandonedCart: {
    subject: '{{name}}, je MOSE items wachten nog op je!',
    title: 'NIET VERGETEN?',
    subtitle: 'Je Winkelwagen Wacht Op Je',
    heroText: 'Hey {{name}}, je hebt nog {{count}} item in je winkelwagen!',
    heroTextPlural: 'Hey {{name}}, je hebt nog {{count}} items in je winkelwagen!',
    personalMessage: 'We zagen dat je vandaag aan het shoppen was bij MOSE, maar je bestelling nog niet hebt afgerond. Geen zorgen - we hebben je items nog voor je gereserveerd!',
    personalMessageYesterday: 'We zagen dat je gisteren aan het shoppen was bij MOSE, maar je bestelling nog niet hebt afgerond. Geen zorgen - we hebben je items nog voor je gereserveerd!',
    yourItems: 'Jouw Items',
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
    needHelp: 'Hulp Nodig?',
    needHelpText: 'Twijfel je nog of heb je vragen? Ons team staat voor je klaar!',
    unsubscribeText: 'Deze email is verzonden omdat je items in je winkelwagen hebt achtergelaten. Wil je geen herinneringen meer ontvangen?',
    unsubscribe: 'Klik hier',
  },
  backInStock: {
    subject: '{{productName}} is weer op voorraad! - MOSE',
    title: 'WEER OP VOORRAAD!',
    subtitle: 'Je Favoriete Product',
    heroText: 'Goed nieuws! {{productName}} is weer beschikbaar',
    yourWaitIsOver: 'Je Wacht Is Voorbij',
    yourWaitText: 'We hebben goed nieuws! Het product waar je op wachtte is weer op voorraad.',
    interestedIn: 'Je hebt aangegeven dat je geïnteresseerd bent in: {{variant}}',
    viewProduct: 'BEKIJK PRODUCT',
    orderNow: 'Bestel nu voordat het weer uitverkocht is',
    whyOrderNow: 'Waarom Nu Bestellen?',
    limitedStock: 'Beperkte voorraad - dit product is populair!',
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
    subtitle: 'Je Bent Ingeschreven',
    heroText: 'Je ontvangt nu als eerste updates over drops, restocks en het atelier',
    whatYouGet: 'Wat Krijg Je Van Ons?',
    benefit1Title: 'Nieuwe drops',
    benefit1Text: 'Als eerste weten wanneer nieuwe items live gaan',
    benefit2Title: 'Restocks',
    benefit2Text: 'Notificaties wanneer uitverkochte items terug zijn',
    benefit3Title: 'Behind the scenes',
    benefit3Text: 'Verhalen uit ons atelier in Groningen',
    benefit4Title: 'Exclusieve aanbiedingen',
    benefit4Text: 'Kortingen alleen voor subscribers',
    noSpam: 'Geen Spam, Alleen MOSE',
    noSpamText: 'We sturen alleen emails als we écht iets belangrijks te melden hebben. Geen dagelijkse spam, alleen waardevolle updates.',
    discoverCollection: 'ONTDEK ONZE COLLECTIE',
    viewAllItems: 'Bekijk alle beschikbare items',
    madeInGroningen: 'Gemaakt In Groningen',
    madeInGroningenText: 'Lokaal gemaakt. Kwaliteit die blijft. Geen poespas, wel karakter.',
    receivedBecause: 'Je ontving deze email omdat je je hebt ingeschreven voor de MOSE nieuwsbrief.',
    unsubscribe: 'Uitschrijven',
  },
  contact: {
    subject: 'Contactformulier: {{subject}} - {{name}}',
    title: 'NIEUW BERICHT',
    subtitle: 'Contactformulier',
    from: 'Van {{name}}',
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
    subject: 'Order confirmation #{{orderId}} - MOSE',
    title: 'THANK YOU!',
    subtitle: 'Order Placed',
    heroText: 'Hey {{name}}, we are getting to work for you',
    yourItems: 'Your Items',
    paymentSummary: 'Payment Summary',
    subtotal: 'Subtotal (excl. VAT)',
    vat: 'VAT (21%)',
    shipping: 'Shipping',
    total: 'Total',
    totalPaid: 'TOTAL PAID',
    presaleNotice: 'Note: Pre-sale items',
    presaleNoticeText: 'Your order contains pre-sale items that will be shipped when they arrive (expected: {{date}}). You will receive a shipping confirmation when everything is ready.',
    expected: 'Expected',
  },
  preorder: {
    subject: 'Pre-order confirmed #{{orderId}} - MOSE',
    title: 'PRE-ORDER CONFIRMED!',
    subtitle: 'Exclusive Pre-sale',
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
    free: 'Free',
    total: 'Total',
    shippingAddress: 'SHIPPING ADDRESS',
    questions: 'Questions?',
    questionsText: 'We are happy to help!',
  },
  shipping: {
    subject: 'Your order has been shipped #{{orderId}} - MOSE',
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
    subject: 'Your order is being prepared #{{orderId}} - MOSE',
    title: 'PROCESSING',
    subtitle: 'We Are Packing Your Order',
    heroText: 'Hey {{name}}, we are working on your order!',
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
    subject: 'Your package has been delivered #{{orderId}} - MOSE',
    title: 'DELIVERED!',
    subtitle: 'Your Package Has Arrived',
    heroText: 'Hey {{name}}, enjoy your new items!',
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
    subject: 'Order cancelled #{{orderId}} - MOSE',
    title: 'CANCELLED',
    subtitle: 'Order Cancelled',
    heroText: 'Hey {{name}}, your order has been cancelled',
    orderDetails: 'Order Details',
    reason: 'Reason',
    amount: 'Amount',
    refund: 'Refund',
    refundText: 'Your payment will be automatically refunded to your original payment method within 3-5 business days. Depending on your bank, it may take a bit longer before the amount is visible in your account.',
    ourApologies: 'Our Apologies',
    sorryText: 'As an apology, we offer you 10% discount on your next order:',
    discountCode: 'SORRY10',
    validUntil: 'Valid until 1 month after this email',
    stillInterested: 'Still Interested?',
    checkFullCollection: 'Check out our full collection and find your perfect MOSE item',
    questions: 'Questions?',
    questionsText: 'Do you have questions about your cancellation? Feel free to contact us. We are happy to help!',
  },
  returnRequested: {
    subject: 'Return request received #{{returnId}} - MOSE',
    title: 'RETURN REQUESTED',
    subtitle: 'Your Request Has Been Received',
    heroText: 'Hey {{name}}, we have received your return request',
    returnDetails: 'Return Details',
    orderNumber: 'Order Number',
    reason: 'Reason',
    returnItems: 'Return Items',
    labelBeingGenerated: 'Your Return Label Is Now Being Generated',
    labelGeneratedText: 'Your payment for the return label has been successfully received! We are now generating your return label. You will receive an email as soon as the label is ready to download.',
    nextSteps: 'Next Steps',
    step1: 'Download the return label as soon as you receive it',
    step2: 'Attach the label to your package and send it back',
    step3: 'After receipt, we will assess the clothing and you will receive a message',
    viewReturnStatus: 'VIEW RETURN STATUS',
  },
  returnLabelGenerated: {
    subject: 'Your return label is ready #{{returnId}} - MOSE',
    title: 'RETURN LABEL AVAILABLE!',
    subtitle: 'You Can Now Return',
    heroText: 'Hey {{name}}, your return label is ready',
    returnTrackingCode: 'Return Tracking Code',
    trackReturn: 'TRACK YOUR RETURN',
    downloadLabel: 'DOWNLOAD RETURN LABEL',
    printLabel: 'Print this label and attach it to your package',
    howToReturn: 'How To Return?',
    step1: 'Download and print the return label',
    step2: 'Pack your items in the original packaging',
    step3: 'Attach the label to your package',
    step4: 'Bring your package to a PostNL point',
    important: 'Important:',
    importantText: 'Make sure your items are unworn and the tags are still attached. After receipt, you will receive your money back within 5-7 business days.',
  },
  returnApproved: {
    subject: 'Your return has been approved - Refund processed #{{returnId}} - MOSE',
    title: 'YOUR RETURN IS APPROVED!',
    subtitle: 'Your Clothing Has Been Assessed',
    heroText: 'Hey {{name}}, we have received and approved your return',
    refundProcessing: 'Your Refund Is Being Processed',
    refundProcessingText: 'We have received and checked your returned clothing. Everything looks good! Your refund is now being processed and you will receive the money within 3-5 business days in your account.',
    returnItems: 'Return Items',
    refundSummary: 'Refund Summary',
    refundAmount: 'To be refunded (items)',
    labelCostPaid: 'Return label costs (already paid)',
    toBeRefunded: 'TO BE REFUNDED',
    whatHappensNow: 'What Happens Now?',
    step1: 'Your refund is being processed',
    step2: 'You will receive €{{amount}} refunded to your original payment method',
    step3: 'The amount will be visible in your account within 3-5 business days',
    viewReturnStatus: 'VIEW RETURN STATUS',
  },
  returnRefunded: {
    subject: 'Refund completed #{{returnId}} - MOSE',
    title: 'REFUND COMPLETED!',
    subtitle: 'Your Money Has Been Refunded',
    heroText: 'Hey {{name}}, your return has been processed',
    refundedAmount: '€{{amount}} refunded',
    refundedTo: 'The amount has been refunded to your original payment method',
    refundSummary: 'Refund Summary',
    refunded: 'REFUNDED',
    labelCostPaid: 'Return label costs (already paid)',
    whenWillISeeIt: 'When Will I See The Amount?',
    whenWillISeeItText: 'The amount has been refunded to your original payment method. Depending on your bank, it can take 3-5 business days before the amount is visible in your account.',
    shopMore: 'SHOP MORE',
  },
  returnRejected: {
    subject: 'Return request rejected #{{returnId}} - MOSE',
    title: 'RETURN REJECTED',
    subtitle: 'Return Request Not Approved',
    heroText: 'Hey {{name}}, your return request could not be approved',
    reasonForRejection: 'Reason For Rejection',
    questions: 'Questions?',
    questionsText: 'Do you have questions about this rejection? Feel free to contact us. We are happy to help!',
  },
  abandonedCart: {
    subject: '{{name}}, your MOSE items are still waiting for you!',
    title: 'FORGOT SOMETHING?',
    subtitle: 'Your Cart Is Waiting For You',
    heroText: 'Hey {{name}}, you still have {{count}} item in your cart!',
    heroTextPlural: 'Hey {{name}}, you still have {{count}} items in your cart!',
    personalMessage: 'We saw that you were shopping at MOSE today, but you have not yet completed your order. No worries - we still have your items reserved for you!',
    personalMessageYesterday: 'We saw that you were shopping at MOSE yesterday, but you have not yet completed your order. No worries - we still have your items reserved for you!',
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
  },
  backInStock: {
    subject: '{{productName}} is back in stock! - MOSE',
    title: 'BACK IN STOCK!',
    subtitle: 'Your Favorite Product',
    heroText: 'Good news! {{productName}} is available again',
    yourWaitIsOver: 'Your Wait Is Over',
    yourWaitText: 'We have good news! The product you were waiting for is back in stock.',
    interestedIn: 'You indicated that you are interested in: {{variant}}',
    viewProduct: 'VIEW PRODUCT',
    orderNow: 'Order now before it is sold out again',
    whyOrderNow: 'Why Order Now?',
    limitedStock: 'Limited stock - this product is popular!',
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
  contact: {
    subject: 'Contact form: {{subject}} - {{name}}',
    title: 'NEW MESSAGE',
    subtitle: 'Contact Form',
    from: 'From {{name}}',
    contactDetails: 'Contact Details',
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
  footer: {
    receivedBecause: 'You received this email because',
    unsubscribe: 'Unsubscribe',
  },
}

// Resources object for i18next
const resources = {
  nl: { translation: nl },
  en: { translation: en },
}

// Initialize i18next
i18n.init({
  resources,
  lng: 'nl', // Default language
  fallbackLng: 'nl',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
})

/**
 * Get translation function for a specific locale
 * @param locale - Language code ('nl' or 'en')
 * @returns Translation function
 */
export async function getEmailT(locale: string = 'nl') {
  await i18n.changeLanguage(locale)
  return i18n.t.bind(i18n)
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

export default i18n

