import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Shared email styles - consistent across all emails
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
  .checklist li { padding: 10px 0; padding-left: 30px; position: relative; }
  .checklist li:before { content: "✓"; position: absolute; left: 0; color: #2ECC71; font-weight: 900; font-size: 18px; }
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
  const logoUrl = `${siteUrl}/logomose.png`
  
  const productItemsHtml = orderItems.map(item => ({
    name: item.name,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    total: (item.price * item.quantity).toFixed(2),
    imageUrl: item.imageUrl || ''
  }))

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;filter:brightness(0) invert(1);"/></div>
    <div class="hero">
      <div class="icon-circle icon-success">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>BEDANKT!</h1>
      <div class="hero-sub">Bestelling Geplaatst</div>
      <div class="hero-text">Hey ${customerName}, we gaan voor je aan de slag</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">Jouw Items</div>
      ${productItemsHtml.map(item => `
        <div class="product">
          <div class="prod-img">${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : ''}</div>
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
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
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
  const logoUrl = `${siteUrl}/logomose.png`

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
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;filter:brightness(0) invert(1);"/></div>
    <div class="hero">
      <div class="icon-circle icon-shipping">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      </div>
      <h1>ONDERWEG!</h1>
      <div class="hero-sub">Je Pakket Is Verzonden</div>
      <div class="hero-text">Hey ${customerName}, je bestelling komt eraan</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">📦 Tracking Informatie</div>
      ${carrier ? `<div class="carrier-badge">${carrier}</div>` : ''}
      
      <div class="tracking-box">
        <div style="font-size: 13px; color: #999; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Track & Trace Code</div>
        <div class="tracking-code">${trackingCode}</div>
        ${trackingUrl ? `<a href="${trackingUrl}" class="button" style="color:#fff;text-decoration:none;">📍 VOLG JE BESTELLING</a>` : ''}
      </div>
      
      <div class="info-box">
        <h3>🚚 Verwachte Levering</h3>
        <p style="margin: 8px 0 0 0; font-size: 15px; font-weight: 600;">${deliveryText}</p>
      </div>
      
      <div class="section-title">💡 Handige Tips</div>
      <ul class="checklist">
        <li>Zorg dat iemand thuis is om het pakket in ontvangst te nemen</li>
        <li>Controleer je brievenbus voor een bezorgkaartje</li>
        <li>Je ontvangt een melding zodra het in de buurt is</li>
      </ul>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `📦 Je bestelling is verzonden #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
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
  const logoUrl = `${siteUrl}/logomose.png`

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;filter:brightness(0) invert(1);"/></div>
    <div class="hero">
      <div class="icon-circle icon-processing">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      </div>
      <h1>IN BEHANDELING</h1>
      <div class="hero-sub">We Pakken Je Order In</div>
      <div class="hero-text">Hey ${customerName}, we zijn voor je aan de slag!</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">⚙️ Wat Gebeurt Er Nu?</div>
      <ul class="checklist">
        <li>Je betaling is ontvangen en bevestigd</li>
        <li>We pakken je items zorgvuldig in</li>
        <li>Je ontvangt een tracking code zodra we verzenden</li>
      </ul>
      
      <div class="info-box">
        <h3>📅 Verwachte Verzending</h3>
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
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `⚙️ Je bestelling wordt voorbereid #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
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
  const logoUrl = `${siteUrl}/logomose.png`

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
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;filter:brightness(0) invert(1);"/></div>
    <div class="hero">
      <div class="icon-circle icon-delivered">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>BEZORGD!</h1>
      <div class="hero-sub">Je Pakket Is Aangekomen</div>
      <div class="hero-text">Hey ${customerName}, geniet van je nieuwe items!</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #2ECC71; text-align: center;">
        <h3>✓ Afgeleverd op ${dateText}</h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">We hopen dat alles in perfecte staat is aangekomen!</p>
      </div>
      
      ${orderItems && orderItems.length > 0 ? `
      <div class="section-title">Je Bestelde Items</div>
      ${orderItems.map(item => `
        <div class="product">
          <div class="prod-img">${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}" style="width:100%;height:100%;object-fit:cover;display:block;" />` : ''}</div>
          <div class="prod-info">
            <div class="prod-name">${item.product_name}</div>
          </div>
        </div>
      `).join('')}
      ` : ''}
      
      <div class="section-title">⭐ Deel Je Ervaring</div>
      <div style="background: #f8f8f8; padding: 24px; text-align: center; border-radius: 8px; margin: 16px 0;">
        <div style="font-size: 36px; margin-bottom: 12px;">⭐⭐⭐⭐⭐</div>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #666;">Wat vind je van je bestelling?</p>
        <a href="${siteUrl}/contact" class="button" style="color:#fff;text-decoration:none;">📝 SCHRIJF EEN REVIEW</a>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #999;">Help andere klanten met hun keuze</p>
      </div>
      
      <div class="section-title">🧥 Verzorgingstips</div>
      <ul class="checklist">
        <li>Was je MOSE items op 30°C voor het beste resultaat</li>
        <li>Hang je kledingstukken te drogen (niet in de droger)</li>
        <li>Lees altijd het waslabel voor specifieke instructies</li>
      </ul>
      
      <div style="background: #000; color: #fff; padding: 28px 24px; text-align: center; margin-top: 28px; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Maak Je Look Compleet</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #999;">Ontdek meer items uit onze collectie</p>
        <a href="${siteUrl}/shop" class="button" style="color:#fff;text-decoration:none;">BEKIJK SHOP</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE Bestellingen <bestellingen@orders.mosewear.nl>',
      to: [customerEmail],
      subject: `🎉 Je pakket is bezorgd #${orderId.slice(0, 8).toUpperCase()} - MOSE`,
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
  const logoUrl = `${siteUrl}/logomose.png`

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${EMAIL_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;filter:brightness(0) invert(1);"/></div>
    <div class="hero">
      <div class="icon-circle icon-cancelled">
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
      <h1>GEANNULEERD</h1>
      <div class="hero-sub">Order Geannuleerd</div>
      <div class="hero-text">Hey ${customerName}, je order is geannuleerd</div>
      <div class="order-badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="info-box" style="border-left-color: #e74c3c; background: #fff3f3;">
        <h3>⚠️ Order Details</h3>
        ${cancellationReason ? `<p style="margin: 8px 0; font-size: 14px;"><strong>Reden:</strong> ${cancellationReason}</p>` : ''}
        <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Bedrag:</strong> €${orderTotal.toFixed(2)}</p>
      </div>
      
      <div class="section-title">💰 Terugbetaling</div>
      <p style="font-size: 15px; line-height: 1.6; color: #333;">Je betaling wordt automatisch teruggestort naar je originele betaalmethode binnen <strong>3-5 werkdagen</strong>. Afhankelijk van je bank kan het iets langer duren voordat het bedrag zichtbaar is op je rekening.</p>
      
      <div class="discount-highlight">
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">🎁 Onze Excuses</h3>
        <p style="margin: 0 0 16px 0; font-size: 15px; opacity: 0.95;">Als excuus bieden we je <strong>10% korting</strong> op je volgende bestelling:</p>
        <div class="discount-code">SORRY10</div>
        <p style="margin: 12px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 600;">Geldig tot 1 maand na deze email</p>
      </div>
      
      <div style="background: #000; color: #fff; padding: 28px 24px; text-align: center; margin-top: 28px; border-radius: 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">🛍️ Nog Steeds Interesse?</h3>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #999;">Bekijk onze volledige collectie en vind je perfecte MOSE item</p>
        <a href="${siteUrl}/shop" class="button" style="color:#fff;text-decoration:none;">BEKIJK SHOP</a>
      </div>
      
      <div class="info-box" style="margin-top: 28px;">
        <h3>💬 Vragen?</h3>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Heb je vragen over je annulering? Neem gerust contact met ons op. We helpen je graag!</p>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Helper Brink 27a • 9722 EG Groningen</p>
      <p style="margin-top:8px"><a href="mailto:info@mosewear.nl">info@mosewear.nl</a> • <a href="tel:+31502111931">+31 50 211 1931</a></p>
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
