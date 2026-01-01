import { NextRequest, NextResponse } from 'next/server'

const testData = {
  customerName: 'Rick Schlimback',
  customerEmail: 'h.schlimback@gmail.com',
  orderId: 'abc123def456',
  orderTotal: 124.95,
  orderItems: [
    {
      name: 'MOSE Classic Hoodie Zwart',
      size: 'M',
      color: 'Zwart',
      quantity: 2,
      price: 59.95,
    },
    {
      name: 'MOSE Essential T-Shirt Wit',
      size: 'L',
      color: 'Wit',
      quantity: 1,
      price: 29.95,
    }
  ],
  shippingAddress: {
    name: 'Rick Schlimback',
    address: 'Oostersingel 1',
    city: 'Groningen',
    postalCode: '9713EW',
  }
}

function generateDesign(designNumber: number, data: typeof testData): string {
  const { customerName, orderId, orderTotal, orderItems, shippingAddress } = data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  
  const productItemsHtml = orderItems.map(item => ({
    name: item.name,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    total: (item.price * item.quantity).toFixed(2)
  }))
  
  switch(designNumber) {
    case 1:
      // MINIMALIST BLACK
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #000; padding: 40px 20px; text-align: center; }
    .header img { max-width: 180px; }
    .hero { background: #fff; padding: 50px 20px; text-align: center; border-bottom: 1px solid #e5e5e5; }
    .check { width: 64px; height: 64px; background: #2ECC71; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; }
    h1 { margin: 0 0 12px; font-size: 32px; font-weight: 700; color: #000; }
    .order-num { background: #f5f5f5; padding: 12px 24px; margin-top: 24px; display: inline-block; font-family: monospace; border: 1px solid #e5e5e5; }
    .content { padding: 40px 20px; }
    .title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
    .item { display: flex; padding: 20px 0; border-bottom: 1px solid #e5e5e5; }
    .item-img { width: 80px; height: 100px; background: #f5f5f5; border: 1px solid #e5e5e5; margin-right: 16px; }
    .item-name { font-weight: 600; margin-bottom: 8px; }
    .item-meta { font-size: 13px; color: #666; }
    .summary { background: #000; color: #fff; padding: 30px 20px; margin-top: 30px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .total { border-top: 1px solid #333; padding-top: 16px; margin-top: 8px; font-size: 20px; font-weight: 700; }
    .footer { background: #000; color: #fff; padding: 40px 20px; text-align: center; font-size: 13px; }
    .footer a { color: #2ECC71; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header"><img src="${siteUrl}/logomose.png" alt="MOSE"/></div>
    <div class="hero">
      <div class="check">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>Bedankt voor je bestelling!</h1>
      <p>Hey ${customerName}, je order is bevestigd</p>
      <div class="order-num">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="title">Je Items</div>
      ${productItemsHtml.map(item => `
        <div class="item">
          <div class="item-img"></div>
          <div style="flex:1">
            <div class="item-name">${item.name}</div>
            <div class="item-meta">Maat ${item.size} • ${item.color}</div>
            <div class="item-meta">Aantal: ${item.quantity}</div>
          </div>
          <div style="font-weight:600">€${item.total}</div>
        </div>
      `).join('')}
      <div class="summary">
        <div class="row"><span>Subtotaal</span><span>€${(orderTotal-5.95).toFixed(2)}</span></div>
        <div class="row"><span>Verzending</span><span>€5.95</span></div>
        <div class="row total"><span>Totaal</span><span>€${orderTotal.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Groningen, Nederland</p>
      <p>Vragen? Mail naar <a href="mailto:bestellingen@orders.mosewear.nl">bestellingen@orders.mosewear.nl</a></p>
    </div>
  </div>
</body>
</html>`

    case 2:
      // BOLD STATEMENT
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .logo-bar { padding: 20px; text-align: center; border-bottom: 1px solid #e5e5e5; }
    .logo-bar img { max-width: 140px; opacity: 0.9; }
    .hero { padding: 60px 20px; text-align: center; background: linear-gradient(180deg, #fff 0%, #f9f9f9 100%); }
    .check-big { width: 80px; height: 80px; background: #2ECC71; border-radius: 50%; margin: 0 auto 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(46,204,113,0.3); }
    h1 { margin: 0 0 16px; font-size: 48px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; }
    .subtitle { font-size: 18px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .badge { background: #000; color: #fff; padding: 12px 32px; display: inline-block; margin-top: 32px; font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 2px; }
    .content { padding: 40px 20px; }
    .section-title { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-bottom: 24px; }
    .card { background: #f9f9f9; padding: 20px; border: 2px solid #e5e5e5; margin-bottom: 16px; display: flex; align-items: center; gap: 16px; }
    .card-img { width: 70px; height: 90px; background: #fff; border: 1px solid #ddd; }
    .card-name { font-size: 16px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
    .card-meta { font-size: 13px; color: #666; }
    .card-price { font-size: 20px; font-weight: 900; }
    .total-box { background: #000; color: #fff; padding: 32px; text-align: center; margin-top: 32px; }
    .total-label { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; color: #2ECC71; }
    .total-amount { font-size: 48px; font-weight: 900; }
    .footer { background: #000; color: #999; padding: 32px 20px; text-align: center; font-size: 12px; }
    .footer a { color: #2ECC71; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${siteUrl}/logomose.png" alt="MOSE"/></div>
    <div class="hero">
      <div class="check-big">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>BEDANKT!</h1>
      <div class="subtitle">Bestelling Bevestigd</div>
      <div style="font-size:15px;color:#999">Hey ${customerName}, je order is binnen</div>
      <div class="badge">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="section-title">Je Items</div>
      ${productItemsHtml.map(item => `
        <div class="card">
          <div class="card-img"></div>
          <div style="flex:1">
            <div class="card-name">${item.name}</div>
            <div class="card-meta">SIZE ${item.size} • ${item.color.toUpperCase()}</div>
            <div class="card-meta">QTY: ${item.quantity}</div>
          </div>
          <div class="card-price">€${item.total}</div>
        </div>
      `).join('')}
      <div class="total-box">
        <div class="total-label">Totaal Betaald</div>
        <div class="total-amount">€${orderTotal.toFixed(2)}</div>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • GRONINGEN</p>
      <p><a href="mailto:bestellingen@orders.mosewear.nl">BESTELLINGEN@ORDERS.MOSEWEAR.NL</a></p>
    </div>
  </div>
</body>
</html>`

    case 3:
      // RECEIPT STYLE
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Courier New', monospace; background: #f5f5f5; }
    .wrapper { max-width: 500px; margin: 20px auto; background: #fff; border: 2px dashed #000; padding: 40px 30px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo img { max-width: 160px; }
    .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 20px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: 2px; }
    .check-row { text-align: center; margin: 20px 0; }
    .check-box { display: inline-block; width: 48px; height: 48px; background: #2ECC71; color: #fff; border: 2px solid #000; font-size: 24px; line-height: 44px; }
    .field { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; border-bottom: 1px dotted #ddd; }
    .label { color: #666; text-transform: uppercase; font-size: 11px; }
    .value { font-weight: 700; }
    .divider { border-top: 1px dashed #000; margin: 24px 0; }
    .items-title { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px; }
    .item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dotted #ddd; font-size: 12px; }
    .item-name { font-weight: 700; margin-bottom: 4px; }
    .item-meta { font-size: 11px; color: #666; }
    .totals { margin-top: 24px; }
    .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .total-final { border-top: 2px solid #000; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: 700; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px dashed #000; font-size: 11px; color: #666; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo"><img src="${siteUrl}/logomose.png" alt="MOSE"/></div>
    <div class="header">
      <div class="title">ORDER BEVESTIGD</div>
      <div style="font-size:12px;color:#666">GRONINGEN, NEDERLAND</div>
    </div>
    <div class="check-row"><div class="check-box">✓</div></div>
    <div class="field"><span class="label">Order Nummer</span><span class="value">#${orderId.slice(0,8).toUpperCase()}</span></div>
    <div class="field"><span class="label">Klant</span><span class="value">${customerName}</span></div>
    <div class="field"><span class="label">Adres</span><span class="value">${shippingAddress.city}</span></div>
    <div class="divider"></div>
    <div class="items-title">ITEMS</div>
    ${productItemsHtml.map(item => `
      <div class="item">
        <div style="flex:1">
          <div class="item-name">${item.name}</div>
          <div class="item-meta">SIZE: ${item.size} | COLOR: ${item.color} | QTY: ${item.quantity}</div>
        </div>
        <div style="font-weight:700">€${item.total}</div>
      </div>
    `).join('')}
    <div class="totals">
      <div class="total-row"><span>SUBTOTAL</span><span>€${(orderTotal-5.95).toFixed(2)}</span></div>
      <div class="total-row"><span>VERZENDING</span><span>€5.95</span></div>
      <div class="total-row total-final"><span>TOTAAL</span><span>€${orderTotal.toFixed(2)}</span></div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong></p>
      <p>VRAGEN? BESTELLINGEN@ORDERS.MOSEWEAR.NL</p>
    </div>
  </div>
</body>
</html>`

    case 4:
      // SPLIT HERO
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .split { display: table; width: 100%; }
    .left { display: table-cell; width: 40%; background: #000; color: #fff; padding: 60px 30px; vertical-align: middle; }
    .right { display: table-cell; width: 60%; background: #fff; padding: 60px 30px; vertical-align: middle; }
    .logo-sm { max-width: 120px; margin-bottom: 32px; }
    .split-title { font-size: 42px; font-weight: 900; line-height: 1; margin: 0 0 16px; letter-spacing: 1px; }
    .check-inline { display: inline-block; width: 32px; height: 32px; background: #2ECC71; border-radius: 50%; text-align: center; line-height: 32px; margin-right: 8px; vertical-align: middle; }
    .info { font-size: 13px; margin-top: 24px; }
    .info-row { margin-bottom: 8px; color: #ccc; }
    .right-title { font-size: 18px; font-weight: 700; margin: 0 0 24px; text-transform: uppercase; letter-spacing: 1px; }
    .item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e5e5e5; }
    .item-name { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
    .item-meta { font-size: 13px; color: #666; margin-bottom: 4px; }
    .item-price { font-size: 16px; font-weight: 700; margin-top: 8px; }
    .total-line { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 24px; border-top: 2px solid #000; font-size: 20px; font-weight: 700; }
    .footer { background: #f5f5f5; padding: 24px; text-align: center; font-size: 12px; color: #666; }
    @media only screen and (max-width: 600px) {
      .left, .right { display: block; width: 100%; padding: 40px 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="split">
      <div class="left">
        <img src="${siteUrl}/logomose.png" class="logo-sm" alt="MOSE"/>
        <div class="split-title"><span class="check-inline">✓</span>BEDANKT!</div>
        <div style="font-size:15px;color:#999;margin-bottom:24px">Je bestelling is bevestigd</div>
        <div class="info">
          <div class="info-row"><strong style="color:#fff">Order:</strong> #${orderId.slice(0,8).toUpperCase()}</div>
          <div class="info-row"><strong style="color:#fff">Klant:</strong> ${customerName}</div>
          <div class="info-row"><strong style="color:#fff">Locatie:</strong> ${shippingAddress.city}</div>
        </div>
      </div>
      <div class="right">
        <div class="right-title">Je Items</div>
        ${productItemsHtml.map(item => `
          <div class="item">
            <div class="item-name">${item.name}</div>
            <div class="item-meta">Maat ${item.size} • ${item.color}</div>
            <div class="item-meta">Aantal: ${item.quantity}</div>
            <div class="item-price">€${item.total}</div>
          </div>
        `).join('')}
        <div class="total-line"><span>Totaal</span><span>€${orderTotal.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Groningen, Nederland</p>
      <p>Vragen? <a href="mailto:bestellingen@orders.mosewear.nl" style="color:#2ECC71">bestellingen@orders.mosewear.nl</a></p>
    </div>
  </div>
</body>
</html>`

    case 5:
      // GRADIENT WAVE
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
    .wrapper { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
    .header-wave { background: linear-gradient(135deg, #2ECC71 0%, #27ae60 100%); padding: 48px 20px 64px; text-align: center; position: relative; }
    .header-wave::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 60px; background: #fff; border-radius: 50% 50% 0 0 / 0 0 32px 32px; }
    .logo-center { max-width: 160px; margin-bottom: 24px; filter: brightness(0) invert(1); }
    .check-modern { width: 64px; height: 64px; background: #fff; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .content { padding: 32px 24px; }
    .greeting { font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 8px; }
    .subtext { font-size: 15px; color: #666; text-align: center; margin-bottom: 24px; }
    .badge { background: #f0f0f0; border-radius: 24px; padding: 8px 20px; font-size: 13px; font-weight: 600; display: inline-block; margin-bottom: 32px; }
    .card { background: #f9f9f9; border-radius: 12px; padding: 20px; display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
    .card-img { width: 60px; height: 75px; background: #fff; border-radius: 8px; border: 1px solid #e5e5e5; }
    .card-name { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .card-meta { font-size: 13px; color: #666; }
    .card-price { font-size: 18px; font-weight: 700; color: #2ECC71; }
    .summary { background: linear-gradient(135deg, #000 0%, #1a1a1a 100%); border-radius: 12px; padding: 24px; margin-top: 24px; color: #fff; }
    .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .total { border-top: 1px solid #333; padding-top: 16px; margin-top: 8px; font-size: 22px; font-weight: 700; }
    .footer { background: #f5f5f5; padding: 32px 24px; text-align: center; font-size: 13px; color: #666; }
    .footer a { color: #2ECC71; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header-wave">
      <img src="${siteUrl}/logomose.png" class="logo-center" alt="MOSE"/>
      <div class="check-modern">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2ECC71" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </div>
    <div class="content">
      <div class="greeting">Bedankt, ${customerName}!</div>
      <div class="subtext">Je bestelling is bevestigd en wordt verwerkt</div>
      <div style="text-align:center"><span class="badge">#${orderId.slice(0,8).toUpperCase()}</span></div>
      ${productItemsHtml.map(item => `
        <div class="card">
          <div class="card-img"></div>
          <div style="flex:1">
            <div class="card-name">${item.name}</div>
            <div class="card-meta">Maat ${item.size} • ${item.color} • ${item.quantity}x</div>
          </div>
          <div class="card-price">€${item.total}</div>
        </div>
      `).join('')}
      <div class="summary">
        <div class="row"><span>Subtotaal</span><span>€${(orderTotal-5.95).toFixed(2)}</span></div>
        <div class="row"><span>Verzending</span><span>€5.95</span></div>
        <div class="row total"><span>Totaal</span><span>€${orderTotal.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • Groningen, Nederland</p>
      <p>Vragen? Mail naar <a href="mailto:bestellingen@orders.mosewear.nl">bestellingen@orders.mosewear.nl</a></p>
    </div>
  </div>
</body>
</html>`

    default:
      return '<h1>Invalid design number</h1>'
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const design = parseInt(searchParams.get('design') || '1')
  
  if (design < 1 || design > 5) {
    return new NextResponse('Invalid design number. Use 1-5', { status: 400 })
  }
  
  const html = generateDesign(design, testData)
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
