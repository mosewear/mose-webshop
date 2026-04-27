// Quick-start presets the admin can pick to pre-fill a new campaign.
// They cover theme color + suggested copy. Dates are intentionally NOT
// included — feast days move year over year and the admin should pick.

export type CampaignPresetKey =
  | 'koningsdag'
  | 'black-friday'
  | 'sinterklaas'
  | 'kerst'
  | 'valentijn'
  | 'moederdag'
  | 'zomersale'
  | 'birthday-mose'

export interface CampaignPreset {
  key: CampaignPresetKey
  label: string
  emoji: string
  defaults: {
    namePrefix: string
    slugBase: string
    theme_color: string
    theme_text_color: string
    theme_accent_color: string
    banner_message_nl: string
    banner_message_en: string
    banner_cta_nl: string
    banner_cta_en: string
    banner_link_url: string
    popup_title_nl: string
    popup_title_en: string
    popup_body_nl: string
    popup_body_en: string
    popup_cta_nl: string
    popup_cta_en: string
    suggested_promo_code?: string
  }
}

export const CAMPAIGN_PRESETS: CampaignPreset[] = [
  {
    key: 'koningsdag',
    label: 'Koningsdag',
    emoji: '👑',
    defaults: {
      namePrefix: 'Koningsdag',
      slugBase: 'koningsdag',
      theme_color: '#FF6700',
      theme_text_color: '#FFFFFF',
      theme_accent_color: '#1F4E8C',
      banner_message_nl: '👑 KONINGSDAG: 15% KORTING MET CODE KINGSDAY15',
      banner_message_en: '👑 KING’S DAY: 15% OFF WITH CODE KINGSDAY15',
      banner_cta_nl: 'Shop nu',
      banner_cta_en: 'Shop now',
      banner_link_url: '/shop',
      popup_title_nl: 'Hoera, Koningsdag!',
      popup_title_en: 'Happy King’s Day!',
      popup_body_nl:
        'Vandaag vieren we het feest met **15% korting** op alle MOSE-stukken. Pak je favoriet, oranje optioneel.',
      popup_body_en:
        'Celebrate with us — **15% off** every MOSE piece today. Orange is optional, MOSE is mandatory.',
      popup_cta_nl: 'Shop met 15% korting',
      popup_cta_en: 'Shop with 15% off',
      suggested_promo_code: 'KINGSDAY15',
    },
  },
  {
    key: 'black-friday',
    label: 'Black Friday',
    emoji: '🛍️',
    defaults: {
      namePrefix: 'Black Friday',
      slugBase: 'black-friday',
      theme_color: '#000000',
      theme_text_color: '#FFFFFF',
      theme_accent_color: '#00A676',
      banner_message_nl: 'BLACK FRIDAY · 25% KORTING MET CODE BF25',
      banner_message_en: 'BLACK FRIDAY · 25% OFF WITH CODE BF25',
      banner_cta_nl: 'Naar de shop',
      banner_cta_en: 'Shop the drop',
      banner_link_url: '/shop',
      popup_title_nl: 'Black Friday is hier',
      popup_title_en: 'Black Friday is on',
      popup_body_nl:
        '**25% korting** op alles, alleen vandaag. Geen flits-deals, geen kunst — gewoon MOSE voor minder.',
      popup_body_en:
        '**25% off everything**, today only. No gimmicks, no fluff — just MOSE for less.',
      popup_cta_nl: 'Shop met 25% korting',
      popup_cta_en: 'Shop with 25% off',
      suggested_promo_code: 'BF25',
    },
  },
  {
    key: 'sinterklaas',
    label: 'Sinterklaas',
    emoji: '🎁',
    defaults: {
      namePrefix: 'Sinterklaas',
      slugBase: 'sinterklaas',
      theme_color: '#C8102E',
      theme_text_color: '#FFFFFF',
      theme_accent_color: '#FFFFFF',
      banner_message_nl: '🎁 SINT-DEAL: 10% KORTING MET CODE PIET10',
      banner_message_en: '🎁 ST. NICHOLAS DEAL: 10% OFF WITH CODE PIET10',
      banner_cta_nl: 'Shop nu',
      banner_cta_en: 'Shop now',
      banner_link_url: '/shop',
      popup_title_nl: 'Sinterklaascadeau gezocht?',
      popup_title_en: 'Looking for a holiday gift?',
      popup_body_nl:
        'Sint heeft het al gevonden: **10% korting** op alle MOSE-stukken. Bestel op tijd voor pakjesavond.',
      popup_body_en:
        'We made it easy: **10% off** every MOSE piece. Order in time for the festive evening.',
      popup_cta_nl: 'Vind een cadeau',
      popup_cta_en: 'Find a gift',
      suggested_promo_code: 'PIET10',
    },
  },
  {
    key: 'kerst',
    label: 'Kerst',
    emoji: '🎄',
    defaults: {
      namePrefix: 'Kerst',
      slugBase: 'kerst',
      theme_color: '#1B5E20',
      theme_text_color: '#FFFFFF',
      theme_accent_color: '#C8102E',
      banner_message_nl: '🎄 KERSTDEAL: 15% KORTING MET CODE XMAS15',
      banner_message_en: '🎄 HOLIDAY DEAL: 15% OFF WITH CODE XMAS15',
      banner_cta_nl: 'Shop kerstoutfits',
      banner_cta_en: 'Shop holiday looks',
      banner_link_url: '/shop',
      popup_title_nl: 'Cadeautip onder de boom',
      popup_title_en: 'Under the tree',
      popup_body_nl:
        '**15% korting** op alles. Bestel voor 22 december en je hebt het op tijd.',
      popup_body_en:
        '**15% off everything**. Order before December 22 to make it in time.',
      popup_cta_nl: 'Shop met 15% korting',
      popup_cta_en: 'Shop with 15% off',
      suggested_promo_code: 'XMAS15',
    },
  },
  {
    key: 'valentijn',
    label: 'Valentijn',
    emoji: '💕',
    defaults: {
      namePrefix: 'Valentijn',
      slugBase: 'valentijn',
      theme_color: '#E94B7B',
      theme_text_color: '#FFFFFF',
      theme_accent_color: '#000000',
      banner_message_nl: '💕 VALENTIJN: GRATIS GIFTWRAP MET CODE VAL2026',
      banner_message_en: '💕 VALENTINE’S: FREE GIFT WRAP WITH CODE VAL2026',
      banner_cta_nl: 'Shop voor Valentijn',
      banner_cta_en: 'Shop for Valentine’s',
      banner_link_url: '/shop',
      popup_title_nl: 'Verras je Valentijn',
      popup_title_en: 'Surprise your Valentine',
      popup_body_nl:
        'Vier samen met **gratis giftwrap** plus **10% korting** op alle MOSE-stukken.',
      popup_body_en:
        'Celebrate together with **free gift wrap** and **10% off** every MOSE piece.',
      popup_cta_nl: 'Shop nu',
      popup_cta_en: 'Shop now',
      suggested_promo_code: 'VAL2026',
    },
  },
  {
    key: 'moederdag',
    label: 'Moederdag',
    emoji: '💐',
    defaults: {
      namePrefix: 'Moederdag',
      slugBase: 'moederdag',
      theme_color: '#F4A8C7',
      theme_text_color: '#000000',
      theme_accent_color: '#00A676',
      banner_message_nl: '💐 MOEDERDAG: 12% KORTING MET CODE MOM12',
      banner_message_en: '💐 MOTHER’S DAY: 12% OFF WITH CODE MOM12',
      banner_cta_nl: 'Vind iets voor mam',
      banner_cta_en: 'Find a gift for mum',
      banner_link_url: '/shop',
      popup_title_nl: 'Voor de allerliefste',
      popup_title_en: 'For the one and only',
      popup_body_nl:
        'Verras moeder met iets dat blijft. **12% korting** op alles dit weekend.',
      popup_body_en:
        'Spoil mum with something that lasts. **12% off everything** this weekend.',
      popup_cta_nl: 'Shop met 12% korting',
      popup_cta_en: 'Shop with 12% off',
      suggested_promo_code: 'MOM12',
    },
  },
  {
    key: 'zomersale',
    label: 'Zomersale',
    emoji: '☀️',
    defaults: {
      namePrefix: 'Zomersale',
      slugBase: 'zomersale',
      theme_color: '#F4A700',
      theme_text_color: '#000000',
      theme_accent_color: '#00A676',
      banner_message_nl: '☀️ ZOMERSALE: 20% KORTING MET CODE SUMMER20',
      banner_message_en: '☀️ SUMMER SALE: 20% OFF WITH CODE SUMMER20',
      banner_cta_nl: 'Shop nu',
      banner_cta_en: 'Shop now',
      banner_link_url: '/shop',
      popup_title_nl: 'Zomersale',
      popup_title_en: 'Summer sale',
      popup_body_nl:
        '**20% korting** op alles, even kort, even zonnig. Pak ’m nu het nog kan.',
      popup_body_en:
        '**20% off everything**, brief and bright. Grab it while it’s here.',
      popup_cta_nl: 'Shop met 20% korting',
      popup_cta_en: 'Shop with 20% off',
      suggested_promo_code: 'SUMMER20',
    },
  },
  {
    key: 'birthday-mose',
    label: 'MOSE-verjaardag',
    emoji: '🎂',
    defaults: {
      namePrefix: 'MOSE-verjaardag',
      slugBase: 'mose-verjaardag',
      theme_color: '#00A676',
      theme_text_color: '#FFFFFF',
      theme_accent_color: '#000000',
      banner_message_nl: '🎂 MOSE WORDT JARIG: 10% KORTING MET CODE MOSE10',
      banner_message_en: '🎂 MOSE BIRTHDAY: 10% OFF WITH CODE MOSE10',
      banner_cta_nl: 'Vier mee',
      banner_cta_en: 'Celebrate',
      banner_link_url: '/shop',
      popup_title_nl: 'Wij vieren, jij scoort',
      popup_title_en: 'We celebrate, you score',
      popup_body_nl:
        'MOSE viert zichzelf met **10% korting** op alle stukken. Bedankt voor het meegroeien.',
      popup_body_en:
        'MOSE is celebrating with **10% off** everything. Thanks for growing with us.',
      popup_cta_nl: 'Shop met 10% korting',
      popup_cta_en: 'Shop with 10% off',
      suggested_promo_code: 'MOSE10',
    },
  },
]
