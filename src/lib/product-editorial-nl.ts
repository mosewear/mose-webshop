type ProductEditorial = {
  fit: string
  measure: string
  details: string[]
  material: string
  care: 'label' | 'stock' | 'supplier' | 'print'
}

const trousers = 'Vergelijk de taillebreedte met een broek die goed zit.'
const tops = 'Vergelijk de borstbreedte met een shirt dat goed zit.'
const layers = 'Vergelijk de borstbreedte met een jas of trui die goed zit.'

export const productEditorialNl: Readonly<Partial<Record<string, ProductEditorial>>> = {
  'barrel-pants': {
    fit: 'Ruim rond het bovenbeen, smaller bij de enkel.', measure: trousers,
    details: ['Middelhoge taille', 'Gebogen pijpen die naar de enkel toelopen', 'Stof met stretch'],
    material: '52% katoen, 41% polyester, 7% elastaan · 240 g/m²', care: 'supplier',
  },
  'distressed-barrel-jeans': {
    fit: 'Ruim rond het bovenbeen, smaller bij de enkel.', measure: trousers,
    details: ['Middelhoge taille', 'Gebogen pijpen', 'Gewassen denim met slijtagedetails'],
    material: '91,4% katoen, 7,6% polyester, 1% overige vezels · 340 g/m²', care: 'supplier',
  },
  'mose-barrel-sweatpants': {
    fit: 'Ruime fleecebroek met gebogen pijpen.', measure: trousers,
    details: ['Elastische tailleband', 'Steekzakken', 'Open pijpzomen'],
    material: '53% polyester, 42% katoen, 5% overige vezels · 345 g/m²', care: 'supplier',
  },
  'mose-classic-sweater': {
    fit: 'Normale pasvorm met ruimte om te bewegen.', measure: layers,
    details: ['Ronde hals', 'Zachte binnenkant', 'Geribde manchetten en zoom'],
    material: 'Katoenen fleece · 300 g/m²', care: 'stock',
  },
  'mose-denim-zip-jacket': {
    fit: 'Kort en ruimvallend, met verlaagde schouders.', measure: layers,
    details: ['Doorlopende rits en puntkraag', 'Twee steekzakken', 'Elastische zoom en manchetten met knoopsluiting', 'De zwarte wassing kan per jas iets verschillen'],
    material: '70% katoen, 30% polyester · 320 g/m²', care: 'supplier',
  },
  'mose-essential-hoodie': {
    fit: 'Normale pasvorm met ruimte voor een T-shirt eronder.', measure: layers,
    details: ['Capuchon en buidelzak', 'Zachte binnenkant', 'Geribde manchetten en zoom'],
    material: 'Katoenen fleece · 300 g/m²', care: 'stock',
  },
  'mose-fleece-shorts': {
    fit: 'Los rond het bovenbeen, met een elastische taille.', measure: trousers,
    details: ['Elastische tailleband', 'Steekzakken', 'Zichtbare onafgewerkte naad onder de tailleband'],
    material: '53% polyester, 42% katoen, 5% overige vezels · 345 g/m²', care: 'supplier',
  },
  'mose-fleece-zip-hoodie': {
    fit: 'Fleecehoodie die je open of dicht kunt dragen.', measure: layers,
    details: ['Doorlopende rits en capuchon', 'Twee steekzakken aan de voorkant', 'Geribde manchetten en zoom'],
    material: '53% polyester, 42% katoen, 5% overige vezels · 345 g/m²', care: 'supplier',
  },
  'mose-heavy-tee': {
    fit: 'Oversized, recht gesneden en ruim bij de schouders.', measure: tops,
    details: ['Verlaagde schouders', 'Ronde hals', 'Effen, zonder buitenprint'],
    material: '100% katoen · 300 g/m²', care: 'supplier',
  },
  'mose-quarter-zip': {
    fit: 'Recht gesneden trainingstop met stretch.', measure: tops,
    details: ['Opstaande kraag met korte rits', 'Lange mouwen en rechte manchetten', 'Reflecterende details bij kraag en mouwen', 'Wit MOSE-logo op de linkerborst'],
    material: '93% polyester, 7% elastaan · 230 g/m²', care: 'print',
  },
  'mose-tee': {
    fit: 'Normale pasvorm, zonder strak aan te sluiten.', measure: tops,
    details: ['Geribde ronde hals', 'Verstevigde naden'],
    material: 'Jersey · 240 g/m²', care: 'stock',
  },
  'mose-training-pants': {
    fit: 'De pijpen lopen taps toe en de stof rekt mee.', measure: trousers,
    details: ['Elastische tailleband met trekkoord', 'Steekzakken', 'Open pijpzomen', 'Wit MOSE-logo op het rechterbovenbeen'],
    material: '80% nylon, 20% elastaan · 160 g/m²', care: 'print',
  },
  'mose-training-shorts': {
    fit: 'Losse buitenbroek met een aansluitende binnenbroek.', measure: trousers,
    details: ['Elastische tailleband met trekkoord', 'Steekzakken buiten en zakken in de binnenbroek', 'Zijsplitten', 'Wit MOSE-logo op de rechterpijp'],
    material: '90% polyester, 10% elastaan · 180 g/m²', care: 'print',
  },
  'mose-training-tee': {
    fit: 'Normale pasvorm met korte raglanmouwen.', measure: tops,
    details: ['Ronde hals met ribboord', 'Wit MOSE-logo op de linkerborst'],
    material: '100% polyester · 150 g/m²', care: 'print',
  },
  'mose-waffle-tee': {
    fit: 'Breed en recht gesneden, met raglanmouwen.', measure: tops,
    details: ['Wafelstructuur', 'Effen, zonder buitenprint', 'De wassing kan per shirt iets verschillen'],
    material: '70% katoen, 30% polyester · 340 g/m²', care: 'supplier',
  },
  'mose-washed-longsleeve': {
    fit: 'Ruimvallend, met verlaagde schouders.', measure: tops,
    details: ['Geribde hals en manchetten', 'Effen, zonder buitenprint', 'De wassing kan per shirt iets verschillen'],
    material: '100% katoen · 250 g/m²', care: 'supplier',
  },
  'raglan-longsleeve': {
    fit: 'Ruime pasvorm met raglanmouwen.', measure: tops,
    details: ['Contrasterende mouwen met een diagonale schoudernaad', 'Zwart MOSE-logo op de borst'],
    material: '100% katoen · 270 g/m²', care: 'print',
  },
  'sunfade-barrel-jeans': {
    fit: 'Ruim rond het bovenbeen, smaller bij de enkel.', measure: trousers,
    details: ['Middelhoge taille', 'Gebogen pijpen', 'Lichtblauwe wassing met verbleekte delen en rafelige details'],
    material: '80% katoen, 20% polyester · 460 g/m²', care: 'supplier',
  },
  'tree-camo-barrel-pants': {
    fit: 'Ruim rond het bovenbeen, smaller bij de enkel.', measure: trousers,
    details: ['Middelhoge taille', 'Knoop- en ritssluiting', 'Camouflagepatroon met takken en bladeren'],
    material: '100% katoen · 360 g/m²', care: 'supplier',
  },
  'vintage-barrel-jeans': {
    fit: 'Ruim rond het bovenbeen, smaller bij de enkel.', measure: trousers,
    details: ['Middelhoge taille', 'Gebogen pijpen', 'Denim met vintagewassing'],
    material: '68,2% katoen, 25,8% polyester, 6% viscose · 410 g/m²', care: 'supplier',
  },
  'washed-barrel-jeans': {
    fit: 'Ruim rond het bovenbeen, smaller bij de enkel.', measure: trousers,
    details: ['Middelhoge taille', 'Gebogen pijpen', 'Denim met uitgesproken wassing'],
    material: '80% katoen, 14% geregenereerde cellulose, 6% polyester · 450 g/m²', care: 'supplier',
  },
}

export const careInstructionsNl = {
  label: 'Volg de was- en drooginstructies op het label aan de binnenkant.',
  stock: 'Was binnenstebuiten op 30 °C met vergelijkbare kleuren. Hang het kledingstuk te drogen. Strijk zo nodig binnenstebuiten op lage temperatuur. Gebruik geen bleekmiddel.',
  supplier: 'Was op 30 °C met een fijnwasprogramma. Gebruik geen bleekmiddel. Droog en strijk op lage temperatuur. Laat het kledingstuk niet chemisch reinigen.',
  print: 'Was op 30 °C met een fijnwasprogramma. Gebruik geen bleekmiddel. Droog en strijk op lage temperatuur en strijk niet over het logo. Laat het kledingstuk niet chemisch reinigen.',
} as const
