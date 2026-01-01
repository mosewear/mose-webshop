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

export async function sendOrderConfirmationEmail(props: OrderEmailProps) {
  const { customerName, customerEmail, orderId, orderTotal, orderItems, shippingAddress } = props

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
          .order-box { background: white; border: 2px solid #1a1a1a; padding: 20px; margin: 20px 0; }
          .item { border-bottom: 1px solid #eee; padding: 15px 0; }
          .item:last-child { border-bottom: none; }
          .total { font-size: 24px; font-weight: bold; text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #1a1a1a; }
          .footer { background: #1a1a1a; color: white; padding: 20px; text-align: center; font-size: 14px; }
          .button { display: inline-block; background: #2ECC71; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MOSE</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; letter-spacing: 2px;">MOSEWEAR.COM</p>
        </div>
        
        <div class="content">
          <h2>Bedankt voor je bestelling!</h2>
          <p>Hey ${customerName},</p>
          <p>Je bestelling is succesvol geplaatst. We gaan direct aan de slag om alles voor je klaar te maken.</p>
          
          <div class="order-box">
            <p><strong>Bestelnummer:</strong> #${orderId.slice(0, 8).toUpperCase()}</p>
            
            <h3>Je items:</h3>
            ${orderItems.map(item => `
              <div class="item">
                <strong>${item.name}</strong><br>
                <span style="color: #666;">Maat: ${item.size} • Kleur: ${item.color} • x${item.quantity}</span><br>
                <span style="float: right; font-weight: bold;">€${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="total">
              Totaal: €${orderTotal.toFixed(2)}
            </div>
          </div>
          
          <div class="order-box">
            <h3>Bezorgadres:</h3>
            <p>
              ${shippingAddress.name}<br>
              ${shippingAddress.address}<br>
              ${shippingAddress.postalCode} ${shippingAddress.city}
            </p>
          </div>
          
          <h3>Wat gebeurt er nu?</h3>
          <ol>
            <li><strong>Bevestiging:</strong> Deze email bevestigt je bestelling</li>
            <li><strong>Inpakken:</strong> We pakken je items binnen 1-2 werkdagen in</li>
            <li><strong>Verzending:</strong> Je ontvangt een track & trace zodra het onderweg is</li>
          </ol>
          
          <center>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/order-confirmation?order=${orderId}" class="button">Bekijk je bestelling</a>
          </center>
        </div>
        
        <div class="footer">
          <p><strong>MOSE</strong> • Groningen, Nederland</p>
          <p>Vragen? Stuur een mail naar <a href="mailto:info@mosewear.nl" style="color: #2ECC71;">info@mosewear.nl</a></p>
        </div>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE <orders@mosewear.nl>',
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
          <p>Vragen? Stuur een mail naar <a href="mailto:info@mosewear.nl" style="color: #2ECC71;">info@mosewear.nl</a></p>
        </div>
      </body>
    </html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MOSE <orders@mosewear.nl>',
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

