import { expect, it } from 'vitest'
import { formatColorLabel } from '@/lib/product-display'
import { vertaalKleur } from '@/lib/kleurnaam'
it('uses one bilingual colour vocabulary for supplier colours and local stock across catalog and cart', () => {
 for (const [source, nl, en] of [['Black','Zwart','Black'],['Zilver','Zilver','Silver'],['Coffee','Koffiebruin','Coffee'],['White with Black','Wit / zwart','White / black'],['Gray Green','Grijsgroen','Grey green'],['Light Blue','Lichtblauw','Light blue']]) {
  expect(vertaalKleur(source,'nl')).toBe(nl)
  expect(formatColorLabel(source,'nl')).toBe(nl.toUpperCase())
  expect(formatColorLabel(source,'en')).toBe(en.toUpperCase())
 }
 expect(vertaalKleur('Future shade','nl')).toBe('Future shade')
})
