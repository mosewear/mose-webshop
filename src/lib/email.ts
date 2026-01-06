import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Helper function to normalize image URLs (ensure absolute URLs)
function normalizeImageUrl(url: string | undefined, siteUrl: string): string {
  if (!url) return ''
  // If already absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // If relative URL, make it absolute
  if (url.startsWith('/')) {
    return `${siteUrl}${url}`
  }
  // If no leading slash, add it
  return `${siteUrl}/${url}`
}

// Helper function to get logo URLs for light and dark mode
function getLogoUrls(siteUrl: string): { light: string; dark: string } {
  return {
    light: normalizeImageUrl('/logomose.png', siteUrl),
    dark: normalizeImageUrl('/logomose_white.png', siteUrl)
  }
}

// Helper function to create logo image tag with dark mode support
function createLogoTag(siteUrl: string, width: number = 140, height: number | 'auto' = 'auto'): string {
  const logos = getLogoUrls(siteUrl)
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

// Helper function to create safe image tag with all required attributes
function createImageTag(src: string, alt: string, width: number, height?: number | 'auto', additionalStyles?: string): string {
  if (!src) return ''
  const heightStyle = height === 'auto' ? 'height: auto;' : height ? `height: ${height}px;` : ''
  const styles = `width: ${width}px; ${heightStyle} display: block; margin: 0 auto; border: 0; outline: none; text-decoration: none; ${additionalStyles || ''}`
  return `<img src="${src}" alt="${alt.replace(/"/g, '&quot;')}" width="${width}" ${height && height !== 'auto' ? `height="${height}"` : ''} style="${styles}" role="presentation" />`
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

// Helper function to create inline checkmark (email-safe, no CSS :before)
function createCheckmark(color: string = '#2ECC71', size: number = 18): string {
  return createLucideIcon('check', size, color)
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
  
  const productItemsHtml = orderItems.map(item => {
    const normalizedImageUrl = normalizeImageUrl(item.imageUrl, siteUrl)
    return {
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      total: (item.price * item.quantity).toFixed(2),
      imageUrl: normalizedImageUrl
    }
  })

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
            ${item.imageUrl ? createImageTag(item.imageUrl, item.name, 60, 80, 'object-fit: cover;') : ''}
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
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
    </div>
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
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Zorg dat iemand thuis is om het pakket in ontvangst te nemen</span></li>
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Controleer je brievenbus voor een bezorgkaartje</span></li>
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Je ontvangt een melding zodra het in de buurt is</span></li>
      </ul>
    </div>
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
    </div>
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
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Je betaling is ontvangen en bevestigd</span></li>
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>We pakken je items zorgvuldig in</span></li>
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Je ontvangt een tracking code zodra we verzenden</span></li>
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
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
    </div>
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
        <h3 style="display: flex; align-items: center; justify-content: center; gap: 8px;">${createCheckmark('#2ECC71', 20)}<span>Afgeleverd op ${dateText}</span></h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">We hopen dat alles in perfecte staat is aangekomen!</p>
      </div>
      
      ${orderItems && orderItems.length > 0 ? `
      <div class="section-title">Je Bestelde Items</div>
      ${orderItems.map(item => {
        const normalizedImageUrl = normalizeImageUrl(item.image_url, siteUrl)
        return `
        <div class="product">
          <div class="prod-img" style="width: 60px; height: 80px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; overflow: hidden;">
            ${normalizedImageUrl ? createImageTag(normalizedImageUrl, item.product_name, 60, 80, 'object-fit: cover;') : ''}
          </div>
          <div class="prod-info">
            <div class="prod-name">${item.product_name}</div>
          </div>
        </div>
      `
      }).join('')}
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
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Was je MOSE items op 30°C voor het beste resultaat</span></li>
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Hang je kledingstukken te drogen (niet in de droger)</span></li>
        <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Lees altijd het waslabel voor specifieke instructies</span></li>
      </ul>
      
      <div style="background: #000; color: #fff; padding: 28px 24px; text-align: center; margin-top: 28px; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Maak Je Look Compleet</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #999;">Ontdek meer items uit onze collectie</p>
        <a href="${siteUrl}/shop" class="button" style="color:#fff;text-decoration:none;">BEKIJK SHOP</a>
      </div>
    </div>
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
    </div>
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
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
    </div>
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
  
  const productItemsHtml = orderItems.map(item => {
    const normalizedImageUrl = normalizeImageUrl(item.imageUrl, siteUrl)
    return {
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      total: (item.price * item.quantity).toFixed(2),
      imageUrl: normalizedImageUrl
    }
  })

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
              ${item.imageUrl ? createImageTag(item.imageUrl, item.name, 60, 80, 'object-fit: cover;') : ''}
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
          <li style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 0;">
            ${createCheckmark('#FF9500', 18)}
            <span>Gratis verzending vanaf €${freeShippingThreshold}</span>
          </li>
          <li style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 0;">
            ${createCheckmark('#FF9500', 18)}
            <span>${returnDays} dagen retourrecht</span>
          </li>
          <li style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 0;">
            ${createCheckmark('#FF9500', 18)}
            <span>Duurzame & hoogwaardige materialen</span>
          </li>
          <li style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 0;">
            ${createCheckmark('#FF9500', 18)}
            <span>Snelle levering (1-2 werkdagen)</span>
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
          <a href="mailto:info@mosewear.nl" style="color: #FF9500; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • 
          <a href="tel:+31502111931" style="color: #FF9500; font-weight: 600; text-decoration: none;">+31 50 211 1931</a>
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
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
}) {
  const { customerEmail, productName, productSlug, productImageUrl, productPrice, variantInfo } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const productUrl = `${siteUrl}/product/${productSlug}`
  const normalizedProductImageUrl = normalizeImageUrl(productImageUrl, siteUrl)

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
        ${normalizedProductImageUrl ? `
        <div class="prod-img" style="width: 80px; height: 100px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; overflow: hidden;">
          ${createImageTag(normalizedProductImageUrl, productName, 80, 100, 'object-fit: cover;')}
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
          <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Beperkte voorraad - dit product is populair!</span></li>
          <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Gratis verzending vanaf €100</span></li>
          <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>14 dagen retourrecht</span></li>
          <li style="display: flex; align-items: flex-start; gap: 10px;">${createCheckmark('#2ECC71', 18)}<span>Lokaal gemaakt in Groningen</span></li>
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
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
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
  const adminEmail = process.env.CONTACT_EMAIL || 'info@mosewear.nl'

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
    <div class="footer" style="background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px;">
      <div style="margin-bottom: 16px;">${createLogoTag(siteUrl, 100, 'auto')}</div>
      <p style="margin: 0 0 8px 0;"><strong style="color: #fff; font-weight: 700;">MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin: 8px 0 0 0;"><a href="mailto:info@mosewear.nl" style="color: #2ECC71; font-weight: 600; text-decoration: none;">info@mosewear.nl</a> • <a href="tel:+31502111931" style="color: #2ECC71; font-weight: 600; text-decoration: none;">+31 50 211 1931</a></p>
    </div>
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
