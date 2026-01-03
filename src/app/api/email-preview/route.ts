import { NextRequest, NextResponse } from 'next/server'

// Dummy data voor preview
const dummyOrderData = {
  customerName: 'Jan de Vries',
  customerEmail: 'jan@example.com',
  orderId: 'abc123de-4567-89fg-hijk-lmnopqr12345',
  orderTotal: 89.95,
  orderItems: [
    {
      name: 'MOSE Essential Hoodie',
      size: 'L',
      color: 'Zwart',
      quantity: 1,
      price: 69.95,
      imageUrl: 'https://mose-webshop.vercel.app/placeholder-product.jpg',
    },
    {
      name: 'MOSE Classic Cap',
      size: 'One Size',
      color: 'Navy',
      quantity: 1,
      price: 19.99,
      imageUrl: 'https://mose-webshop.vercel.app/placeholder-product.jpg',
    },
  ],
  shippingAddress: {
    name: 'Jan de Vries',
    address: 'Damstraat 42',
    city: 'Amsterdam',
    postalCode: '1012 JM',
  },
  trackingCode: 'TEST-TRACKING-123456',
  trackingUrl: 'https://www.dhlparcel.nl/en/private/track-trace?tt=TEST-TRACKING-123456',
  carrier: 'DHL',
  estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  deliveryDate: new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }),
  cancellationReason: 'Product niet op voorraad',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'confirmation'

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const logoUrl = `${siteUrl}/logomose.png`

  // Shared email styles
  const EMAIL_STYLES = `
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .logo-bar { padding: 24px; text-align: center; background: #000; }
    .logo-bar img { max-width: 140px; display: block; margin: 0 auto; filter: brightness(0) invert(1); }
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
    .button { display: inline-block; background: #2ECC71; color: #fff; padding: 15px 32px; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin: 16px 0; font-size: 13px; }
    .summary { background: #000; color: #fff; padding: 28px 24px; margin-top: 28px; }
    .sum-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
    .sum-grand { font-size: 28px; font-weight: 900; padding-top: 12px; text-align: center; }
    .footer { background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px; }
    .footer strong { color: #fff; }
    .footer a { color: #2ECC71; font-weight: 600; text-decoration: none; }
    .product { background: #f8f8f8; padding: 16px; border-left: 3px solid #2ECC71; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
    .prod-img { width: 60px; height: 80px; background: #ddd; border: 1px solid #e0e0e0; flex-shrink: 0; }
    .prod-info { flex: 1; }
    .prod-name { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
    .prod-meta { font-size: 12px; color: #666; }
    .prod-price { font-size: 17px; font-weight: 900; }
    .discount-highlight { background: #2ECC71; color: #fff; padding: 24px; border-radius: 8px; text-align: center; margin: 20px 0; }
    .discount-code { font-size: 32px; font-weight: 900; letter-spacing: 4px; font-family: monospace; background: rgba(255,255,255,0.2); padding: 16px 28px; border-radius: 6px; display: inline-block; margin: 12px 0; }
    .tracking-box { background: #000; color: #fff; padding: 28px 24px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .tracking-code { font-size: 24px; font-weight: 900; letter-spacing: 3px; font-family: monospace; margin: 15px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 4px; }
    .carrier-badge { display: inline-block; background: #2ECC71; color: #fff; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  `

  let htmlContent = ''

  // Generate email based on type
  switch (type) {
    case 'confirmation':
      htmlContent = generateConfirmationEmail(dummyOrderData, logoUrl, EMAIL_STYLES)
      break
    case 'processing':
      htmlContent = generateProcessingEmail(dummyOrderData, logoUrl, EMAIL_STYLES)
      break
    case 'shipped':
      htmlContent = generateShippedEmail(dummyOrderData, logoUrl, EMAIL_STYLES)
      break
    case 'delivered':
      htmlContent = generateDeliveredEmail(dummyOrderData, logoUrl, EMAIL_STYLES)
      break
    case 'cancelled':
      htmlContent = generateCancelledEmail(dummyOrderData, logoUrl, EMAIL_STYLES)
      break
    default:
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
  }

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

function generateConfirmationEmail(data: any, logoUrl: string, styles: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE"/></div>
    <div class="hero">
      <div class="icon-circle icon-success">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>BEDANKT!</h1>
      <div class="hero-sub">Je Bestelling Is Bevestigd</div>
      <div class="hero-text">Hey ${data.customerName}, we gaan direct voor je aan de slag!</div>
      <div class="order-badge">#${data.orderId.slice(0, 8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">Je Bestelde Items</div>
      ${data.orderItems.map((item: any) => `
        <div class="product">
          <div class="prod-img"></div>
          <div class="prod-info">
            <div class="prod-name">${item.name}</div>
            <div class="prod-meta">Maat ${item.size} • ${item.color} • ${item.quantity}x stuks</div>
          </div>
          <div class="prod-price">€${(item.price * item.quantity).toFixed(2)}</div>
        </div>
      `).join('')}
      
      <div class="summary">
        <div class="sum-line"><span>Subtotaal</span><span>€${(data.orderTotal - 0.01).toFixed(2)}</span></div>
        <div class="sum-line"><span>Verzendkosten</span><span>€0,01</span></div>
        <div class="sum-grand">€${data.orderTotal.toFixed(2)}</div>
      </div>
      
      <div class="info-box">
        <h3>📦 Verzendadres</h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6;">
          ${data.shippingAddress.name}<br>
          ${data.shippingAddress.address}<br>
          ${data.shippingAddress.postalCode} ${data.shippingAddress.city}
        </p>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`
}

function generateProcessingEmail(data: any, logoUrl: string, styles: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE"/></div>
    <div class="hero">
      <div class="icon-circle icon-processing">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <h1>IN BEHANDELING</h1>
      <div class="hero-sub">We Zijn Voor Je Aan Het Werk</div>
      <div class="hero-text">Hey ${data.customerName}, je bestelling wordt klaargemaakt!</div>
      <div class="order-badge">#${data.orderId.slice(0, 8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box">
        <h3>✓ Wat gebeurt er nu?</h3>
        <p style="margin: 12px 0 0 0; font-size: 14px; line-height: 1.8;">
          ✓ Order ontvangen<br>
          ⏳ Items picken & pakken<br>
          📦 Verzendlabel aanmaken<br>
          🚚 Verzending
        </p>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`
}

function generateShippedEmail(data: any, logoUrl: string, styles: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE"/></div>
    <div class="hero">
      <div class="icon-circle icon-shipping">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      </div>
      <h1>ONDERWEG!</h1>
      <div class="hero-sub">Je Pakket Is Verzonden</div>
      <div class="hero-text">Hey ${data.customerName}, je MOSE items zijn onderweg!</div>
      <div class="order-badge">#${data.orderId.slice(0, 8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="tracking-box">
        <div class="carrier-badge">${data.carrier}</div>
        <div style="font-size: 14px; margin-bottom: 8px;">Track je pakket:</div>
        <div class="tracking-code">${data.trackingCode}</div>
        <a href="${data.trackingUrl}" class="button" style="color:#fff;text-decoration:none;">TRACK PAKKET</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`
}

function generateDeliveredEmail(data: any, logoUrl: string, styles: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE"/></div>
    <div class="hero">
      <div class="icon-circle icon-delivered">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>BEZORGD!</h1>
      <div class="hero-sub">Je Pakket Is Aangekomen</div>
      <div class="hero-text">Hey ${data.customerName}, geniet van je nieuwe MOSE items!</div>
      <div class="order-badge">#${data.orderId.slice(0, 8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #2ECC71; background: #f0f9f4; text-align: center;">
        <h3 style="color: #2ECC71;">✓ Afgeleverd op ${data.deliveryDate}</h3>
        <p style="margin: 8px 0 0 0;">We hopen dat alles in perfecte staat is aangekomen!</p>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">⭐⭐⭐⭐⭐</div>
        <p style="font-size: 16px; margin-bottom: 20px;">Wat vind je van je bestelling?</p>
        <a href="#" class="button" style="color:#fff;text-decoration:none;">SCHRIJF EEN REVIEW</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`
}

function generateCancelledEmail(data: any, logoUrl: string, styles: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${styles}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE"/></div>
    <div class="hero">
      <div class="icon-circle icon-cancelled">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      <h1>GEANNULEERD</h1>
      <div class="hero-sub">Order Geannuleerd</div>
      <div class="hero-text">Hey ${data.customerName}, je order is geannuleerd</div>
      <div class="order-badge">#${data.orderId.slice(0, 8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #e74c3c; background: #fff3f3;">
        <h3>💰 Terugbetaling</h3>
        <p style="margin: 8px 0 0 0;">Je betaling wordt automatisch teruggestort binnen 3-5 werkdagen.</p>
      </div>
      
      <div class="discount-highlight">
        <h3 style="margin: 0 0 12px 0; font-size: 20px;">🎁 Onze Excuses</h3>
        <p style="margin: 0 0 16px 0;">Als excuus bieden we je 10% korting op je volgende bestelling:</p>
        <div class="discount-code">SORRY10</div>
        <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.9;">Geldig tot 1 maand na deze email</p>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`
}

