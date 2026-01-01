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
  }[]
  shippingAddress: {
    name: string
    address: string
    city: string
    postalCode: string
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN 1: MINIMALIST BLACK - Premium streetwear, Apple-esque
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDesign1(props: OrderEmailProps) {
  const { customerName, orderId, orderTotal, orderItems, shippingAddress } = props
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; }
          .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
          .header { background: #000000; padding: 40px 20px; text-align: center; }
          .header img { max-width: 180px; height: auto; }
          .hero { background: #ffffff; padding: 50px 20px; text-align: center; border-bottom: 1px solid #e5e5e5; }
          .check-icon { width: 64px; height: 64px; background: #2ECC71; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
          .hero h1 { margin: 0 0 12px; font-size: 32px; font-weight: 700; color: #000; letter-spacing: -0.5px; }
          .hero p { margin: 0; font-size: 16px; color: #666; }
          .order-number { display: inline-block; background: #f5f5f5; padding: 12px 24px; margin-top: 24px; font-family: 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #000; border: 1px solid #e5e5e5; }
          .content { padding: 40px 20px; }
          .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #000; margin: 0 0 20px; }
          .product-item { display: flex; padding: 20px 0; border-bottom: 1px solid #e5e5e5; }
          .product-item:last-child { border-bottom: none; }
          .product-image { width: 80px; height: 100px; background: #f5f5f5; border: 1px solid #e5e5e5; margin-right: 16px; flex-shrink: 0; }
          .product-details { flex: 1; }
          .product-name { font-size: 15px; font-weight: 600; color: #000; margin: 0 0 8px; }
          .product-meta { font-size: 13px; color: #666; margin: 0 0 4px; }
          .product-price { font-size: 16px; font-weight: 600; color: #000; text-align: right; }
          .summary { background: #000; color: #fff; padding: 30px 20px; margin-top: 30px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }
          .summary-total { display: flex; justify-content: space-between; padding-top: 16px; border-top: 1px solid #333; font-size: 20px; font-weight: 700; }
          .footer { background: #000; color: #fff; padding: 40px 20px; text-align: center; font-size: 13px; }
          .footer a { color: #2ECC71; text-decoration: none; }
          @media only screen and (max-width: 600px) {
            .hero h1 { font-size: 28px; }
            .product-item { flex-direction: column; }
            .product-image { margin-bottom: 12px; }
            .product-price { text-align: left; margin-top: 8px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL}/logomose.png" alt="MOSE" />
          </div>
          
          <div class="hero">
            <div class="check-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1>Bedankt voor je bestelling!</h1>
            <p>Hey ${customerName}, je order is bevestigd</p>
            <div class="order-number">#${orderId.slice(0, 8).toUpperCase()}</div>
          </div>
          
          <div class="content">
            <h2 class="section-title">Je Items</h2>
            ${orderItems.map(item => `
              <div class="product-item">
                <div class="product-image"></div>
                <div class="product-details">
                  <p class="product-name">${item.name}</p>
                  <p class="product-meta">Maat ${item.size} • ${item.color}</p>
                  <p class="product-meta">Aantal: ${item.quantity}</p>
                </div>
                <div class="product-price">€${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            `).join('')}
            
            <div class="summary">
              <div class="summary-row">
                <span>Subtotaal</span>
                <span>€${(orderTotal - 5.95).toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span>Verzending</span>
                <span>€5.95</span>
              </div>
              <div class="summary-total">
                <span>Totaal</span>
                <span>€${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>MOSE</strong> • Groningen, Nederland</p>
            <p style="margin-top: 8px;">Vragen? Mail naar <a href="mailto:bestellingen@orders.mosewear.nl">bestellingen@orders.mosewear.nl</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN 2: BOLD STATEMENT - Hypebeast, energiek, maximum impact
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDesign2(props: OrderEmailProps) {
  const { customerName, orderId, orderTotal, orderItems, shippingAddress } = props
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #ffffff; }
          .email-wrapper { max-width: 600px; margin: 0 auto; }
          .logo-bar { padding: 20px; text-align: center; border-bottom: 1px solid #e5e5e5; }
          .logo-bar img { max-width: 140px; height: auto; opacity: 0.9; }
          .hero { padding: 60px 20px; text-align: center; background: linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%); }
          .check-circle { width: 80px; height: 80px; background: #2ECC71; border-radius: 50%; margin: 0 auto 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(46,204,113,0.3); }
          .hero h1 { margin: 0 0 16px; font-size: 48px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; line-height: 1; }
          .hero p { margin: 0 0 8px; font-size: 18px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
          .hero .subtitle { font-size: 15px; color: #999; text-transform: none; letter-spacing: 0; }
          .order-badge { display: inline-block; background: #000; color: #fff; padding: 12px 32px; margin-top: 32px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; letter-spacing: 2px; }
          .content { padding: 40px 20px; background: #fff; }
          .section-title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #000; margin: 0 0 24px; text-align: center; }
          .product-grid { display: grid; gap: 16px; }
          .product-card { background: #f9f9f9; padding: 20px; border: 2px solid #e5e5e5; }
          .product-card-inner { display: flex; align-items: center; gap: 16px; }
          .product-img { width: 70px; height: 90px; background: #fff; border: 1px solid #ddd; }
          .product-info { flex: 1; }
          .product-name { font-size: 16px; font-weight: 700; color: #000; margin: 0 0 8px; text-transform: uppercase; }
          .product-meta { font-size: 13px; color: #666; margin: 0 0 4px; }
          .product-price-lg { font-size: 20px; font-weight: 900; color: #000; }
          .total-box { background: #000; color: #fff; padding: 32px 24px; margin-top: 32px; text-align: center; }
          .total-label { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; color: #2ECC71; }
          .total-amount { font-size: 48px; font-weight: 900; letter-spacing: 1px; }
          .footer { background: #000; color: #999; padding: 32px 20px; text-align: center; font-size: 12px; }
          .footer-logo { opacity: 0.5; max-width: 120px; margin-bottom: 16px; }
          .footer a { color: #2ECC71; text-decoration: none; font-weight: 600; }
          @media only screen and (max-width: 600px) {
            .hero h1 { font-size: 36px; }
            .total-amount { font-size: 36px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="logo-bar">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL}/logomose.png" alt="MOSE" />
          </div>
          
          <div class="hero">
            <div class="check-circle">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h1>BEDANKT!</h1>
            <p>Bestelling bevestigd</p>
            <p class="subtitle">Hey ${customerName}, je order is binnen</p>
            <div class="order-badge">#${orderId.slice(0, 8).toUpperCase()}</div>
          </div>
          
          <div class="content">
            <h2 class="section-title">Je Items</h2>
            <div class="product-grid">
              ${orderItems.map(item => `
                <div class="product-card">
                  <div class="product-card-inner">
                    <div class="product-img"></div>
                    <div class="product-info">
                      <p class="product-name">${item.name}</p>
                      <p class="product-meta">SIZE ${item.size} • ${item.color.toUpperCase()}</p>
                      <p class="product-meta">QTY: ${item.quantity}</p>
                    </div>
                    <div class="product-price-lg">€${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="total-box">
              <div class="total-label">Totaal Betaald</div>
              <div class="total-amount">€${orderTotal.toFixed(2)}</div>
            </div>
          </div>
          
          <div class="footer">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL}/logomose.png" class="footer-logo" alt="MOSE" />
            <p><strong>MOSE</strong> • GRONINGEN</p>
            <p style="margin-top: 12px;"><a href="mailto:bestellingen@orders.mosewear.nl">BESTELLINGEN@ORDERS.MOSEWEAR.NL</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN 3: RECEIPT STYLE - Urban streetwear, kasbon aesthetic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDesign3(props: OrderEmailProps) {
  const { customerName, orderId, orderTotal, orderItems, shippingAddress } = props
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: #f5f5f5; }
          .email-wrapper { max-width: 500px; margin: 20px auto; background: #ffffff; border: 2px dashed #000; padding: 40px 30px; }
          .logo { text-align: center; margin-bottom: 32px; }
          .logo img { max-width: 160px; }
          .receipt-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 20px; margin-bottom: 20px; }
          .receipt-title { font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: 2px; }
          .receipt-subtitle { font-size: 12px; margin: 0; color: #666; }
          .check-row { text-align: center; margin: 20px 0; }
          .check-box { display: inline-block; width: 48px; height: 48px; background: #2ECC71; color: #fff; border: 2px solid #000; font-size: 24px; line-height: 44px; }
          .field-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px dotted #ddd; }
          .field-label { color: #666; text-transform: uppercase; font-size: 11px; }
          .field-value { font-weight: 700; color: #000; }
          .section-divider { border-top: 1px dashed #000; margin: 24px 0; }
          .items-header { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }
          .item-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dotted #ddd; font-size: 12px; }
          .item-desc { flex: 1; }
          .item-name { font-weight: 700; margin-bottom: 4px; }
          .item-meta { font-size: 11px; color: #666; }
          .item-price { font-weight: 700; white-space: nowrap; margin-left: 16px; }
          .totals { margin-top: 24px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }
          .total-final { border-top: 2px solid #000; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: 700; }
          .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px dashed #000; font-size: 11px; color: #666; }
          .footer strong { color: #000; }
          .footer a { color: #2ECC71; text-decoration: none; }
          @media only screen and (max-width: 600px) {
            .email-wrapper { margin: 10px; padding: 30px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="logo">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL}/logomose.png" alt="MOSE" />
          </div>
          
          <div class="receipt-header">
            <h1 class="receipt-title">ORDER BEVESTIGD</h1>
            <p class="receipt-subtitle">GRONINGEN, NEDERLAND</p>
          </div>
          
          <div class="check-row">
            <div class="check-box">✓</div>
          </div>
          
          <div class="field-row">
            <span class="field-label">Order Nummer</span>
            <span class="field-value">#${orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Klant</span>
            <span class="field-value">${customerName}</span>
          </div>
          <div class="field-row">
            <span class="field-label">Adres</span>
            <span class="field-value">${shippingAddress.city}</span>
          </div>
          
          <div class="section-divider"></div>
          
          <div class="items-header">ITEMS</div>
          ${orderItems.map(item => `
            <div class="item-row">
              <div class="item-desc">
                <div class="item-name">${item.name}</div>
                <div class="item-meta">SIZE: ${item.size} | COLOR: ${item.color} | QTY: ${item.quantity}</div>
              </div>
              <div class="item-price">€${(item.price * item.quantity).toFixed(2)}</div>
            </div>
          `).join('')}
          
          <div class="totals">
            <div class="total-row">
              <span>SUBTOTAL</span>
              <span>€${(orderTotal - 5.95).toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>VERZENDING</span>
              <span>€5.95</span>
            </div>
            <div class="total-row total-final">
              <span>TOTAAL</span>
              <span>€${orderTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>MOSE</strong></p>
            <p>VRAGEN? <a href="mailto:bestellingen@orders.mosewear.nl">BESTELLINGEN@ORDERS.MOSEWEAR.NL</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN 4: SPLIT HERO - Fashion editorial, magazine layout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDesign4(props: OrderEmailProps) {
  const { customerName, orderId, orderTotal, orderItems, shippingAddress } = props
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
          .email-wrapper { max-width: 600px; margin: 0 auto; }
          .split-container { display: table; width: 100%; }
          .split-left { display: table-cell; width: 40%; background: #000; color: #fff; padding: 60px 30px; vertical-align: middle; }
          .split-right { display: table-cell; width: 60%; background: #fff; padding: 60px 30px; vertical-align: middle; }
          .logo-small { max-width: 120px; margin-bottom: 32px; }
          .split-title { font-size: 42px; font-weight: 900; line-height: 1; margin: 0 0 16px; letter-spacing: 1px; }
          .split-subtitle { font-size: 15px; color: #999; margin: 0 0 24px; }
          .check-inline { display: inline-block; width: 32px; height: 32px; background: #2ECC71; border-radius: 50%; text-align: center; line-height: 32px; margin-right: 8px; vertical-align: middle; }
          .order-info { font-size: 13px; margin-top: 24px; }
          .order-info-row { margin-bottom: 8px; color: #ccc; }
          .order-info-row strong { color: #fff; }
          .right-title { font-size: 18px; font-weight: 700; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 1px; }
          .product-list { margin: 0; padding: 0; list-style: none; }
          .product-item-split { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e5e5; }
          .product-item-split:last-child { border-bottom: none; }
          .product-name-split { font-size: 15px; font-weight: 600; margin: 0 0 8px; }
          .product-meta-split { font-size: 13px; color: #666; margin: 0 0 4px; }
          .product-price-split { font-size: 16px; font-weight: 700; margin-top: 8px; }
          .total-line { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 24px; border-top: 2px solid #000; font-size: 20px; font-weight: 700; }
          .footer-split { background: #f5f5f5; padding: 24px; text-align: center; font-size: 12px; color: #666; }
          @media only screen and (max-width: 600px) {
            .split-left, .split-right { display: block; width: 100%; padding: 40px 20px; }
            .split-title { font-size: 32px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="split-container">
            <div class="split-left">
              <img src="${process.env.NEXT_PUBLIC_SITE_URL}/logomose.png" class="logo-small" alt="MOSE" />
              <h1 class="split-title">
                <span class="check-inline">✓</span>
                BEDANKT!
              </h1>
              <p class="split-subtitle">Je bestelling is bevestigd</p>
              <div class="order-info">
                <p class="order-info-row"><strong>Order:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
                <p class="order-info-row"><strong>Klant:</strong> ${customerName}</p>
                <p class="order-info-row"><strong>Locatie:</strong> ${shippingAddress.city}</p>
              </div>
            </div>
            <div class="split-right">
              <h2 class="right-title">Je Items</h2>
              <ul class="product-list">
                ${orderItems.map(item => `
                  <li class="product-item-split">
                    <p class="product-name-split">${item.name}</p>
                    <p class="product-meta-split">Maat ${item.size} • ${item.color}</p>
                    <p class="product-meta-split">Aantal: ${item.quantity}</p>
                    <p class="product-price-split">€${(item.price * item.quantity).toFixed(2)}</p>
                  </li>
                `).join('')}
              </ul>
              <div class="total-line">
                <span>Totaal</span>
                <span>€${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div class="footer-split">
            <p><strong>MOSE</strong> • Groningen, Nederland</p>
            <p style="margin-top: 8px;">Vragen? <a href="mailto:bestellingen@orders.mosewear.nl" style="color: #2ECC71; text-decoration: none;">bestellingen@orders.mosewear.nl</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DESIGN 5: GRADIENT WAVE - Contemporary, premium casual
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function generateDesign5(props: OrderEmailProps) {
  const { customerName, orderId, orderTotal, orderItems, shippingAddress } = props
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
          .email-wrapper { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
          .header-wave { background: linear-gradient(135deg, #2ECC71 0%, #27ae60 100%); padding: 48px 20px 64px; text-align: center; position: relative; }
          .header-wave::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 60px; background: #ffffff; border-radius: 50% 50% 0 0 / 0 0 32px 32px; }
          .logo-center { max-width: 160px; margin-bottom: 24px; filter: brightness(0) invert(1); }
          .check-modern { width: 64px; height: 64px; background: #fff; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
          .content-modern { padding: 32px 24px; }
          .greeting { font-size: 24px; font-weight: 700; color: #000; margin: 0 0 8px; text-align: center; }
          .subtext { font-size: 15px; color: #666; margin: 0 0 24px; text-align: center; }
          .order-badge-modern { display: inline-block; background: #f0f0f0; border-radius: 24px; padding: 8px 20px; font-size: 13px; font-weight: 600; color: #000; margin-bottom: 32px; }
          .card-grid { display: grid; gap: 16px; }
          .product-card-modern { background: #f9f9f9; border-radius: 12px; padding: 20px; display: flex; gap: 16px; align-items: center; }
          .product-img-modern { width: 60px; height: 75px; background: #fff; border-radius: 8px; border: 1px solid #e5e5e5; }
          .product-details-modern { flex: 1; }
          .product-name-modern { font-size: 15px; font-weight: 600; color: #000; margin: 0 0 6px; }
          .product-meta-modern { font-size: 13px; color: #666; margin: 0; }
          .product-price-modern { font-size: 18px; font-weight: 700; color: #2ECC71; }
          .summary-modern { background: linear-gradient(135deg, #000 0%, #1a1a1a 100%); border-radius: 12px; padding: 24px; margin-top: 24px; color: #fff; }
          .summary-row-modern { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 15px; }
          .summary-total-modern { display: flex; justify-content: space-between; padding-top: 16px; border-top: 1px solid #333; font-size: 22px; font-weight: 700; }
          .footer-modern { background: #f5f5f5; padding: 32px 24px; text-align: center; font-size: 13px; color: #666; border-radius: 0 0 16px 16px; }
          .footer-modern strong { color: #000; }
          .footer-modern a { color: #2ECC71; text-decoration: none; font-weight: 600; }
          @media only screen and (max-width: 600px) {
            .email-wrapper { margin: 10px; border-radius: 12px; }
            .greeting { font-size: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header-wave">
            <img src="${process.env.NEXT_PUBLIC_SITE_URL}/logomose.png" class="logo-center" alt="MOSE" />
            <div class="check-modern">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </div>
          
          <div class="content-modern">
            <h1 class="greeting">Bedankt, ${customerName}!</h1>
            <p class="subtext">Je bestelling is bevestigd en wordt verwerkt</p>
            <div style="text-align: center;">
              <span class="order-badge-modern">#${orderId.slice(0, 8).toUpperCase()}</span>
            </div>
            
            <div class="card-grid">
              ${orderItems.map(item => `
                <div class="product-card-modern">
                  <div class="product-img-modern"></div>
                  <div class="product-details-modern">
                    <p class="product-name-modern">${item.name}</p>
                    <p class="product-meta-modern">Maat ${item.size} • ${item.color} • ${item.quantity}x</p>
                  </div>
                  <div class="product-price-modern">€${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              `).join('')}
            </div>
            
            <div class="summary-modern">
              <div class="summary-row-modern">
                <span>Subtotaal</span>
                <span>€${(orderTotal - 5.95).toFixed(2)}</span>
              </div>
              <div class="summary-row-modern">
                <span>Verzending</span>
                <span>€5.95</span>
              </div>
              <div class="summary-total-modern">
                <span>Totaal</span>
                <span>€${orderTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div class="footer-modern">
            <p><strong>MOSE</strong> • Groningen, Nederland</p>
            <p style="margin-top: 12px;">Vragen? Mail naar <a href="mailto:bestellingen@orders.mosewear.nl">bestellingen@orders.mosewear.nl</a></p>
          </div>
        </div>
      </body>
    </html>
  `
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN FUNCTION - Default to Design 1 (or make configurable)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendOrderConfirmationEmail(props: OrderEmailProps, design: number = 1) {
  const { customerEmail, orderId } = props

  let htmlContent: string
  
  switch(design) {
    case 1:
      htmlContent = generateDesign1(props)
      break
    case 2:
      htmlContent = generateDesign2(props)
      break
    case 3:
      htmlContent = generateDesign3(props)
      break
    case 4:
      htmlContent = generateDesign4(props)
      break
    case 5:
      htmlContent = generateDesign5(props)
      break
    default:
      htmlContent = generateDesign1(props)
  }

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
}) {
  const { customerEmail, customerName, orderId, trackingCode, trackingUrl } = props

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
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MOSE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">MOSEWEAR.COM</p>
        </div>
        
        <div class="content">
          <h2>🚚 Je bestelling is onderweg!</h2>
          <p>Hey ${customerName},</p>
          <p>Goed nieuws! Je bestelling #${orderId.slice(0, 8).toUpperCase()} is verzonden en komt eraan.</p>
          
          <div class="tracking-box">
            <p style="margin: 0; font-size: 18px;">Track & Trace code:</p>
            <div class="tracking-code">${trackingCode}</div>
            ${trackingUrl ? `<a href="${trackingUrl}" class="button">Volg je bestelling</a>` : ''}
          </div>
          
          <p><strong>Verwachte levertijd:</strong> 2-3 werkdagen</p>
          
          <p>Je kunt je pakket volgen met de bovenstaande track & trace code. Je ontvangt een melding zodra het bij je in de buurt is!</p>
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

