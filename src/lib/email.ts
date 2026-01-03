import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    image_url?: string
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
    imageUrl: item.image_url || ''
  }))

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .logo-bar { padding: 24px; text-align: center; background: #000; }
    .logo-bar img { max-width: 140px; display: block; margin: 0 auto; filter: brightness(0) invert(1); }
    .hero { padding: 50px 20px 40px; text-align: center; background: linear-gradient(180deg, #fff 0%, #fafafa 100%); }
    .check-modern { width: 72px; height: 72px; background: #2ECC71; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(46,204,113,0.25); }
    h1 { margin: 0 0 10px; font-size: 44px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
    .hero-sub { font-size: 15px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .hero-text { font-size: 14px; color: #999; }
    .order-badge { background: #000; color: #fff; padding: 10px 24px; display: inline-block; margin-top: 20px; font-family: monospace; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; }
    .content { padding: 32px 20px; }
    .items-title { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
    .product { background: #f8f8f8; padding: 16px; border-left: 3px solid #2ECC71; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
    .prod-img { width: 60px; height: 80px; background: #fff; border: 1px solid #e0e0e0; flex-shrink: 0; }
    .prod-info { flex: 1; }
    .prod-name { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
    .prod-meta { font-size: 12px; color: #666; }
    .prod-price { font-size: 17px; font-weight: 900; }
    .summary { background: #000; color: #fff; padding: 28px 24px; margin-top: 28px; }
    .sum-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 16px; text-align: center; }
    .sum-line { display: flex; justify-content: space-between; padding: 8px 0; font-size: 15px; }
    .sum-btw { font-size: 13px; color: #999; }
    .sum-divider { border-top: 1px solid #333; margin: 12px 0; }
    .sum-grand { font-size: 28px; font-weight: 900; padding-top: 12px; text-align: center; }
    .footer { background: #000; color: #888; padding: 28px 20px; text-align: center; font-size: 12px; }
    .footer strong { color: #fff; }
    .footer a { color: #2ECC71; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;filter:brightness(0) invert(1);"/></div>
    <div class="hero">
      <div class="check-modern">
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
      <div class="items-title">Jouw Items</div>
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
      <p><strong>MOSE</strong> • Groningen, Nederland</p>
      <p style="margin-top:8px"><a href="mailto:bestellingen@orders.mosewear.nl">bestellingen@orders.mosewear.nl</a></p>
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 4px; }
          .content { padding: 30px; background: #f9f9f9; }
          .tracking-box { background: #2ECC71; color: white; border-radius: 8px; padding: 30px; margin: 20px 0; text-align: center; }
          .tracking-code { font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 10px 0; }
          .button { display: inline-block; background: white; color: #2ECC71; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 20px 0; border-radius: 4px; }
          .footer { background: #1a1a1a; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .carrier-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 5px 15px; border-radius: 20px; font-size: 12px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" alt="MOSE" style="max-width:140px;filter:brightness(0) invert(1);margin-bottom:10px;" />
          <h1>MOSE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">MOSEWEAR.COM</p>
        </div>
        
        <div class="content">
          <h2>🚚 Je bestelling is onderweg!</h2>
          <p>Hey ${customerName},</p>
          <p>Goed nieuws! Je bestelling #${orderId.slice(0, 8).toUpperCase()} is verzonden en komt eraan.</p>
          
          <div class="tracking-box">
            ${carrier ? `<div class="carrier-badge">Via ${carrier}</div>` : ''}
            <p style="margin: 15px 0 5px 0; font-size: 18px;">Track & Trace code:</p>
            <div class="tracking-code">${trackingCode}</div>
            ${trackingUrl ? `<a href="${trackingUrl}" class="button">Volg je bestelling</a>` : ''}
          </div>
          
          <p><strong>Verwachte levertijd:</strong> ${estimatedDelivery || '2-3 werkdagen'}</p>
          
          <p>Je kunt je pakket volgen met de bovenstaande track & trace code. Je ontvangt een melding zodra het bij je in de buurt is!</p>
          
          <div style="background: white; border-left: 4px solid #2ECC71; padding: 15px; margin-top: 25px;">
            <strong>📦 Tips:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Zorg dat iemand thuis is om het pakket in ontvangst te nemen</li>
              <li>Controleer je brievenbus voor een bezorgkaartje</li>
              <li>Heb je vragen? We helpen je graag!</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>MOSE</strong> • Groningen, Nederland</p>
          <p>Vragen? Stuur een mail naar <a href="mailto:bestellingen@orders.mosewear.nl" style="color: #2ECC71;">bestellingen@orders.mosewear.nl</a></p>
        </div>
      </body>
    </html>
  `

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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 4px; }
          .content { padding: 30px; background: #f9f9f9; }
          .status-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; padding: 30px; margin: 20px 0; text-align: center; }
          .footer { background: #1a1a1a; color: white; padding: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" alt="MOSE" style="max-width:140px;filter:brightness(0) invert(1);margin-bottom:10px;" />
          <h1>MOSE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">MOSEWEAR.COM</p>
        </div>
        
        <div class="content">
          <h2>📦 We zijn je bestelling aan het voorbereiden!</h2>
          <p>Hey ${customerName},</p>
          <p>Goed nieuws! We zijn begonnen met het voorbereiden van je bestelling #${orderId.slice(0, 8).toUpperCase()}.</p>
          
          <div class="status-box">
            <div style="font-size: 48px; margin-bottom: 10px;">⚙️</div>
            <h3 style="margin: 0 0 10px 0;">In Behandeling</h3>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Je order wordt nu ingepakt en verzendklaar gemaakt</p>
          </div>
          
          <p><strong>Wat gebeurt er nu?</strong></p>
          <ul>
            <li>✅ Je betaling is ontvangen</li>
            <li>⚙️ We pakken je items in</li>
            <li>📦 Je ontvangt een tracking code zodra we verzenden</li>
          </ul>
          
          <p><strong>Verwachte verzending:</strong> ${estimatedShipDate || 'Binnen 1-2 werkdagen'}</p>
          
          <div style="background: white; border: 2px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Order nummer:</span>
              <strong>#${orderId.slice(0, 8).toUpperCase()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #e0e0e0;">
              <span>Totaal:</span>
              <strong style="font-size: 18px; color: #2ECC71;">€${orderTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>MOSE</strong> • Groningen, Nederland</p>
          <p>Vragen? Stuur een mail naar <a href="mailto:bestellingen@orders.mosewear.nl" style="color: #2ECC71;">bestellingen@orders.mosewear.nl</a></p>
        </div>
      </body>
    </html>
  `

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
  }>
}) {
  const { customerEmail, customerName, orderId, orderItems } = props

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const logoUrl = `${siteUrl}/logomose.png`

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #2ECC71; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 4px; }
          .content { padding: 30px; background: #f9f9f9; }
          .success-box { background: linear-gradient(135deg, #2ECC71 0%, #27ae60 100%); color: white; border-radius: 8px; padding: 30px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; background: #2ECC71; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 20px 0; border-radius: 4px; }
          .footer { background: #1a1a1a; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .review-stars { font-size: 32px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" alt="MOSE" style="max-width:140px;filter:brightness(0) invert(1);margin-bottom:10px;" />
          <h1>MOSE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">MOSEWEAR.COM</p>
        </div>
        
        <div class="content">
          <h2>🎉 Je pakket is aangekomen!</h2>
          <p>Hey ${customerName},</p>
          <p>Joepie! Je bestelling #${orderId.slice(0, 8).toUpperCase()} is succesvol bezorgd. We hopen dat alles in perfecte staat is aangekomen!</p>
          
          <div class="success-box">
            <div style="font-size: 64px; margin-bottom: 15px;">✓</div>
            <h3 style="margin: 0 0 10px 0;">Afgeleverd</h3>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Geniet van je nieuwe MOSE items!</p>
          </div>
          
          <h3>💭 Wat vind je van je bestelling?</h3>
          <p>Jouw mening is belangrijk voor ons! Deel je ervaring en help andere klanten met hun keuze.</p>
          
          <div style="text-align: center; background: white; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <div class="review-stars">⭐⭐⭐⭐⭐</div>
            <a href="${siteUrl}/account#reviews" class="button" style="color: white;">Schrijf een Review</a>
          </div>
          
          <h3>🧥 Verzorgingstips:</h3>
          <ul style="background: white; padding: 20px 20px 20px 40px; border-radius: 8px;">
            <li>Was je MOSE items op 30°C voor het beste resultaat</li>
            <li>Hang je kledingstukken te drogen (niet in de droger)</li>
            <li>Lees altijd het waslabel voor specifieke instructies</li>
          </ul>
          
          <h3>👕 Maak je look compleet</h3>
          <p>Combineer je nieuwe item met onze andere collecties!</p>
          <div style="text-align: center;">
            <a href="${siteUrl}/shop" style="display: inline-block; border: 2px solid #000; padding: 12px 24px; text-decoration: none; color: #000; font-weight: bold; text-transform: uppercase; border-radius: 4px; margin-top: 10px;">Bekijk Shop</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>MOSE</strong> • Groningen, Nederland</p>
          <p>Vragen? Stuur een mail naar <a href="mailto:bestellingen@orders.mosewear.nl" style="color: #2ECC71;">bestellingen@orders.mosewear.nl</a></p>
        </div>
      </body>
    </html>
  `

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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: #1a1a1a; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 32px; letter-spacing: 4px; }
          .content { padding: 30px; background: #f9f9f9; }
          .cancel-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; }
          .discount-box { background: #2ECC71; color: white; border-radius: 8px; padding: 25px; margin: 20px 0; text-align: center; }
          .discount-code { font-size: 28px; font-weight: bold; letter-spacing: 3px; background: rgba(255,255,255,0.2); padding: 15px 25px; border-radius: 4px; display: inline-block; margin: 10px 0; }
          .button { display: inline-block; background: white; color: #2ECC71; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 20px 0; border-radius: 4px; }
          .footer { background: #1a1a1a; color: white; padding: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoUrl}" alt="MOSE" style="max-width:140px;filter:brightness(0) invert(1);margin-bottom:10px;" />
          <h1>MOSE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">MOSEWEAR.COM</p>
        </div>
        
        <div class="content">
          <h2>Je bestelling is geannuleerd</h2>
          <p>Hey ${customerName},</p>
          <p>Je bestelling #${orderId.slice(0, 8).toUpperCase()} is geannuleerd.</p>
          
          <div class="cancel-box">
            <h3 style="margin-top: 0; color: #856404;">⚠️ Order Geannuleerd</h3>
            ${cancellationReason ? `<p><strong>Reden:</strong> ${cancellationReason}</p>` : ''}
            <p style="margin-bottom: 0;"><strong>Bedrag:</strong> €${orderTotal.toFixed(2)}</p>
          </div>
          
          <h3>💰 Terugbetaling</h3>
          <p>Je betaling wordt automatisch teruggestort naar je originele betaalmethode binnen <strong>3-5 werkdagen</strong>.</p>
          <p>Afhankelijk van je bank kan het iets langer duren voordat het bedrag zichtbaar is op je rekening.</p>
          
          <div class="discount-box">
            <h3 style="margin: 0 0 15px 0;">🎁 Onze excuses</h3>
            <p style="margin: 0 0 10px 0; opacity: 0.95;">Als excuus bieden we je 10% korting op je volgende bestelling:</p>
            <div class="discount-code">SORRY10</div>
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Geldig tot 1 maand na deze email</p>
          </div>
          
          <h3>🛍️ Nog steeds interesse?</h3>
          <p>Bekijk onze volledige collectie en vind je perfecte MOSE item.</p>
          <div style="text-align: center;">
            <a href="${siteUrl}/shop" style="display: inline-block; background: #000; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; border-radius: 4px;">Bekijk Shop</a>
          </div>
          
          <div style="background: white; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <h4 style="margin-top: 0;">Vragen over je annulering?</h4>
            <p style="margin-bottom: 0;">Neem gerust contact met ons op. We helpen je graag!</p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>MOSE</strong> • Groningen, Nederland</p>
          <p>Vragen? Stuur een mail naar <a href="mailto:bestellingen@orders.mosewear.nl" style="color: #2ECC71;">bestellingen@orders.mosewear.nl</a></p>
        </div>
      </body>
    </html>
  `

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

