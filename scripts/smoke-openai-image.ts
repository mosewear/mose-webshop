import { generateImageWithOpenAI, contentTypeForImageUrl, filenameForImageUrl } from '@/lib/ai/openai-image'
import { downloadToBuffer } from '@/lib/ai/image-utils'

async function main() {
  // Use a tiny canonical photo we know exists — any public mosewear photo.
  const url = 'https://bsklcgeyvdsxjxvmghbp.supabase.co/storage/v1/object/public/product-images/products/1777127303286-w73ri.png'
  console.log(`Downloading reference: ${url}`)
  const buf = await downloadToBuffer(url)
  console.log(`  ${buf.length} bytes`)
  console.log('Calling gpt-image-1-mini (cheap smoke test)...')
  const out = await generateImageWithOpenAI({
    model: 'gpt-image-1-mini',
    prompt: 'A young Dutch model wearing the exact garment from the source photo, walking on an Amsterdam canal street. Natural light, subtle film grain. PRESERVE the garment 1:1.',
    referenceImages: [
      { buffer: buf, contentType: contentTypeForImageUrl(url), filename: filenameForImageUrl(url) },
    ],
    size: '1024x1536',
    quality: 'low',
    n: 1,
  })
  console.log(`OK — ${out.buffer.length} bytes, cost $${out.cost_usd}, model ${out.model}`)
}

main().catch((e) => {
  console.error('FAIL:', e?.message ?? e)
  if (e?.status) console.error('status:', e.status)
  if (e?.details) console.error('details:', JSON.stringify(e.details).slice(0, 800))
  process.exit(1)
})
