import { NextRequest, NextResponse } from 'next/server'

// Import the design generators directly
const designs = {
  1: 'MINIMALIST BLACK',
  2: 'BOLD STATEMENT',
  3: 'RECEIPT STYLE',
  4: 'SPLIT HERO',
  5: 'GRADIENT WAVE'
}

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
  
  // For preview, we'll generate simpler inline versions
  // In production, use the full email-designs.ts file
  
  if (designNumber === 1) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif;background:#f5f5f5}.email-wrapper{max-width:600px;margin:0 auto;background:#fff}.header{background:#000;padding:40px 20px;text-align:center}.header img{max-width:180px;height:auto}.hero{background:#fff;padding:50px 20px;text-align:center;border-bottom:1px solid #e5e5e5}.check-icon{width:64px;height:64px;background:#2ECC71;border-radius:50%;margin:0 auto 24px;display:flex;align-items:center;justify-content:center}.hero h1{margin:0 0 12px;font-size:32px;font-weight:700;color:#000;letter-spacing:-.5px}.hero p{margin:0;font-size:16px;color:#666}.order-number{display:inline-block;background:#f5f5f5;padding:12px 24px;margin-top:24px;font-family:'Courier New',monospace;font-size:14px;font-weight:600;color:#000;border:1px solid #e5e5e5}.content{padding:40px 20px}.section-title{font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#000;margin:0 0 20px}.product-item{display:flex;padding:20px 0;border-bottom:1px solid #e5e5e5}.product-item:last-child{border-bottom:none}.product-image{width:80px;height:100px;background:#f5f5f5;border:1px solid #e5e5e5;margin-right:16px;flex-shrink:0}.product-details{flex:1}.product-name{font-size:15px;font-weight:600;color:#000;margin:0 0 8px}.product-meta{font-size:13px;color:#666;margin:0 0 4px}.product-price{font-size:16px;font-weight:600;color:#000;text-align:right}.summary{background:#000;color:#fff;padding:30px 20px;margin-top:30px}.summary-row{display:flex;justify-content:space-between;margin-bottom:12px;font-size:15px}.summary-total{display:flex;justify-content:space-between;padding-top:16px;border-top:1px solid #333;font-size:20px;font-weight:700}.footer{background:#000;color:#fff;padding:40px 20px;text-align:center;font-size:13px}.footer a{color:#2ECC71;text-decoration:none}</style></head><body><div class="email-wrapper"><div class="header"><img src="${siteUrl}/logomose.png" alt="MOSE"/></div><div class="hero"><div class="check-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></div><h1>Bedankt voor je bestelling!</h1><p>Hey ${customerName}, je order is bevestigd</p><div class="order-number">#${orderId.slice(0,8).toUpperCase()}</div></div><div class="content"><h2 class="section-title">Je Items</h2>${orderItems.map(item=>`<div class="product-item"><div class="product-image"></div><div class="product-details"><p class="product-name">${item.name}</p><p class="product-meta">Maat ${item.size} • ${item.color}</p><p class="product-meta">Aantal: ${item.quantity}</p></div><div class="product-price">€${(item.price*item.quantity).toFixed(2)}</div></div>`).join('')}<div class="summary"><div class="summary-row"><span>Subtotaal</span><span>€${(orderTotal-5.95).toFixed(2)}</span></div><div class="summary-row"><span>Verzending</span><span>€5.95</span></div><div class="summary-total"><span>Totaal</span><span>€${orderTotal.toFixed(2)}</span></div></div></div><div class="footer"><p><strong>MOSE</strong> • Groningen, Nederland</p><p style="margin-top:8px">Vragen? Mail naar <a href="mailto:bestellingen@orders.mosewear.nl">bestellingen@orders.mosewear.nl</a></p></div></div></body></html>`
  }
  
  // Add other designs similarly...
  // For now, return a placeholder
  return `<h1>Design ${designNumber} - ${designs[designNumber as keyof typeof designs]}</h1><p>Full implementation in production</p>`
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

