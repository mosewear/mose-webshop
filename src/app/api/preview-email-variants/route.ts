import { NextRequest, NextResponse } from 'next/server'

const testData = {
  customerName: 'Rick Schlimback',
  customerEmail: 'h.schlimback@gmail.com',
  orderId: 'abc123def456',
  orderTotal: 124.95,
  subtotal: 103.26, // excl BTW
  btw: 21.69, // 21% BTW
  shipping: 5.95,
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

function generateVariant(variantNumber: number, data: typeof testData): string {
  const { customerName, orderId, orderTotal, subtotal, btw, shipping, orderItems, shippingAddress } = data
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
  const logoUrl = `${siteUrl}/logomose.png`
  
  const productItemsHtml = orderItems.map(item => ({
    name: item.name,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    total: (item.price * item.quantity).toFixed(2)
  }))
  
  switch(variantNumber) {
    case 1:
      // VARIANT A: Kleinere totaal in sidebar box, BTW breakdown
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .logo-bar { padding: 20px; text-align: center; border-bottom: 1px solid #e5e5e5; }
    .logo-bar img { max-width: 140px; opacity: 0.9; display: block; margin: 0 auto; }
    .hero { padding: 50px 20px; text-align: center; background: linear-gradient(180deg, #fff 0%, #f9f9f9 100%); }
    .check-big { width: 70px; height: 70px; background: #2ECC71; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(46,204,113,0.3); }
    h1 { margin: 0 0 12px; font-size: 42px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 2px; line-height: 1; }
    .subtitle { font-size: 16px; color: #666; font-weight: 600; margin-bottom: 6px; }
    .subtext { font-size: 14px; color: #999; }
    .badge { background: #000; color: #fff; padding: 10px 28px; display: inline-block; margin-top: 24px; font-family: monospace; font-size: 15px; font-weight: 700; letter-spacing: 2px; }
    .content { padding: 40px 20px; }
    .section-title { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; text-align: center; margin-bottom: 20px; }
    .card { background: #f9f9f9; padding: 18px; border: 2px solid #e5e5e5; margin-bottom: 12px; display: flex; align-items: center; gap: 14px; }
    .card-img { width: 65px; height: 85px; background: #fff; border: 1px solid #ddd; flex-shrink: 0; }
    .card-name { font-size: 15px; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
    .card-meta { font-size: 12px; color: #666; margin-bottom: 3px; }
    .card-price { font-size: 18px; font-weight: 900; white-space: nowrap; }
    .summary-box { background: #f9f9f9; border: 2px solid #000; padding: 24px; margin-top: 24px; }
    .summary-title { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; text-align: center; }
    .sum-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 15px; border-bottom: 1px dashed #ddd; }
    .sum-row:last-child { border-bottom: none; }
    .sum-btw { color: #666; font-size: 13px; }
    .sum-total { font-size: 22px; font-weight: 900; padding-top: 14px; margin-top: 10px; border-top: 2px solid #000; }
    .footer { background: #000; color: #999; padding: 32px 20px; text-align: center; font-size: 12px; }
    .footer a { color: #2ECC71; font-weight: 600; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      h1 { font-size: 36px; }
      .card { flex-direction: column; align-items: flex-start; }
      .card-price { margin-top: 8px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;"/></div>
    <div class="hero">
      <div class="check-big">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <h1>BEDANKT!</h1>
      <div class="subtitle">Bestelling Bevestigd</div>
      <div class="subtext">Hey ${customerName}, je order is binnen</div>
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
            <div class="card-meta">AANTAL: ${item.quantity}x</div>
          </div>
          <div class="card-price">€${item.total}</div>
        </div>
      `).join('')}
      
      <div class="summary-box">
        <div class="summary-title">Overzicht</div>
        <div class="sum-row">
          <span>Subtotaal</span>
          <span style="font-weight:600">€${subtotal.toFixed(2)}</span>
        </div>
        <div class="sum-row sum-btw">
          <span>BTW (21%)</span>
          <span>€${btw.toFixed(2)}</span>
        </div>
        <div class="sum-row">
          <span>Verzending</span>
          <span style="font-weight:600">€${shipping.toFixed(2)}</span>
        </div>
        <div class="sum-row sum-total">
          <span>TOTAAL</span>
          <span>€${orderTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p><strong>MOSE</strong> • GRONINGEN</p>
      <p style="margin-top:8px"><a href="mailto:bestellingen@orders.mosewear.nl">BESTELLINGEN@ORDERS.MOSEWEAR.NL</a></p>
    </div>
  </div>
</body>
</html>`

    case 2:
      // VARIANT B: Totaal in zwarte box onderaan, prominente BTW, meer spacing
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fff; }
    .wrapper { max-width: 600px; margin: 0 auto; }
    .logo-bar { padding: 24px; text-align: center; border-bottom: 1px solid #e5e5e5; }
    .logo-bar img { max-width: 140px; display: block; margin: 0 auto; }
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
    .footer a { color: #2ECC71; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:140px;margin:0 auto;"/></div>
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
          <div class="prod-img"></div>
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
          <span style="font-weight:600">€${subtotal.toFixed(2)}</span>
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

    case 3:
      // VARIANT C: Moderne cards, totaal in groene accent box, uitgebreide BTW info
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #fafafa; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #fff; }
    .top-bar { background: #000; padding: 16px 20px; text-align: center; }
    .top-bar img { max-width: 130px; display: block; margin: 0 auto; filter: brightness(0) invert(1); }
    .hero { padding: 48px 20px 36px; text-align: center; background: #fff; }
    .check-badge { width: 68px; height: 68px; background: linear-gradient(135deg, #2ECC71 0%, #27ae60 100%); border-radius: 50%; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(46,204,113,0.3); }
    h1 { margin: 0 0 8px; font-size: 40px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 1.5px; }
    .status { font-size: 14px; color: #2ECC71; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
    .name { font-size: 15px; color: #666; }
    .order-id { background: #f5f5f5; border: 2px solid #e5e5e5; padding: 8px 20px; display: inline-block; margin-top: 18px; font-family: monospace; font-size: 13px; font-weight: 700; }
    .content { padding: 28px 20px; }
    .sec-title { font-size: 17px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; color: #000; }
    .item-card { background: #fff; border: 2px solid #f0f0f0; padding: 14px; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; transition: border-color 0.2s; }
    .item-card:hover { border-color: #2ECC71; }
    .item-img { width: 58px; height: 75px; background: #fafafa; border: 1px solid #e5e5e5; flex-shrink: 0; }
    .item-details { flex: 1; }
    .item-title { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
    .item-specs { font-size: 12px; color: #666; }
    .item-amount { font-size: 16px; font-weight: 900; }
    .price-box { background: linear-gradient(135deg, #2ECC71 0%, #27ae60 100%); color: #fff; padding: 24px 20px; margin-top: 24px; border-radius: 8px; }
    .price-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 14px; text-align: center; opacity: 0.9; }
    .price-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; }
    .price-row-small { font-size: 13px; opacity: 0.85; }
    .price-sep { border-top: 1px solid rgba(255,255,255,0.3); margin: 10px 0; }
    .price-final { font-size: 26px; font-weight: 900; text-align: center; margin-top: 12px; letter-spacing: 0.5px; }
    .btw-note { text-align: center; font-size: 11px; margin-top: 8px; opacity: 0.8; }
    .footer-dark { background: #1a1a1a; color: #888; padding: 28px 20px; text-align: center; font-size: 12px; }
    .footer-dark strong { color: #fff; }
    .footer-dark a { color: #2ECC71; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="top-bar"><img src="${logoUrl}" alt="MOSE" style="display:block;max-width:130px;margin:0 auto;filter:brightness(0) invert(1);"/></div>
    <div class="hero">
      <div class="check-badge">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <div class="status">✓ Bestelling Bevestigd</div>
      <h1>BEDANKT!</h1>
      <div class="name">Hey ${customerName} 👋</div>
      <div class="order-id">#${orderId.slice(0,8).toUpperCase()}</div>
    </div>
    <div class="content">
      <div class="sec-title">Je Bestelling</div>
      ${productItemsHtml.map(item => `
        <div class="item-card">
          <div class="item-img"></div>
          <div class="item-details">
            <div class="item-title">${item.name}</div>
            <div class="item-specs">Maat ${item.size} • ${item.color} • ${item.quantity}x</div>
          </div>
          <div class="item-amount">€${item.total}</div>
        </div>
      `).join('')}
      
      <div class="price-box">
        <div class="price-title">Betaald Bedrag</div>
        <div class="price-row">
          <span>Subtotaal</span>
          <span style="font-weight:600">€${subtotal.toFixed(2)}</span>
        </div>
        <div class="price-row price-row-small">
          <span>BTW (21%)</span>
          <span>€${btw.toFixed(2)}</span>
        </div>
        <div class="price-row">
          <span>Verzending</span>
          <span style="font-weight:600">€${shipping.toFixed(2)}</span>
        </div>
        <div class="price-sep"></div>
        <div class="price-final">€${orderTotal.toFixed(2)}</div>
        <div class="btw-note">Incl. BTW • Betaling voltooid</div>
      </div>
    </div>
    <div class="footer-dark">
      <p><strong>MOSE</strong> • Groningen, Nederland</p>
      <p style="margin-top:8px"><a href="mailto:bestellingen@orders.mosewear.nl">bestellingen@orders.mosewear.nl</a></p>
    </div>
  </div>
</body>
</html>`

    default:
      return '<h1>Invalid variant</h1>'
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const variant = parseInt(searchParams.get('variant') || '1')
  
  if (variant < 1 || variant > 3) {
    return new NextResponse('Invalid variant number. Use 1-3', { status: 400 })
  }
  
  const html = generateVariant(variant, testData)
  
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

