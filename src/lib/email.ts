import { Resend } from 'resend'
import { readFileSync } from 'fs'
import { join } from 'path'
import { getSiteSettings } from './settings'

const resend = new Resend(process.env.RESEND_API_KEY)

// Base64 encoded logos (embedded directly in email for 100% compatibility)
// Note: light mode = zwarte header = wit logo, dark mode = donkere achtergrond = zwart logo
function getBase64Logos(): { light: string; dark: string } {
  try {
    // In production/build, use process.cwd() or absolute paths
    const publicPath = process.cwd()
    const logoZwartPath = join(publicPath, 'public', 'logomose.png') // Zwart logo voor dark mode
    const logoWitPath = join(publicPath, 'public', 'logomose_white.png') // Wit logo voor light mode
    
    const logoZwart = readFileSync(logoZwartPath)
    const logoWit = readFileSync(logoWitPath)
    
    return {
      light: `data:image/png;base64,${logoWit.toString('base64')}`, // Light mode = zwarte header = wit logo
      dark: `data:image/png;base64,${logoZwart.toString('base64')}` // Dark mode = donkere achtergrond = zwart logo
    }
  } catch (error) {
    console.error('Error reading logo files:', error)
    // Fallback to URLs if files can't be read
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
    return {
      light: `${siteUrl}/logomose_white.png`, // Light mode = wit logo
      dark: `${siteUrl}/logomose.png` // Dark mode = zwart logo
    }
  }
}

// Helper function to normalize image URLs (ensure absolute URLs)
function normalizeImageUrl(url: string | undefined, siteUrl: string): string {
  if (!url) return ''
  
  // Clean up whitespace
  url = url.trim()
  
  // Skip placeholder images
  if (url === '/placeholder.png' || url === '/placeholder-product.png' || url === '') {
    return ''
  }
  
  // If already absolute URL (http/https), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Handle Supabase storage URLs that might be missing protocol
  if (url.includes('supabase') && url.includes('storage')) {
    if (!url.startsWith('http')) {
      return `https://${url}`
    }
    return url
  }
  
  // If relative URL starts with /, make it absolute
  if (url.startsWith('/')) {
    return `${siteUrl}${url}`
  }
  
  // If no leading slash, add it
  return `${siteUrl}/${url}`
}

// Helper function to create logo image tag with dark mode support (using base64 embedded images)
function createLogoTag(siteUrl: string, width: number = 140, height: number | 'auto' = 'auto'): string {
  const logos = getBase64Logos()
  const heightAttr = height === 'auto' ? '' : ` height="${height}"`
  const heightStyle = height === 'auto' ? 'height: auto;' : `height: ${height}px;`
  
  return `
    <img 
      src="${logos.light}" 
      alt="MOSE" 
      width="${width}"${heightAttr}
      style="width: ${width}px; ${heightStyle} display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; max-width: ${width}px;"
      role="presentation"
      class="logo-light"
    />
    <img 
      src="${logos.dark}" 
      alt="MOSE" 
      width="${width}"${heightAttr}
      style="width: ${width}px; ${heightStyle} display: none; margin: 0 auto; border: 0; outline: none; text-decoration: none; max-width: ${width}px;"
      role="presentation"
      class="logo-dark"
    />
  `
}

// Helper function to convert image URL to base64 (for product images in emails)
async function getImageAsBase64(imageUrl: string | undefined, siteUrl: string): Promise<string | null> {
  if (!imageUrl) return null
  
  try {
    // Normalize URL - clean up any whitespace
    let url = imageUrl.trim()
    
    // Skip if URL is empty or just a placeholder
    if (!url || url === '/placeholder.png' || url === '/placeholder-product.png') {
      return null
    }
    
    // If already absolute URL (http/https), use as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // For Supabase storage URLs, ensure they're publicly accessible
      if (url.includes('supabase') && url.includes('storage')) {
        // Supabase storage URLs should already be public, but if they're not, we'll try anyway
        // The URL format is usually: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
      }
    } else {
      // Convert relative URL to absolute
      url = `${siteUrl}${url.startsWith('/') ? url : '/' + url}`
    }
    
    // Try to read from local file system first (for public folder images)
    if (url.includes(siteUrl) && !url.includes('supabase') && !url.includes('storage')) {
      try {
        const relativePath = url.replace(siteUrl, '').replace(/^\//, '')
        const publicPath = process.cwd()
        const imagePath = join(publicPath, 'public', relativePath)
        const imageBuffer = readFileSync(imagePath)
        const mimeType = relativePath.endsWith('.png') ? 'image/png' 
          : relativePath.endsWith('.jpg') || relativePath.endsWith('.jpeg') ? 'image/jpeg'
          : relativePath.endsWith('.webp') ? 'image/webp'
          : 'image/png'
        return `data:${mimeType};base64,${imageBuffer.toString('base64')}`
      } catch (localError) {
        // Fall through to fetch if local read fails
        console.log(`Local file read failed for ${url}, trying fetch instead`)
      }
    }
    
    // Fetch from URL and convert to base64
    // Use a timeout and proper headers for better compatibility
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MOSE-Email-Client/1.0)',
          'Accept': 'image/*',
        },
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        console.error(`Failed to fetch image: ${url} - ${response.status} ${response.statusText}`)
        return null
      }
      
      const arrayBuffer = await response.arrayBuffer()
      
      if (arrayBuffer.byteLength === 0) {
        console.error(`Empty response for image: ${url}`)
        return null
      }
      
      const buffer = Buffer.from(arrayBuffer)
      const mimeType = response.headers.get('content-type') || 
        (url.endsWith('.png') ? 'image/png' 
          : url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg'
          : url.endsWith('.webp') ? 'image/webp'
          : 'image/png')
      
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.error(`Timeout fetching image: ${url}`)
      } else {
        console.error(`Error fetching image: ${url}`, fetchError.message)
      }
      return null
    }
  } catch (error: any) {
    console.error(`Error converting image to base64: ${imageUrl}`, error?.message || error)
    return null
  }
}

// Helper function to create safe image tag with base64 embedded (email-safe, 100% compatible)
async function createProductImageTag(imageUrl: string | undefined, alt: string, width: number, height: number, siteUrl: string, additionalStyles?: string): Promise<string> {
  if (!imageUrl || imageUrl.trim() === '') {
    return ''
  }
  
  // Clean up the URL
  const cleanUrl = imageUrl.trim()
  
  // Try to get base64 version first (most reliable for emails)
  const base64Image = await getImageAsBase64(cleanUrl, siteUrl)
  
  // Fallback to normalized absolute URL if base64 conversion fails
  const normalizedUrl = normalizeImageUrl(cleanUrl, siteUrl)
  const src = base64Image || normalizedUrl
  
  // If we have neither base64 nor a valid URL, return empty string
  if (!src || src.trim() === '') {
    console.warn(`No valid image source for: ${imageUrl}`)
    return ''
  }
  
  const styles = `width: ${width}px; height: ${height}px; display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; object-fit: cover; ${additionalStyles || ''}`
  return `<img src="${src}" alt="${alt.replace(/"/g, '&quot;')}" width="${width}" height="${height}" style="${styles}" role="presentation" />`
}

// Helper function to create safe image tag with all required attributes (for non-product images)
function createImageTag(src: string, alt: string, width: number, height?: number | 'auto', additionalStyles?: string): string {
  if (!src) return ''
  const normalizedSrc = src.startsWith('http') ? src : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'}${src.startsWith('/') ? src : '/' + src}`
  const heightAttr = height === 'auto' ? '' : height ? ` height="${height}"` : ''
  const heightStyle = height === 'auto' ? 'height: auto;' : height ? `height: ${height}px;` : ''
  const styles = `width: ${width}px; ${heightStyle} display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; max-width: 100%; ${additionalStyles || ''}`
  return `<img src="${normalizedSrc}" alt="${alt.replace(/"/g, '&quot;')}" width="${width}"${heightAttr} style="${styles}" role="presentation" />`
}

// Helper function to create Lucide icon SVG (email-safe)
function createLucideIcon(iconName: 'check' | 'truck' | 'settings' | 'x' | 'shopping-cart' | 'package' | 'check-circle', size: number = 32, color: string = '#ffffff'): string {
  const icons: Record<string, string> = {
    'check': '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="m9 11 3 3L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    'truck': '<path d="M16 3h5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M8 3H3v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 22h-4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/>',
    'x': '<path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    'shopping-cart': '<circle cx="8" cy="21" r="1" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="19" cy="21" r="1" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    'package': '<path d="m7.5 4.27 9 5.15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M21 8.77v5.23a2 2 0 0 1-1.11 1.79l-8 4.44a2 2 0 0 1-1.78 0l-8-4.44A2 2 0 0 1 3 14V8.77" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M12 22V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="m3 8.77 9 5.15 9-5.15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  }
  
  const path = icons[iconName] || icons['check']
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;" role="presentation">
    ${path.replace(/currentColor/g, color)}
  </svg>`
}

// Helper function to create centered icon circle with table layout (email-safe)
function createIconCircle(iconName: 'check' | 'truck' | 'settings' | 'x' | 'shopping-cart' | 'package' | 'check-circle', backgroundColor: string, iconSize: number = 32): string {
  const iconSvg = createLucideIcon(iconName, iconSize, '#ffffff')
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 20px;">
      <tr>
        <td align="center" style="padding: 0;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
            <tr>
              <td align="center" valign="middle" style="width: 72px; height: 72px; background-color: ${backgroundColor}; border-radius: 50%; box-shadow: 0 6px 16px rgba(0,0,0,0.15); padding: 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" height="100%">
                  <tr>
                    <td align="center" valign="middle" style="padding: 0;">
                      ${iconSvg}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

// Helper function to create inline checkmark using Unicode (100% email-safe, works everywhere)
function createCheckmark(color: string = '#2ECC71', size: number = 18): string {
  return `<span style="color: ${color}; font-size: ${size}px; font-weight: 900; line-height: 1; display: inline-block; vertical-align: middle;">✓</span>`
}

// Helper function to create email footer with dynamic settings
async function createEmailFooter(siteUrl: string): Promise<string> {
  const settings = await getSiteSettings()
  const addressParts = settings.contact_address.split(',').map(s => s.trim())
  const addressDisplay = addressParts.join(' • ')
  
  return `
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • ${addressDisplay}</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:${settings.contact_email}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_email}</a> • <a href="tel:${settings.contact_phone.replace(/\s/g, '')}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_phone}</a></p>
    </div>
  `
}

// Shared email styles - consistent across all emails
const EMAIL_STYLES = `
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; }
  .wrapper { max-width: 600px; margin: 0 auto; }
  .logo-bar { padding: 24px; text-align: center; background: #000; }
  .logo-bar img { max-width: 140px; display: block; margin: 0 auto; }
  .logo-bar .logo-light { display: block !important; }
  .logo-bar .logo-dark { display: none !important; }
  .hero { padding: 50px 20px 40px; text-align: center; background: linear-gradient(180deg, #fff 0%, #fafafa 100%); }
  .icon-circle { width: 72px; height: 72px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
  .icon-success { background: #2ECC71; }
  .icon-processing { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
  .icon-shipping { background: #FF9500; }
  .icon-delivered { background: #2ECC71; }
  .icon-cancelled { background: #e74c3c; }
  h1 { margin: 0 0 10px; font-size: 44px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
  .hero-sub { font-size: 15px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .hero-text { font-size: 14px; color: #999; }
  .order-badge { background: #000; color: #fff; padding: 10px 24px; display: inline-block; margin-top: 20px; font-family: monospace; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; }
  .content { padding: 32px 20px; }
  .section-title { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; margin-top: 28px; }
  .info-box { background: #f8f8f8; padding: 20px; border-left: 3px solid #2ECC71; margin: 16px 0; }
  .info-box h3 { margin-top: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; }
  .tracking-box { background: #000; color: #fff; padding: 28px 24px; border-radius: 8px; margin: 20px 0; text-align: center; }
  .tracking-code { font-size: 24px; font-weight: 900; letter-spacing: 3px; font-family: monospace; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 4px; }
  .carrier-badge { display: inline-block; background: #2ECC71; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .button { display: inline-block; background: #2ECC71; color: #fff; padding: 15px 32px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin: 16px 0; transition: all 0.3s; font-size: 13px; }
  .button:hover { background: #27ae60; }
  .button-secondary { background: #000; }
  .button-secondary:hover { background: #333; }
  .summary { background: #000; color: #fff; padding: 28px 24px; margin-top: 28px; }
  .sum-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 16px; text-align: center; }
  .sum-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
  .sum-btw { font-size: 13px; color: #999; }
  .sum-divider { border-top: 1px solid #333; margin: 12px 0; }
  .sum-grand { font-size: 28px; font-weight: 900; padding-top: 12px; text-align: center; }
  .footer { background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px; }
  .footer strong { color: #fff; }
  .footer a { color: #2ECC71; font-weight: 600; text-decoration: none; }
  .product { background: #f8f8f8; padding: 16px; border-left: 3px solid #2ECC71; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
  .prod-img { width: 60px; height: 80px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; }
  .prod-info { flex: 1; }
  .prod-name { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
  .prod-meta { font-size: 12px; color: #666; }
  .prod-price { font-size: 17px; font-weight: 900; }
  .discount-highlight { background: #2ECC71; color: #fff; padding: 24px; border-radius: 8px; text-align: center; margin: 20px 0; }
  .discount-code { font-size: 32px; font-weight: 900; letter-spacing: 4px; font-family: monospace; background: rgba(255,255,255,0.2); padding: 16px 28px; border-radius: 6px; display: inline-block; margin: 12px 0; }
  .checklist { list-style: none; padding: 0; }
  .checklist li { padding: 10px 0; padding-left: 0; }
  .icon-cart { background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%); }
  .urgency-banner { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); color: #fff; padding: 20px; text-align: center; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
  .cart-items { background: #f8f8f8; padding: 20px; margin: 20px 0; border-left: 3px solid #FF6B6B; }
  .testimonial { background: #f0f9f4; padding: 20px; border-left: 3px solid #2ECC71; margin: 20px 0; font-style: italic; }

  @media (prefers-color-scheme: dark) {
    body { background: #1a1a1a !important; color: #e0e0e0 !important; }
    .wrapper { background: #1a1a1a !important; }
    .content { background: #1a1a1a !important; color: #e0e0e0 !important; }
    .hero { background: #1a1a1a !important; }
    h1 { color: #ffffff !important; }
    .hero-sub { color: #cccccc !important; }
    .hero-text { color: #aaaaaa !important; }
    .info-box { background: #2a2a2a !important; border-left-color: #2ECC71 !important; }
    .info-box h3 { color: #ffffff !important; }
    .info-box p { color: #e0e0e0 !important; }
    .summary { background: #000000 !important; color: #ffffff !important; }
    .sum-label { color: #999 !important; }
    .sum-line { color: #ffffff !important; }
    .sum-btw { color: #999 !important; }
    .product { background: #2a2a2a !important; border-left-color: #2ECC71 !important; }
    .prod-img { background: #1a1a1a !important; border-color: #444 !important; }
    .prod-name { color: #ffffff !important; }
    .prod-meta { color: #cccccc !important; }
    .prod-price { color: #ffffff !important; }
    .section-title { color: #ffffff !important; }
    .testimonial { background: #2a2a2a !important; color: #e0e0e0 !important; border-left-color: #2ECC71 !important; }
    .cart-items { background: #2a2a2a !important; border-left-color: #FF6B6B !important; }
    p { color: #e0e0e0 !important; }
    a { color: #2ECC71 !important; }
    strong { color: #ffffff !important; }
    .logo-bar { background: #1a1a1a !important; }
    .logo-bar .logo-light { display: none !important; }
    .logo-bar .logo-dark { display: block !important; }
    .footer .logo-light { display: none !important; }
    .footer .logo-dark { display: block !important; }
  }
`

interface OrderEmailProps {
  customerName: string
  customerEmail: string
  orderId: string
  orderTotal: number
  orderItems: {
    name: string
    size: string
    color: string
    quantity: number
    price: number
    imageUrl?: string
  }[]
  shippingAddress: {
    name: string
    address: string
    city: string
    postalCode: string
  }
}

export async function sendOrderConfirmationEmail(props: OrderEmailProps) {
  const { customerName, customerEmail, orderId, orderTotal, orderItems, shippingAddress } = props
  
  // BTW berekening (21%)
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = orderTotal - subtotal
  const totalExclBtw = orderTotal / 1.21
  const btw = orderTotal - totalExclBtw
  const subtotalExclBtw = subtotal / 1.21
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  
  // Convert product images to base64
  const productItemsHtml = await Promise.all(orderItems.map(async (item) => {
    const imageTag = await createProductImageTag(item.imageUrl, item.name, 60, 80, siteUrl, 'object-fit: cover;')
    return {
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      total: (item.price * item.quantity).toFixed(2),
      imageTag
    }
  }))

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('check-circle', '#2ECC71', 38)}
      <h1>BEDANKT!</h1>
      <div class="hero-sub">Bestelling Geplaatst</div>
      <div class="hero-text">Hey ${customerName}, we gaan voor je aan de slag</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">Jouw Items</div>
      ${productItemsHtml.map(item => `
        <div class="product">
          <div class="prod-img" style="width: 60px; height: 80px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; overflow: hidden;">
            ${item.imageTag || ''}
          </div>
          <div class="prod-info">
            <div class="prod-name">${item.name}</div>
            <div class="prod-meta">Maat ${item.size} • ${item.color} • ${item.quantity}x stuks</div>
          </div>
          <div class="prod-price">€${item.total}</div>
        </div>
      `).join('')}
      
      <div class="summary">
        <div class="sum-label">Betaaloverzicht</div>
        <div class="sum-line">
          <span>Subtotaal (excl. BTW)</span>
          <span style="font-weight:600">€${subtotalExclBtw.toFixed(2)}</span>
        </div>
        <div class="sum-line sum-btw">
          <span>BTW (21%)</span>
          <span>€${btw.toFixed(2)}</span>
        </div>
        <div class="sum-line">
          <span>Verzendkosten</span>
          <span style="font-weight:600">€${shipping.toFixed(2)}</span>
        </div>
        <div class="sum-divider"></div>
        <div class="sum-grand">€${orderTotal.toFixed(2)}</div>
        <div style="text-align:center;font-size:12px;color:#2ECC71;margin-top:8px;font-weight:600;letter-spacing:1px">TOTAAL BETAALD</div>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Bestelling bevestiging #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending order confirmation email:', error)
      return { success: false, error }
    }

    console.log('✅ Order confirmation email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendShippingConfirmationEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  trackingCode: string
  trackingUrl?: string
  carrier?: string
  estimatedDelivery?: string
}) {
  const { customerEmail, customerName, orderId, trackingCode, trackingUrl, carrier, estimatedDelivery } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

  // Format delivery date
  let deliveryText = '2-3 werkdagen'
  if (estimatedDelivery) {
    try {
      const date = new Date(estimatedDelivery)
      deliveryText = date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
    } catch (e) {
      deliveryText = estimatedDelivery
    }
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('truck', '#FF9500', 42)}
      <h1>ONDERWEG!</h1>
      <div class="hero-sub">Je Pakket Is Verzonden</div>
      <div class="hero-text">Hey ${customerName}, je bestelling komt eraan</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">Tracking Informatie</div>
      ${carrier ? `<div class="carrier-badge">${carrier}</div>` : ''}
      
      <div class="tracking-box">
        <div style="font-size: 13px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Track & Trace Code</div>
        <div class="tracking-code">${trackingCode}</div>
        ${trackingUrl ? `<a href="${trackingUrl}" class="button" style="color:#fff;text-decoration:none;">VOLG JE BESTELLING</a>` : ''}
      </div>
      
      <div class="info-box">
        <h3>Verwachte Levering</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: 600;">${deliveryText}</p>
      </div>
      
      <div class="section-title">Handige Tips</div>
      <ul class="checklist">
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Zorg dat iemand thuis is om het pakket in ontvangst te nemen</td>
            </tr>
          </table>
        </li>
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Controleer je brievenbus voor een bezorgkaartje</td>
            </tr>
          </table>
        </li>
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Je ontvangt een melding zodra het in de buurt is</td>
            </tr>
          </table>
        </li>
      </ul>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Je bestelling is verzonden #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending shipping confirmation email:', error)
      return { success: false, error }
    }

    console.log('✅ Shipping confirmation email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendOrderProcessingEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  orderTotal: number
  estimatedShipDate?: string
}) {
  const { customerEmail, customerName, orderId, orderTotal, estimatedShipDate } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('settings', '#667eea', 42)}
      <h1>IN BEHANDELING</h1>
      <div class="hero-sub">We Pakken Je Order In</div>
      <div class="hero-text">Hey ${customerName}, we zijn voor je aan de slag!</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">Wat Gebeurt Er Nu?</div>
      <ul class="checklist">
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Je betaling is ontvangen en bevestigd</td>
            </tr>
          </table>
        </li>
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">We pakken je items zorgvuldig in</td>
            </tr>
          </table>
        </li>
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Je ontvangt een tracking code zodra we verzenden</td>
            </tr>
          </table>
        </li>
      </ul>
      
      <div class="info-box">
        <h3>Verwachte Verzending</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: 600;">${estimatedShipDate || 'Binnen 1-2 werkdagen'}</p>
      </div>
      
      <div class="summary">
        <div class="sum-label">Order Overzicht</div>
        <div class="sum-line">
          <span>Order nummer</span>
          <span style="font-weight:600;font-family:monospace">#${orderId.slice(0,8).toUpperCase()}</span>
        </div>
        <div class="sum-divider"></div>
        <div class="sum-grand">€${orderTotal.toFixed(2)}</div>
        <div style="text-align:center;font-size:12px;color:#2ECC71;margin-top:8px;font-weight:600;letter-spacing:1px">TOTAAL BETAALD</div>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Je bestelling wordt voorbereid #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending processing email:', error)
      return { success: false, error }
    }

    console.log('✅ Order processing email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendOrderDeliveredEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  orderItems: Array<{
    product_id: string
    product_name: string
    image_url?: string
  }>
  shippingAddress?: any
  deliveryDate?: string
}) {
  const { customerEmail, customerName, orderId, orderItems, deliveryDate } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

  // Format delivery date
  let dateText = 'vandaag'
  if (deliveryDate) {
    try {
      const date = new Date(deliveryDate)
      dateText = date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch (e) {
      dateText = deliveryDate
    }
  }

  // Convert product images to base64
  const orderItemsWithImages = await Promise.all((orderItems || []).map(async (item) => {
    const imageTag = await createProductImageTag(item.image_url, item.product_name, 60, 80, siteUrl, 'object-fit: cover;')
    return { ...item, imageTag }
  }))

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('check-circle', '#2ECC71', 46)}
      <h1>BEZORGD!</h1>
      <div class="hero-sub">Je Pakket Is Aangekomen</div>
      <div class="hero-text">Hey ${customerName}, geniet van je nieuwe items!</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #2ECC71; text-align: center;">
        <h3 style="text-align: center;">
          <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
            <tr>
              <td valign="middle" style="padding-right: 8px; vertical-align: middle;">${createCheckmark('#2ECC71', 20)}</td>
              <td valign="middle" style="vertical-align: middle;">Afgeleverd op ${dateText}</td>
            </tr>
          </table>
        </h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">We hopen dat alles in perfecte staat is aangekomen!</p>
      </div>
      
      ${orderItemsWithImages && orderItemsWithImages.length > 0 ? `
      <div class="section-title">Je Bestelde Items</div>
      ${orderItemsWithImages.map(item => `
        <div class="product">
          <div class="prod-img" style="width: 60px; height: 80px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; overflow: hidden;">
            ${item.imageTag || ''}
          </div>
          <div class="prod-info">
            <div class="prod-name">${item.product_name}</div>
          </div>
        </div>
      `).join('')}
      ` : ''}
      
      <div class="section-title">Deel Je Ervaring</div>
      <div style="background: #f8f8f8; padding: 24px; text-align: center; border-radius: 8px; margin: 16px 0;">
        <div style="font-size: 36px; margin-bottom: 12px; color: #FFD700;">★★★★★</div>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #666;">Wat vind je van je bestelling?</p>
        <a href="${siteUrl}/contact" class="button" style="color:#fff;text-decoration:none;">SCHRIJF EEN REVIEW</a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #999;">Help andere klanten met hun keuze</p>
      </div>
      
      <div class="section-title">Verzorgingstips</div>
      <ul class="checklist">
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Was je MOSE items op 30°C voor het beste resultaat</td>
            </tr>
          </table>
        </li>
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Hang je kledingstukken te drogen (niet in de droger)</td>
            </tr>
          </table>
        </li>
        <li style="padding: 10px 0; padding-left: 0;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
              <td valign="top" style="vertical-align: top;">Lees altijd het waslabel voor specifieke instructies</td>
            </tr>
          </table>
        </li>
      </ul>
      
      <div style="background: #000; color: #fff; padding: 28px 24px; text-align: center; margin-top: 28px; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Maak Je Look Compleet</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #999;">Ontdek meer items uit onze collectie</p>
        <a href="${siteUrl}/shop" class="button" style="color:#fff;text-decoration:none;">BEKIJK SHOP</a>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Je pakket is bezorgd #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending delivered email:', error)
      return { success: false, error }
    }

    console.log('✅ Order delivered email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendOrderCancelledEmail(props: {
  customerEmail: string
  customerName: string
  orderId: string
  orderTotal: number
  cancellationReason?: string
}) {
  const { customerEmail, customerName, orderId, orderTotal, cancellationReason } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('x', '#e74c3c', 42)}
      <h1>GEANNULEERD</h1>
      <div class="hero-sub">Order Geannuleerd</div>
      <div class="hero-text">Hey ${customerName}, je order is geannuleerd</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #e74c3c; background: #fff3f3;">
        <h3>Order Details</h3>
        ${cancellationReason ? `<p style="margin: 8px 0; font-size: 14px;"><strong>Reden:</strong> ${cancellationReason}</p>` : ''}
        <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Bedrag:</strong> €${orderTotal.toFixed(2)}</p>
      </div>
      
      <div class="section-title">Terugbetaling</div>
      <p style="font-size: 15px; line-height: 1.6; color: #333;">Je betaling wordt automatisch teruggestort naar je originele betaalmethode binnen <strong>3-5 werkdagen</strong>. Afhankelijk van je bank kan het iets langer duren voordat het bedrag zichtbaar is op je rekening.</p>
      
      <div class="discount-highlight">
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Onze Excuses</h3>
        <p style="margin: 0 0 16px 0; font-size: 15px; opacity: 0.95;">Als excuus bieden we je <strong>10% korting</strong> op je volgende bestelling:</p>
        <div class="discount-code">SORRY10</div>
        <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 600;">Geldig tot 1 maand na deze email</p>
      </div>
      
      <div style="background: #000; color: #fff; padding: 28px 24px; text-align: center; margin-top: 28px; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Nog Steeds Interesse?</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #999;">Bekijk onze volledige collectie en vind je perfecte MOSE item</p>
        <a href="${siteUrl}/shop" class="button" style="color:#fff;text-decoration:none;">BEKIJK SHOP</a>
      </div>
      
      <div class="info-box" style="margin-top: 28px;">
        <h3>Vragen?</h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Heb je vragen over je annulering? Neem gerust contact met ons op. We helpen je graag!</p>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Order geannuleerd #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending cancelled email:', error)
      return { success: false, error }
    }

    console.log('✅ Order cancelled email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

// =====================================================
// ABANDONED CART EMAIL
// =====================================================

interface AbandonedCartEmailProps {
  customerName: string
  customerEmail: string
  orderId: string
  orderTotal: number
  orderItems: {
    name: string
    size: string
    color: string
    quantity: number
    price: number
    imageUrl?: string
  }[]
  checkoutUrl: string
  hoursSinceAbandoned: number
  freeShippingThreshold?: number
  returnDays?: number
}

export async function sendAbandonedCartEmail(props: AbandonedCartEmailProps) {
  const { 
    customerName, 
    customerEmail, 
    orderId, 
    orderTotal, 
    orderItems, 
    checkoutUrl,
    hoursSinceAbandoned,
    freeShippingThreshold = 100,
    returnDays = 14
  } = props
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const settings = await getSiteSettings()
  
  // Convert product images to base64
  const productItemsHtml = await Promise.all(orderItems.map(async (item) => {
    const imageTag = await createProductImageTag(item.imageUrl, item.name, 60, 80, siteUrl, 'object-fit: cover;')
    return {
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      total: (item.price * item.quantity).toFixed(2),
      imageTag
    }
  }))

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Je MOSE items wachten op je!</title>
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <!-- Logo -->
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">
      ${createLogoTag(siteUrl, 140, 'auto')}
    </div>
    
    <!-- Hero Section -->
    <div class="hero">
      ${createIconCircle('shopping-cart', '#FF9500', 42)}
      <h1>NIET VERGETEN?</h1>
      <div class="hero-sub">Je Winkelwagen Wacht Op Je</div>
      <div class="hero-text">Hey ${customerName}, je hebt nog ${orderItems.length} item${orderItems.length > 1 ? 's' : ''} in je winkelwagen!</div>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Personal Message -->
      <p style="font-size: 15px; line-height: 1.8; color: #444; margin-bottom: 24px;">
        We zagen dat je ${hoursSinceAbandoned > 24 ? 'gisteren' : 'vandaag'} aan het shoppen was bij MOSE, maar je bestelling nog niet hebt afgerond. 
        Geen zorgen - we hebben je items nog voor je gereserveerd!
      </p>


      <!-- Cart Items -->
      <div class="section-title">Jouw Items</div>
      <div style="margin: 20px 0;">
        ${productItemsHtml.map(item => `
          <div class="product" style="margin-bottom: 12px; border-left-color: #FF9500;">
            <div class="prod-img" style="width: 60px; height: 80px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; overflow: hidden;">
              ${item.imageTag || ''}
            </div>
            <div class="prod-info">
              <div class="prod-name">${item.name}</div>
              <div class="prod-meta">Maat ${item.size} • ${item.color} • ${item.quantity}x</div>
            </div>
            <div class="prod-price">€${item.total}</div>
          </div>
        `).join('')}
      </div>

      <!-- Total -->
      <div class="summary">
        <div class="sum-grand">€${orderTotal.toFixed(2)}</div>
        <p style="text-align: center; margin-top: 16px; font-size: 13px; color: #999;">
          Totaalbedrag (incl. BTW)
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${checkoutUrl}" class="button" style="background: #FF9500; color: #fff; font-size: 16px; padding: 18px 48px; text-decoration: none; border-radius: 4px;">
          MAAK BESTELLING AF
        </a>
        <p style="font-size: 12px; color: #999; margin-top: 12px;">
          Klik hier om terug te gaan naar je winkelwagen
        </p>
      </div>

      <!-- Social Proof -->
      <div class="testimonial">
        <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6;">
          "Beste aankoop ooit! De kwaliteit is geweldig en het zit super comfortabel. Krijg constant complimenten!"
        </p>
        <p style="margin: 0; font-size: 12px; color: #666; font-weight: 600;">
          - Lisa, Amsterdam
        </p>
      </div>

      <!-- Why Shop with Us -->
      <div class="info-box" style="border-left-color: #FF9500;">
        <h3 style="color: #FF9500;">Waarom MOSE?</h3>
        <ul class="checklist" style="margin: 12px 0 0 0;">
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#FF9500', 18)}</td>
                <td valign="top" style="vertical-align: top;">Gratis verzending vanaf €${freeShippingThreshold}</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#FF9500', 18)}</td>
                <td valign="top" style="vertical-align: top;">${returnDays} dagen retourrecht</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#FF9500', 18)}</td>
                <td valign="top" style="vertical-align: top;">Duurzame & hoogwaardige materialen</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#FF9500', 18)}</td>
                <td valign="top" style="vertical-align: top;">Snelle levering (1-2 werkdagen)</td>
              </tr>
            </table>
          </li>
        </ul>
      </div>

      <!-- Urgency Reminder -->
      <div style="background: #fff3cd; border-left: 3px solid #ffc107; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #856404; font-weight: 600;">
          <strong>Let op:</strong> Je items blijven nog ${Math.max(1, Math.round(48 - hoursSinceAbandoned))} uur gereserveerd. 
          Daarna kunnen we helaas niet garanderen dat ze nog op voorraad zijn.
        </p>
      </div>

      <!-- Need Help -->
      <div class="info-box" style="margin-top: 28px; border-left-color: #FF9500;">
        <h3 style="color: #FF9500;">Hulp Nodig?</h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
          Twijfel je nog of heb je vragen? Ons team staat voor je klaar!<br>
          <a href="mailto:${settings.contact_email}" style="color: #FF9500; font-weight: 600; text-decoration: none;">${settings.contact_email}</a> • 
          <a href="tel:${settings.contact_phone.replace(/\s/g, '')}" style="color: #FF9500; font-weight: 600; text-decoration: none;">${settings.contact_phone}</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • ${settings.contact_address.split(',').map(s => s.trim()).join(' • ')}</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:${settings.contact_email}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_email}</a> • <a href="tel:${settings.contact_phone.replace(/\s/g, '')}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_phone}</a></p>
      <p style="margin-top: 16px; font-size: 11px; color: #666;">
        Deze email is verzonden omdat je items in je winkelwagen hebt achtergelaten.<br>
        Wil je geen herinneringen meer ontvangen? <a href="${siteUrl}/unsubscribe?email=${customerEmail}" style="color: #888;">Klik hier</a>
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Winkelwagen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `${customerName}, je MOSE items wachten nog op je!`,
      html: htmlContent,
    })

    if (error) {
      console.error('❌ Error sending abandoned cart email:', error)
      return { success: false, error }
    }

    console.log('✅ Abandoned cart email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending abandoned cart email:', error)
    return { success: false, error }
  }
}

export async function sendBackInStockEmail(props: {
  customerEmail: string
  productName: string
  productSlug: string
  productImageUrl?: string
  productPrice: number
  variantInfo?: {
    size: string
    color: string
  }
  freeShippingThreshold?: number
  returnDays?: number
}) {
  const { customerEmail, productName, productSlug, productImageUrl, productPrice, variantInfo, freeShippingThreshold = 100, returnDays = 14 } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const settings = await getSiteSettings()
  const productUrl = `${siteUrl}/product/${productSlug}`
  
  // Convert product image to base64
  const productImageTag = await createProductImageTag(productImageUrl, productName, 80, 100, siteUrl, 'object-fit: cover;')

  const variantText = variantInfo ? `${variantInfo.size} • ${variantInfo.color}` : ''

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('check-circle', '#2ECC71', 42)}
      <h1>WEER OP VOORRAAD!</h1>
      <div class="hero-sub">Je Favoriete Product</div>
      <div class="hero-text">Goed nieuws! ${productName} is weer beschikbaar</div>
    </div>
    <div class="content">
      <div class="section-title">Je Wacht Is Voorbij</div>
      <p style="font-size: 15px; line-height: 1.8; color: #444; margin-bottom: 24px;">
        We hebben goed nieuws! Het product waar je op wachtte is weer op voorraad. 
        ${variantInfo ? `Je hebt aangegeven dat je geïnteresseerd bent in: ${variantText}.` : ''}
      </p>

      <div class="product" style="margin: 24px 0; border-left-color: #2ECC71;">
        ${productImageTag ? `
        <div class="prod-img" style="width: 80px; height: 100px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; overflow: hidden;">
          ${productImageTag}
        </div>
        ` : ''}
        <div class="prod-info">
          <div class="prod-name">${productName}</div>
          ${variantInfo ? `<div class="prod-meta">Maat ${variantInfo.size} • ${variantInfo.color}</div>` : ''}
        </div>
        <div class="prod-price">€${productPrice.toFixed(2)}</div>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${productUrl}" class="button" style="color:#fff;text-decoration:none;">BEKIJK PRODUCT</a>
        <p style="font-size: 12px; color: #999; margin-top: 12px;">
          Bestel nu voordat het weer uitverkocht is
        </p>
      </div>

      <div class="info-box">
        <h3>Waarom Nu Bestellen?</h3>
        <ul class="checklist">
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Beperkte voorraad - dit product is populair!</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Gratis verzending vanaf €${freeShippingThreshold}</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">${returnDays} dagen retourrecht</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Lokaal gemaakt in Groningen</td>
              </tr>
            </table>
          </li>
        </ul>
      </div>

      <div style="background: #fff3cd; border-left: 3px solid #ffc107; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #856404; font-weight: 600;">
          <strong>Let op:</strong> Deze notificatie is éénmalig. Bestel nu om zeker te zijn van je maat en kleur!
        </p>
      </div>
    </div>
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • ${settings.contact_address.split(',').map(s => s.trim()).join(' • ')}</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:${settings.contact_email}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_email}</a> • <a href="tel:${settings.contact_phone.replace(/\s/g, '')}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_phone}</a></p>
      <p style="margin-top: 16px; font-size: 11px; color: #666;">
        Je ontving deze email omdat je aangaf geïnteresseerd te zijn in dit product toen het uitverkocht was.
      </p>
    </div>
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Notificaties <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `${productName} is weer op voorraad! - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending back-in-stock email:', error)
      return { success: false, error }
    }

    console.log('✅ Back-in-stock email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendContactFormEmail(props: {
  name: string
  email: string
  subject: string
  message: string
}) {
  const { name, email, subject, message } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const settings = await getSiteSettings()
  const adminEmail = process.env.CONTACT_EMAIL || settings.contact_email

  const subjectLabels: { [key: string]: string } = {
    order: 'Vraag over bestelling',
    product: 'Vraag over product',
    return: 'Retour of ruil',
    other: 'Iets anders',
  }
  const subjectLabel = subjectLabels[subject] || subject

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff;" data-ogsc="#ffffff">
  <div class="wrapper" style="max-width: 600px; margin: 0 auto;">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">
      ${createLogoTag(siteUrl, 140, 'auto')}
    </div>
    <div class="hero" style="padding: 50px 20px 40px; text-align: center; background: linear-gradient(180deg, #fff 0%, #fafafa 100%);">
      ${createIconCircle('check-circle', '#2ECC71', 38)}
      <h1 style="margin: 0 0 10px; font-size: 44px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px;">NIEUW BERICHT</h1>
      <div class="hero-sub" style="font-size: 15px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Contactformulier</div>
      <div class="hero-text" style="font-size: 14px; color: #999;">Van ${name}</div>
    </div>
    <div class="content" style="padding: 32px 20px;">
      <div class="section-title" style="font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; margin-top: 28px;">Contactgegevens</div>
      
      <div class="info-box" style="background: #f8f8f8; padding: 20px; border-left: 3px solid #2ECC71; margin: 16px 0;">
        <h3 style="margin-top: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Van</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.6;">
          <strong style="font-weight: 700;">${name}</strong><br>
          <a href="mailto:${email}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${email}</a>
        </p>
      </div>

      <div class="info-box" style="background: #f8f8f8; padding: 20px; border-left: 3px solid #2ECC71; margin: 16px 0;">
        <h3 style="margin-top: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Onderwerp</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: 600; line-height: 1.6;">${subjectLabel}</p>
      </div>

      <div class="info-box" style="background: #f8f8f8; padding: 20px; border-left: 3px solid #2ECC71; margin: 16px 0;">
        <h3 style="margin-top: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">Bericht</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.8; color: #444; white-space: pre-wrap;">${message}</p>
      </div>

      <div style="background: #f8f8f8; padding: 20px; margin: 24px 0; border-left: 3px solid #2ECC71;">
        <p style="margin: 0; font-size: 13px; color: #666; line-height: 1.6;">
          <strong style="font-weight: 700;">Antwoord:</strong> Je kunt direct antwoorden op deze email om contact op te nemen met ${name}.
        </p>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return { success: false, error: 'Email service not configured' }
    }

    const { data, error } = await resend.emails.send({
      from: 'MOSE Contact <contact@orders.mosewear.nl>',
      to: [adminEmail],
      replyTo: email,
      subject: `Contactformulier: ${subjectLabel} - ${name}`,
      html: htmlContent,
      headers: {
        'X-Entity-Ref-ID': `contact-${Date.now()}`,
      },
    })

    if (error) {
      console.error('Error sending contact form email:', error)
      return { success: false, error }
    }

    console.log('✅ Contact form email sent:', data)
    return { success: true, data }
  } catch (error: any) {
    console.error('Error sending email:', error)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

// =====================================================
// RETURN EMAILS
// =====================================================

export async function sendReturnRequestedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  returnReason: string
  returnItems: Array<{
    product_name: string
    quantity: number
    size: string
    color: string
  }>
}) {
  const { customerEmail, customerName, returnId, orderId, returnReason, returnItems } = props
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const returnUrl = `${siteUrl}/returns/${returnId}`

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('check-circle', '#2ECC71', 42)}
      <h1>RETOUR AANGEVRAAGD</h1>
      <div class="hero-sub">Je Verzoek Is Ontvangen</div>
      <div class="hero-text">Hey ${customerName}, we hebben je retourverzoek ontvangen</div>
      <div class="order-badge">#${returnId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">Retour Details</div>
      <div class="info-box">
        <h3>Order Nummer</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: 600; font-family: monospace;">#${orderId.slice(0,8).toUpperCase()}</p>
      </div>
      <div class="info-box">
        <h3>Reden</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px;">${returnReason}</p>
      </div>
      <div class="section-title">Retour Items</div>
      ${returnItems.map(item => `
        <div class="product">
          <div class="prod-info">
            <div class="prod-name">${item.product_name}</div>
            <div class="prod-meta">Maat ${item.size} • ${item.color} • ${item.quantity}x</div>
          </div>
        </div>
      `).join('')}
      <div class="info-box" style="border-left-color: #2ECC71; background: #f0fdf4;">
        <h3>Je Retourlabel Wordt Nu Gegeneerd</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.6;">
          Je betaling voor het retourlabel is succesvol ontvangen! We genereren nu je retourlabel. 
          Je ontvangt een email zodra het label klaar is om te downloaden.
        </p>
      </div>
      <div class="info-box" style="border-left-color: #FF9500;">
        <h3>Volgende Stappen</h3>
        <ul class="checklist">
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#FF9500', 18)}</td>
                <td valign="top" style="vertical-align: top;">Download het retourlabel zodra je het ontvangt</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#FF9500', 18)}</td>
                <td valign="top" style="vertical-align: top;">Plak het label op je pakket en stuur het terug</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#FF9500', 18)}</td>
                <td valign="top" style="vertical-align: top;">Na ontvangst beoordelen we de kleding en krijg je een bericht</td>
              </tr>
            </table>
          </li>
        </ul>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${returnUrl}" class="button" style="color:#fff;text-decoration:none;">BEKIJK RETOUR STATUS</a>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Retouren <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Retourverzoek ontvangen #${returnId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending return requested email:', error)
      return { success: false, error }
    }

    console.log('✅ Return requested email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendReturnApprovedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  returnItems: Array<{
    product_name: string
    quantity: number
  }>
  refundAmount: number
}) {
  const { customerEmail, customerName, returnId, orderId, returnItems, refundAmount } = props
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const returnUrl = `${siteUrl}/returns/${returnId}`

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
      <div class="hero">
      ${createIconCircle('check-circle', '#2ECC71', 42)}
      <h1>JE RETOUR IS GOEDGEKEURD!</h1>
      <div class="hero-sub">Je Kleding Is Beoordeeld</div>
      <div class="hero-text">Hey ${customerName}, we hebben je retour ontvangen en goedgekeurd</div>
      <div class="order-badge">#${returnId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #2ECC71; background: #f0fdf4;">
        <h3>Je Terugbetaling Wordt Verwerkt</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.6;">
          We hebben je geretourneerde kleding ontvangen en gecontroleerd. Alles ziet er goed uit! 
          Je terugbetaling wordt nu verwerkt en je ontvangt het geld binnen <strong>3-5 werkdagen</strong> op je rekening.
        </p>
      </div>
      <div class="section-title">Retour Items</div>
      ${returnItems.map(item => `
        <div class="product">
          <div class="prod-info">
            <div class="prod-name">${item.product_name}</div>
            <div class="prod-meta">${item.quantity}x stuks</div>
          </div>
        </div>
      `).join('')}
      <div class="summary">
        <div class="sum-label">Terugbetaling Overzicht</div>
        <div class="sum-line">
          <span>Terug te betalen (items)</span>
          <span style="font-weight:600">€${refundAmount.toFixed(2)}</span>
        </div>
        <div class="sum-line sum-btw" style="font-size: 12px; color: #999;">
          <span>Retourlabel kosten (al betaald)</span>
          <span>€7,87</span>
        </div>
        <div class="sum-divider"></div>
        <div class="sum-grand">€${refundAmount.toFixed(2)}</div>
        <div style="text-align:center;font-size:12px;color:#2ECC71;margin-top:8px;font-weight:600;letter-spacing:1px">TERUG TE BETALEN</div>
      </div>
      <div class="info-box">
        <h3>Wat Gebeurt Er Nu?</h3>
        <ul class="checklist">
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Je terugbetaling wordt verwerkt</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Je ontvangt €${refundAmount.toFixed(2)} teruggestort naar je originele betaalmethode</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Het bedrag is binnen 3-5 werkdagen zichtbaar op je rekening</td>
              </tr>
            </table>
          </li>
        </ul>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${returnUrl}" class="button" style="color:#fff;text-decoration:none;">BEKIJK RETOUR STATUS</a>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Retouren <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Je retour is goedgekeurd - Terugbetaling verwerkt #${returnId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending return approved email:', error)
      return { success: false, error }
    }

    console.log('✅ Return approved email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendReturnLabelGeneratedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  trackingCode: string | null
  trackingUrl: string | null
  labelUrl: string | null
}) {
  const { customerEmail, customerName, returnId, orderId, trackingCode, trackingUrl, labelUrl } = props
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const returnUrl = `${siteUrl}/returns/${returnId}`

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('package', '#2ECC71', 42)}
      <h1>RETOURLABEL BESCHIKBAAR!</h1>
      <div class="hero-sub">Je Kunt Nu Retourneren</div>
      <div class="hero-text">Hey ${customerName}, je retourlabel is klaar</div>
      <div class="order-badge">#${returnId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="tracking-box">
        <div style="font-size: 13px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Retour Tracking Code</div>
        <div class="tracking-code">${trackingCode}</div>
        ${trackingUrl ? `<a href="${trackingUrl}" class="button" style="color:#fff;text-decoration:none;">VOLG JE RETOUR</a>` : ''}
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${labelUrl}" class="button" style="color:#fff;text-decoration:none;background:#000;">DOWNLOAD RETOURLABEL</a>
        <p style="font-size: 12px; color: #999; margin-top: 12px;">
          Print dit label en plak het op je pakket
        </p>
      </div>
      <div class="info-box">
        <h3>Hoe Retourneren?</h3>
        <ul class="checklist">
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Download en print het retourlabel</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Pak je items in de originele verpakking</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Plak het label op je pakket</td>
              </tr>
            </table>
          </li>
          <li style="padding: 10px 0; padding-left: 0;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="24" valign="top" style="padding-right: 10px; vertical-align: top;">${createCheckmark('#2ECC71', 18)}</td>
                <td valign="top" style="vertical-align: top;">Breng je pakket naar een PostNL punt</td>
              </tr>
            </table>
          </li>
        </ul>
      </div>
      <div style="background: #fff3cd; border-left: 3px solid #ffc107; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #856404; font-weight: 600;">
          <strong>Let op:</strong> Zorg dat je items ongedragen zijn en de labels er nog aan zitten. Na ontvangst krijg je binnen 5-7 werkdagen je geld terug.
        </p>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Retouren <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Je retourlabel is klaar #${returnId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
      attachments: labelUrl ? [
        {
          filename: `retourlabel-${returnId.slice(0, 8)}.pdf`,
          path: labelUrl,
        },
      ] : [],
    })

    if (error) {
      console.error('Error sending return label email:', error)
      return { success: false, error }
    }

    console.log('✅ Return label email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendReturnRefundedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  refundAmount: number
}) {
  const { customerEmail, customerName, returnId, orderId, refundAmount } = props
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('check-circle', '#2ECC71', 46)}
      <h1>TERUGBETALING VOLTOOID!</h1>
      <div class="hero-sub">Je Geld Is Teruggestort</div>
      <div class="hero-text">Hey ${customerName}, je retour is verwerkt</div>
      <div class="order-badge">#${returnId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #2ECC71; text-align: center;">
        <h3 style="text-align: center;">
          <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
            <tr>
              <td valign="middle" style="padding-right: 8px; vertical-align: middle;">${createCheckmark('#2ECC71', 20)}</td>
              <td valign="middle" style="vertical-align: middle;">€${refundAmount.toFixed(2)} teruggestort</td>
            </tr>
          </table>
        </h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Het bedrag is teruggestort naar je originele betaalmethode</p>
      </div>
      <div class="summary">
        <div class="sum-label">Terugbetaling Overzicht</div>
        <div class="sum-line">
          <span>Terugbetaald bedrag</span>
          <span style="font-weight:600">€${refundAmount.toFixed(2)}</span>
        </div>
        <div class="sum-line sum-btw" style="font-size: 12px; color: #999;">
          <span>Retourlabel kosten (al betaald)</span>
          <span>€7,87</span>
        </div>
        <div class="sum-divider"></div>
        <div class="sum-grand">€${refundAmount.toFixed(2)}</div>
        <div style="text-align:center;font-size:12px;color:#2ECC71;margin-top:8px;font-weight:600;letter-spacing:1px">TERUGGESTORT</div>
      </div>
      <div class="info-box">
        <h3>Wanneer Zie Je Het Bedrag?</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.6;">
          Het bedrag is teruggestort naar je originele betaalmethode. Afhankelijk van je bank kan het <strong>3-5 werkdagen</strong> duren voordat het bedrag zichtbaar is op je rekening.
        </p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${siteUrl}/shop" class="button" style="color:#fff;text-decoration:none;">VERDER SHOPPEN</a>
      </div>
    </div>
${await createEmailFooter(siteUrl)}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Retouren <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Terugbetaling voltooid #${returnId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending return refunded email:', error)
      return { success: false, error }
    }

    console.log('✅ Return refunded email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

export async function sendReturnRejectedEmail(props: {
  customerEmail: string
  customerName: string
  returnId: string
  orderId: string
  rejectionReason: string
}) {
  const { customerEmail, customerName, returnId, orderId, rejectionReason } = props
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const settings = await getSiteSettings()
  const emailFooter = await createEmailFooter(siteUrl)

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>${EMAIL_STYLES}</style>
</head>
<body data-ogsc="#ffffff">
  <div class="wrapper">
    <div class="logo-bar" style="padding: 24px; text-align: center; background: #000;">${createLogoTag(siteUrl, 140, 'auto')}</div>
    <div class="hero">
      ${createIconCircle('x', '#e74c3c', 42)}
      <h1>RETOUR AFGEWEZEN</h1>
      <div class="hero-sub">Retourverzoek Niet Goedgekeurd</div>
      <div class="hero-text">Hey ${customerName}, je retourverzoek kon niet worden goedgekeurd</div>
      <div class="order-badge">#${returnId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #e74c3c; background: #fff3f3;">
        <h3>Reden van Afwijzing</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.6;">${rejectionReason}</p>
      </div>
      <div class="info-box">
        <h3>Vragen?</h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666; line-height: 1.6;">
          Heb je vragen over deze afwijzing? Neem gerust contact met ons op. We helpen je graag verder!
        </p>
        <p style="margin: 12px 0 0 0;">
          <a href="mailto:${settings.contact_email}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_email}</a> • 
          <a href="tel:${settings.contact_phone.replace(/\s/g, '')}" style="color: #2ECC71; font-weight: 600; text-decoration: none;">${settings.contact_phone}</a>
        </p>
      </div>
    </div>
${emailFooter}
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Retouren <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `Retourverzoek afgewezen #${returnId.slice(0, 8).toUpperCase()} - MOSE`,
      html: htmlContent,
    })

    if (error) {
      console.error('Error sending return rejected email:', error)
      return { success: false, error }
    }

    console.log('✅ Return rejected email sent:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}
