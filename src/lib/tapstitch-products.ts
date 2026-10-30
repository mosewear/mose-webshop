/** Explicit source identities for the approved supplier catalogue.
 * These source IDs are NOT account-specific fulfillment mappings.
 */
export const TAPSTITCH_PRODUCT_SOURCES: Readonly<Record<string, { sourceProductId: string; sourceCode: string; sourcePage: string }>> = {
  "2307a99e-781a-8f4a-9da0-2374d3cb464f": {
    "sourceProductId": "1516805081033580544",
    "sourceCode": "RW0041-P001-V3",
    "sourcePage": "https://www.tapstitch.com/custom/1516805081033580544"
  },
  "39ff9979-e4ff-84b4-8831-cf0b0cc713af": {
    "sourceProductId": "1369643248599044096",
    "sourceCode": "RT0028-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/1369643248599044096"
  },
  "b925b2e2-a147-8cf1-9fcb-47e2ca45ec2f": {
    "sourceProductId": "1488856079197757440",
    "sourceCode": "MB0001-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/1488856079197757440"
  },
  "51c487a8-ca2d-8e2d-82d4-68ab8501b8c9": {
    "sourceProductId": "1549434820000690176",
    "sourceCode": "MB0057-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/1549434820000690176"
  },
  "cb17519f-6662-86fc-894e-92b4e0ccbbb0": {
    "sourceProductId": "1544742753966178304",
    "sourceCode": "UB0083-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/1544742753966178304"
  },
  "1569c48c-5120-8d19-add8-04e24546eee4": {
    "sourceProductId": "1524102391815913472",
    "sourceCode": "MB0030-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/1524102391815913472"
  },
  "6fd7d8dc-ffe1-8efe-8639-f04d1f50dffa": {
    "sourceProductId": "1496881686280081408",
    "sourceCode": "MB0010-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/1496881686280081408"
  },
  "f2ccb146-34b5-8b6f-a779-44f685e090d6": {
    "sourceProductId": "1486330220951773184",
    "sourceCode": "UB0018-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/1486330220951773184"
  },
  "ea0018da-0cf1-426c-90ca-e3be31c7b6a3": {
    "sourceProductId": "1534521211260899328",
    "sourceCode": "R00099-C001-V6",
    "sourcePage": "https://www.tapstitch.com/custom/r00099-acid-wash-oversize-long-sleeve-t-shirt"
  },
  "d4432b58-9b22-4321-9f4e-a2b7a6a3f287": {
    "sourceProductId": "1537861503506665472",
    "sourceCode": "UT0276-C001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/ut0276-unisex-mineral-wash-boxy-waffle-t-shirt"
  },
  "b2c48e1c-5156-488c-8630-d3310080ba79": {
    "sourceProductId": "1532420050923966464",
    "sourceCode": "RT0086-C001-V4",
    "sourcePage": "https://www.tapstitch.com/custom/rt0086-unisex-oversized-t-shirt"
  },
  "3625ae2c-df78-48ce-b547-48e39eb51c7f": {
    "sourceProductId": "1562826538737659904",
    "sourceCode": "UT0289-P001-V4",
    "sourcePage": "https://www.tapstitch.com/custom/ut0289-unisex-fleece-full-zip-hoodie"
  },
  "5d6ea2f4-d8ef-4d60-a6a4-f86690482272": {
    "sourceProductId": "1522631120397766656",
    "sourceCode": "UB0051-P001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/ub0051-unisex-barrel-leg-sweatpants"
  },
  "d3a6ae5f-d370-4e9d-b120-c3c16b105f72": {
    "sourceProductId": "1542124365611745280",
    "sourceCode": "UT0320-P001-V2",
    "sourcePage": "https://www.tapstitch.com/custom/ut0320-unisex-raw-edge-fleece-shorts"
  }
}

export function isTapstitchProduct(product: { id?: string | null }): boolean {
  return typeof product.id === 'string' && Object.prototype.hasOwnProperty.call(TAPSTITCH_PRODUCT_SOURCES, product.id)
}
