import { vertaalKleur } from './kleurnaam'

/** Translate structured catalogue captions without changing official model names. */
export function productImageAlt(alt: string | null | undefined, name: string, locale: string): string {
  if (!alt?.trim()) return name
  const legacy = alt.match(/^(.*?) in ([^,]+), (.*)$/)
  if (legacy) {
    if (locale !== 'en') return alt
    return `${name} in ${vertaalKleur(legacy[2], locale)} — ${legacyViews[legacy[3]] || 'product photograph'}`
  }
  const parts = alt.split(/\s+[—–]\s+/)
  const views: Record<string, [string, string]> = {
    'front view': ['vooraanzicht', 'front view'], 'side view': ['zijaanzicht', 'side view'],
    'back view': ['achteraanzicht', 'back view'], 'detail view': ['detail', 'detail view'],
    front: ['vooraanzicht', 'front view'], side: ['zijaanzicht', 'side view'], back: ['achteraanzicht', 'back view'],
    angle: ['driekwartaanzicht', 'three-quarter view'], model: ['gedragen op een model', 'worn by a model'],
    lifestyle: ['campagnebeeld', 'lifestyle photograph'], 'full outfit': ['volledige outfit', 'full outfit'],
    'fabric and chest print detail': ['detail van stof en borstprint', 'fabric and chest print detail'],
    'waistband, pocket and print detail': ['detail van tailleband, zak en print', 'waistband, pocket and print detail'],
    'collar, zip and print detail': ['detail van kraag, rits en print', 'collar, zip and print detail'],
    detail: ['detail', 'detail view'], vooraanzicht: ['vooraanzicht', 'front view'],
    zijaanzicht: ['zijaanzicht', 'side view'], achteraanzicht: ['achteraanzicht', 'back view'],
  }
  if (parts[0].startsWith(name + ' ')) parts[0] = name + ' — ' + vertaalKleur(parts[0].slice(name.length + 1), locale)
  return parts.map(part => views[part.toLowerCase()]?.[locale === 'en' ? 1 : 0] || vertaalKleur(part, locale)).join(' — ')
}

const legacyViews: Record<string, string> = {
  'vooraanzicht met ronde hals, schouders, mouwen en zoom': 'front view showing the crew neck, shoulders, sleeves and hem',
  'gedragen op straat, campagnebeeld': 'worn on the street, lifestyle photograph',
  'gedragen op een trap, campagnebeeld': 'worn on steps, lifestyle photograph',
  'driekwartaanzicht waarop de mouwval en de lengte te zien zijn': 'three-quarter view showing the sleeve drape and length',
  'detail van de witte puff-print en de hals in zacht licht': 'white puff-print and neckline detail in soft light',
  'detail van de manchet, de mouw en de hals op een model': 'cuff, sleeve and neckline detail on a model',
  'volledig silhouet gedragen door een tweede model': 'full silhouette worn by a second model',
  'close-up van de puff-print op het zwarte artikel': 'close-up of the puff print on the black garment',
  'detail van de stof, de mouw en de manchet': 'fabric, sleeve and cuff detail',
  'vooraanzicht op een model, volledige voorkant met capuchon en buidelzak': 'front view on a model showing the hood and kangaroo pocket',
  'gedragen aan de kade in Groningen, campagnebeeld': 'worn by the waterfront in Groningen, lifestyle photograph',
  'achteraanzicht met capuchon en schouderpasvorm': 'back view showing the hood and shoulder fit',
  'close-up van de puff-print op de borst en de afwerking van de mouw': 'close-up of the chest puff print and sleeve finish',
  'zijaanzicht met de capuchonconstructie en de pasvorm langs het lichaam': 'side view showing the hood construction and fit along the body',
  'volledig silhouet op een trap, gedragen door een tweede model': 'full silhouette on steps, worn by a second model',
  'close-up van het puff-logo en de structuur van de stof': 'close-up of the puff logo and fabric texture',
  'detail van de buidelzak, de hals en het ribboord': 'kangaroo pocket, neckline and ribbing detail',
  'gedragen in een industriële omgeving, campagnebeeld': 'worn in an industrial setting, lifestyle photograph',
  'detail van de capuchon, de borst en de zoom op een model': 'hood, chest and hem detail on a model',
  'detail van de manchet en de afwerking van de mouw op een model': 'cuff and sleeve finish detail on a model',
}
