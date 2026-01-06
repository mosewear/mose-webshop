/**
 * Script to convert logos to base64 for inline embedding in emails
 * Run with: npx tsx scripts/convert-logos-to-base64.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const logoBlack = readFileSync(join(process.cwd(), 'public', 'logomose.png'))
const logoWhite = readFileSync(join(process.cwd(), 'public', 'logomose_white.png'))

const base64Black = logoBlack.toString('base64')
const base64White = logoWhite.toString('base64')

const logoData = {
  black: `data:image/png;base64,${base64Black}`,
  white: `data:image/png;base64,${base64White}`
}

const outputPath = join(process.cwd(), 'src', 'lib', 'email-logos.json')
writeFileSync(outputPath, JSON.stringify(logoData, null, 2))

console.log('✅ Logos converted to base64 and saved to email-logos.json')
console.log(`📏 Black logo size: ${(base64Black.length / 1024).toFixed(2)} KB`)
console.log(`📏 White logo size: ${(base64White.length / 1024).toFixed(2)} KB`)

