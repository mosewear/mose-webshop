import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendOrderConfirmationEmail } from '@/lib/email'
import { createReturnLabelSimple } from '@/lib/sendcloud-return-simple'
import { sendReturnLabelGeneratedEmail } from '@/lib/email'
import { updateOrderStatusForReturn } from '@/lib/update-order-status'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())

// Trim whitespace from webhook secret (common issue when copying from Stripe Dashboard)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      // PRIMARY EVENT: Payment Intent Succeeded (for Payment Element flow)
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Use service role key for webhooks to bypass RLS policies
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )
        
        console.log('💳 Webhook: Payment Intent Succeeded:', paymentIntent.id)
        
        // Check if this is a return label payment
        // Method 1: Check metadata (primary method)
        let returnId = paymentIntent.metadata?.return_id
        const isReturnPayment = paymentIntent.metadata?.type === 'return_label_payment'
        
        // Method 2: Fallback - check if payment intent ID exists in returns table
        if (!isReturnPayment || !returnId) {
          console.log('🔍 Webhook: Metadata check failed, checking database for return_label_payment_intent_id...')
          const { data: returnRecord } = await supabase
            .from('returns')
            .select('id')
            .eq('return_label_payment_intent_id', paymentIntent.id)
            .single()
          
          if (returnRecord) {
            returnId = returnRecord.id
            console.log('🔄 Webhook: Return label payment detected via database lookup for return:', returnId)
          }
        }
        
        if (returnId) {
          console.log('🔄 Webhook: Return label payment detected for return:', returnId)
          
          // Haal retour op voor email data
          const { data: returnRecordBefore, error: fetchError } = await supabase
            .from('returns')
            .select('*, orders!inner(email, shipping_address)')
            .eq('id', returnId)
            .single()

          if (fetchError || !returnRecordBefore) {
            console.error('❌ Error fetching return before update:', fetchError)
            console.error('⚠️ Return not found, but acknowledging webhook to prevent disabling')
            // IMPORTANT: Return 200 OK even on business logic errors to prevent Stripe from disabling webhook
            return NextResponse.json({ 
              received: true,
              warning: 'Return not found', 
              return_id: returnId,
              payment_intent_id: paymentIntent.id 
            }, { status: 200 })
          }

          // Update return status
          const { data: returnRecord, error: returnError } = await supabase
            .from('returns')
            .update({
              status: 'return_label_payment_completed',
              return_label_payment_status: 'completed',
              return_label_paid_at: new Date().toISOString(),
            })
            .eq('id', returnId)
            .select()
            .single()
          
          if (returnError) {
            console.error('❌ Error updating return payment status:', returnError)
            console.error('   Return ID:', returnId)
            console.error('   Payment Intent ID:', paymentIntent.id)
            console.error('⚠️ Database error, but acknowledging webhook to prevent disabling')
            // IMPORTANT: Return 200 OK even on business logic errors to prevent Stripe from disabling webhook
            return NextResponse.json({ 
              received: true,
              warning: 'Failed to update return status', 
              return_id: returnId,
              payment_intent_id: paymentIntent.id,
              details: returnError.message 
            }, { status: 200 })
          }
          
          if (!returnRecord) {
            console.error('❌ Return record not returned after update')
            console.error('⚠️ Unexpected state, but acknowledging webhook to prevent disabling')
            // IMPORTANT: Return 200 OK even on business logic errors to prevent Stripe from disabling webhook
            return NextResponse.json({ 
              received: true,
              warning: 'Return not found after update', 
              return_id: returnId,
              payment_intent_id: paymentIntent.id 
            }, { status: 200 })
          }
          
          console.log('✅ Return payment status updated:', returnId)
          console.log('   New status:', returnRecord.status)
          console.log('   Payment status:', returnRecord.return_label_payment_status)
          
          // Verstuur "Retourverzoek ontvangen" email na betaling
            try {
              if (returnRecordBefore) {
                const { sendReturnRequestedEmail } = await import('@/lib/email')
                const order = returnRecordBefore.orders as any
                const shippingAddress = order.shipping_address as any
                const returnItems = returnRecordBefore.return_items as any[]

                await sendReturnRequestedEmail({
                  customerEmail: order.email,
                  customerName: shippingAddress?.name || 'Klant',
                  returnId: returnId,
                  orderId: returnRecordBefore.order_id,
                  returnReason: returnRecordBefore.return_reason,
                  returnItems: returnItems.map((item: any) => {
                    // Try to get product details from order items if available
                    return {
                      product_name: item.product_name || 'Product',
                      quantity: item.quantity,
                      size: item.size || '',
                      color: item.color || '',
                    }
                  }),
                })
                console.log('✅ Return requested email sent after payment')
              }
            } catch (emailError) {
              console.error('❌ Error sending return requested email:', emailError)
              // Don't fail webhook if email fails
            }
            
            // Automatisch label genereren (direct in webhook, geen fetch nodig)
            let labelGenerationSuccess = false
            let labelGenerationError: string | null = null
            try {
              console.log(`🔄 Attempting to generate label for return: ${returnId}`)
              
              // Check of Sendcloud is geconfigureerd
              if (!process.env.SENDCLOUD_PUBLIC_KEY || !process.env.SENDCLOUD_SECRET_KEY) {
                const errorMsg = 'Sendcloud niet geconfigureerd'
                console.warn(`⚠️ ${errorMsg}, cannot auto-generate label`)
                console.warn('   Admin must generate label manually')
                labelGenerationError = errorMsg
              } else {
                // Check of label al is gegenereerd (korte check)
                const { data: existingReturn } = await supabase
                  .from('returns')
                  .select('return_label_url')
                  .eq('id', returnId)
                  .single()
                
                if (existingReturn?.return_label_url) {
                  labelGenerationSuccess = true
                  console.log('✅ Label already exists for return:', returnId)
                  console.log(`   Existing label URL: ${existingReturn.return_label_url}`)
                } else {
                  // Haal volledige return op met order en items
                  const { data: returnRecord, error: returnFetchError } = await supabase
                    .from('returns')
                    .select('*, orders!inner(*)')
                    .eq('id', returnId)
                    .single()
                  
                  if (returnFetchError || !returnRecord) {
                    const errorMsg = `Error fetching return: ${returnFetchError?.message || 'Return not found'}`
                    console.error('❌ Error fetching return for label generation:', returnFetchError)
                    labelGenerationError = errorMsg
                  } else {
                    // Haal order items op
                    const { data: order, error: orderError } = await supabase
                      .from('orders')
                      .select('*, order_items(*)')
                      .eq('id', returnRecord.order_id)
                      .single()
                    
                    if (orderError || !order) {
                      const errorMsg = `Error fetching order: ${orderError?.message || 'Order not found'}`
                      console.error('❌ Error fetching order for label generation:', orderError)
                      labelGenerationError = errorMsg
                    } else {
                      console.log('   Generating label via Sendcloud...')
                      console.log(`   Return ID: ${returnId}`)
                      console.log(`   Order ID: ${order.id}`)
                      console.log(`   Return items count: ${returnRecord.return_items?.length || 0}`)
                      
                      const labelData = await createReturnLabelSimple(
                        returnId,
                        order,
                        returnRecord.return_items as any[]
                      )
                      
                      console.log('   Label data received from Sendcloud:', {
                        hasLabelUrl: !!labelData.label_url,
                        hasTrackingCode: !!labelData.tracking_number,
                        parcelId: labelData.parcel_id,
                      })
                      
                      // Update return met label informatie
                      const { data: updatedReturn, error: updateError } = await supabase
                        .from('returns')
                        .update({
                          status: 'return_label_generated',
                          sendcloud_return_id: labelData.parcel_id,
                          return_tracking_code: labelData.tracking_number,
                          return_tracking_url: labelData.tracking_url,
                          return_label_url: labelData.label_url,
                          label_generated_at: new Date().toISOString(),
                        })
                        .eq('id', returnId)
                        .select()
                        .single()
                      
                      if (updateError) {
                        const errorMsg = `Error updating return: ${updateError.message}`
                        console.error('❌ Error updating return with label:', updateError)
                        labelGenerationError = errorMsg
                      } else {
                        labelGenerationSuccess = true
                        console.log('✅ Return label generated automatically')
                        console.log(`   Label URL: ${labelData.label_url}`)
                        console.log(`   Tracking code: ${labelData.tracking_number}`)
                        
                        // Update order status naar return_requested
                        try {
                          await updateOrderStatusForReturn(order.id, 'return_label_generated')
                        } catch (error) {
                          console.error('Error updating order status:', error)
                        }
                        
                        // Verstuur email naar klant met label (niet blokkerend)
                        try {
                          const { data: orderForEmail } = await supabase
                            .from('orders')
                            .select('email, shipping_address')
                            .eq('id', updatedReturn.order_id)
                            .single()
                          
                          if (orderForEmail) {
                            const shippingAddress = orderForEmail.shipping_address as any
                            
                            await sendReturnLabelGeneratedEmail({
                              customerEmail: orderForEmail.email,
                              customerName: shippingAddress?.name || 'Klant',
                              returnId: returnId,
                              orderId: updatedReturn.order_id,
                              trackingCode: labelData.tracking_number,
                              trackingUrl: labelData.tracking_url,
                              labelUrl: labelData.label_url,
                            })
                            console.log('✅ Return label email sent')
                          }
                        } catch (emailError) {
                          console.error('❌ Error sending return label email:', emailError)
                          // Don't fail webhook if email fails
                        }
                      }
                    }
                  }
                }
              }
            } catch (labelError) {
              const errorMsg = labelError instanceof Error 
                ? labelError.message 
                : 'Unknown error during label generation'
              labelGenerationError = errorMsg
              
              console.error('❌ Error generating return label:', labelError)
              if (labelError instanceof Error) {
                console.error('   Error name:', labelError.name)
                console.error('   Error message:', labelError.message)
                if ('cause' in labelError) {
                  console.error('   Error cause:', labelError.cause)
                }
                if (labelError.stack) {
                  console.error('   Stack trace:', labelError.stack)
                }
              }
              // Don't fail webhook, admin can generate manually
            }
            
            console.log('📊 Label generation summary:', {
              returnId,
              success: labelGenerationSuccess,
              error: labelGenerationError,
            })
          
          // Return early, don't process as order payment
          // Return success even if label generation failed (admin can generate manually)
          return NextResponse.json({ 
            received: true, 
            type: 'return_label_payment',
            return_id: returnId,
            status_updated: !!returnRecord,
            label_generation_attempted: true,
            label_generation_success: labelGenerationSuccess,
            label_generation_error: labelGenerationError,
          })
        }
        
        // Continue to normal order payment handling if not a return
        
        // Find order by payment intent ID
        const { data: order, error: findError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()
        
        if (findError || !order) {
          console.error('❌ Webhook: Order not found for payment intent:', paymentIntent.id, findError)
          console.error('⚠️ This might be a return payment or orphaned payment intent')
          console.error('⚠️ Acknowledging webhook to prevent disabling')
          // IMPORTANT: Return 200 OK - order might not exist yet or this is a different payment type
          return NextResponse.json({ 
            received: true,
            warning: 'Order not found',
            payment_intent_id: paymentIntent.id 
          }, { status: 200 })
        }
        
        console.log('✅ Webhook: Order found:', order.id)
        
        // Update order to PAID
        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: paymentIntent.payment_method_types?.[0] || 'unknown',
            payment_metadata: {
              payment_intent_id: paymentIntent.id,
              amount_received: paymentIntent.amount_received,
              currency: paymentIntent.currency,
              payment_method_types: paymentIntent.payment_method_types,
            },
            status: 'processing', // Move to processing when paid
          })
          .eq('id', order.id)
          .select('*, order_items(*)')
          .single()
        
        if (updateError) {
          console.error('❌ Error updating order:', updateError)
          console.error('⚠️ Critical: Order exists but failed to update to PAID status')
          console.error('⚠️ Order ID:', order.id)
          console.error('⚠️ Payment Intent:', paymentIntent.id)
          console.error('⚠️ Acknowledging webhook to prevent disabling - manual intervention may be needed')
          // IMPORTANT: Return 200 OK even on critical errors to prevent Stripe from disabling webhook
          // Log extensively so we can manually fix this order
          return NextResponse.json({ 
            received: true,
            warning: 'Failed to update order - requires manual review',
            order_id: order.id,
            payment_intent_id: paymentIntent.id
          }, { status: 200 })
        }
        
        console.log(`✅ Order ${order.id} marked as PAID (payment_status: paid, status: processing)`)
        
        // ============================================
        // DECREMENT STOCK AFTER PAYMENT SUCCESS
        // ============================================
        try {
          console.log('═════════════════════════════════════════')
          console.log('📦 [WEBHOOK] STOCK DECREMENT STARTING')
          console.log('═════════════════════════════════════════')
          console.log('Order ID:', order.id)
          console.log('Total items:', updatedOrder.order_items.length)
          console.log('═════════════════════════════════════════')
          
          for (const item of updatedOrder.order_items) {
            try {
              // Fetch variant with both regular and presale stock
              const { data: variant, error: fetchError } = await supabase
                .from('product_variants')
                .select('id, stock_quantity, presale_enabled, presale_stock_quantity')
                .eq('id', item.variant_id)
                .single()
              
              if (fetchError || !variant) {
                console.error(`⚠️ Could not fetch variant for ${item.product_name}:`, fetchError)
                continue
              }

              // Determine if this was a presale purchase
              const isPresalePurchase = item.is_presale === true
              
              console.log(`\n📦 Item: ${item.product_name}`)
              console.log(`   - Order item is_presale: ${item.is_presale}`)
              console.log(`   - Calculated isPresalePurchase: ${isPresalePurchase}`)
              console.log(`   - Variant presale_enabled: ${variant.presale_enabled}`)
              console.log(`   - Regular stock (before): ${variant.stock_quantity}`)
              console.log(`   - Presale stock (before): ${variant.presale_stock_quantity}`)
              console.log(`   - Quantity ordered: ${item.quantity}`)

              if (isPresalePurchase) {
                // Decrement PRESALE stock
                const newPresaleStock = Math.max(0, (variant.presale_stock_quantity || 0) - item.quantity)
                console.log(`   → 🔄 Decrementing PRESALE stock to: ${newPresaleStock}`)
                
                const { error: updateError } = await supabase
                  .from('product_variants')
                  .update({ 
                    presale_stock_quantity: newPresaleStock
                  })
                  .eq('id', item.variant_id)
                
                if (updateError) {
                  console.error(`   → ❌ Failed to decrement presale stock:`, updateError)
                } else {
                  console.log(`   → ✅ Presale stock updated! ${newPresaleStock} remaining`)
                }
              } else {
                // Decrement REGULAR stock
                const newStock = Math.max(0, variant.stock_quantity - item.quantity)
                console.log(`   → 🔄 Decrementing REGULAR stock to: ${newStock}`)
                
                const { error: updateError } = await supabase
                  .from('product_variants')
                  .update({ 
                    stock_quantity: newStock
                  })
                  .eq('id', item.variant_id)
                
                if (updateError) {
                  console.error(`   → ❌ Failed to decrement regular stock:`, updateError)
                } else {
                  console.log(`   → ✅ Regular stock updated! ${newStock} remaining`)
                }
              }
            } catch (itemError) {
              console.error(`❌ Error processing stock for item:`, itemError)
              // Continue with next item
            }
          }
          
          console.log('═════════════════════════════════════════')
          console.log('✅ [WEBHOOK] STOCK DECREMENT COMPLETED')
          console.log('═════════════════════════════════════════')
        } catch (stockError) {
          console.error('❌ Error during stock decrement:', stockError)
          // Don't fail webhook - order is already paid, stock can be adjusted manually
        }
        
        // Send order confirmation email
        if (updatedOrder) {
          try {
            console.log('═════════════════════════════════════════')
            console.log('📧 [WEBHOOK] PREPARING ORDER CONFIRMATION EMAIL')
            console.log('═════════════════════════════════════════')
            const shippingAddress = updatedOrder.shipping_address as any
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
            
            console.log(`📧 Recipient: ${updatedOrder.email}`)
            console.log(`📧 Order ID: ${updatedOrder.id}`)
            console.log(`📧 Order Total: €${updatedOrder.total}`)
            console.log(`📧 Locale: ${updatedOrder.locale || 'nl'}`)
            console.log('═════════════════════════════════════════')
            console.log('📦 ORDER ITEMS FOR EMAIL:')
            
            const emailOrderItems = updatedOrder.order_items.map((item: any, index: number) => {
              console.log(`   Item ${index + 1}:`, {
                name: item.product_name,
                quantity: item.quantity,
                is_presale: item.is_presale,
                presale_expected_date: item.presale_expected_date,
              })
              
              return {
                name: item.product_name,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                price: item.price_at_purchase,
                imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url}`) : '',
                isPresale: item.is_presale || false,  // PRESALE: Pass presale status
                presaleExpectedDate: item.presale_expected_date || undefined,  // PRESALE: Expected date
              }
            })
            
            console.log('═════════════════════════════════════════')
            
            const emailResult = await sendOrderConfirmationEmail({
              customerName: shippingAddress?.name || 'Klant',
              customerEmail: updatedOrder.email,
              orderId: updatedOrder.id,
              orderTotal: updatedOrder.total,
              orderItems: emailOrderItems,
              shippingAddress: {
                name: shippingAddress?.name || '',
                address: shippingAddress?.address || '',
                city: shippingAddress?.city || '',
                postalCode: shippingAddress?.postalCode || '',
              },
              locale: updatedOrder.locale || 'nl', // Pass locale for multi-language emails
            })
            
            if (emailResult.success) {
              console.log('✅ [WEBHOOK] Order confirmation email sent successfully!')
              console.log('✅ [WEBHOOK] Email ID:', emailResult.data)
              
              // Update last_email_sent_at to prevent duplicate emails
              try {
                await supabase
                  .from('orders')
                  .update({ 
                    last_email_sent_at: new Date().toISOString(),
                    last_email_type: 'order_confirmation'
                  })
                  .eq('id', updatedOrder.id)
                
                console.log('✅ [WEBHOOK] Email timestamp updated in database')
              } catch (updateError) {
                console.error('❌ [WEBHOOK] Failed to update email timestamp:', updateError)
                // Don't fail webhook if timestamp update fails
              }
            } else {
              console.error('❌ [WEBHOOK] Email send failed:', emailResult.error)
            }
          } catch (emailError: any) {
            console.error('❌ [WEBHOOK] Exception sending confirmation email:', emailError)
            console.error('❌ [WEBHOOK] Error details:', emailError.message)
            // Don't fail the webhook if email fails
          }
        }
        
        break
      }

      // LEGACY EVENT: Checkout Session Completed (for old Hosted Checkout flow - kept for backwards compatibility)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Find order using TRIPLE FALLBACK method for 100% reliability
        // Use service role key for webhooks to bypass RLS policies
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )
        let orderId: string | null = null
        let order: any = null
        
        console.log('🔍 Webhook: Finding order for session:', session.id)
        
        // METHOD 1: Via metadata orderId (primary method)
        if (session.metadata?.orderId) {
          orderId = session.metadata.orderId
          console.log('🔍 Method 1: Trying metadata orderId:', orderId)
          
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('id', orderId)
            .single()
          
          if (!error && data) {
            order = data
            console.log('✅ Method 1: Order found via metadata')
          } else {
            console.log('⚠️ Method 1: Order not found via metadata:', error?.message)
          }
        }
        
        // METHOD 2: FALLBACK - Via stripe_payment_intent_id
        if (!order && session.payment_intent) {
          console.log('🔍 Method 2: Trying stripe_payment_intent_id:', session.payment_intent)
          
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('stripe_payment_intent_id', session.payment_intent as string)
            .single()
          
          if (!error && data) {
            order = data
            orderId = data.id
            console.log('✅ Method 2: Order found via payment_intent_id')
          } else {
            console.log('⚠️ Method 2: Order not found via payment_intent_id:', error?.message)
          }
        }
        
        // METHOD 3: LAST RESORT - Via customer_email + pending status (most recent)
        if (!order && session.customer_email) {
          console.log('🔍 Method 3: Trying customer_email + pending status:', session.customer_email)
          
          const { data, error } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('email', session.customer_email)
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (!error && data) {
            order = data
            orderId = data.id
            console.log('✅ Method 3: Order found via customer_email')
          } else {
            console.log('⚠️ Method 3: Order not found via email:', error?.message)
          }
        }
        
        // If still no order found, log error and return
        if (!orderId || !order) {
          console.error('❌ Webhook: Could not find order for session:', {
            session_id: session.id,
            payment_intent: session.payment_intent,
            customer_email: session.customer_email,
            metadata: session.metadata,
          })
          console.error('⚠️ Legacy checkout session without matching order')
          console.error('⚠️ Acknowledging webhook to prevent disabling')
          // IMPORTANT: Return 200 OK - this might be a test session or orphaned checkout
          return NextResponse.json({ 
            received: true,
            warning: 'Order not found for legacy checkout session',
            session_id: session.id 
          }, { status: 200 })
        }
        
        // Update order with payment success
        console.log('💳 Webhook: Updating order to PAID:', orderId)
        
        const { data: updatedOrder, error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: session.payment_method_types?.[0] || 'unknown',
            stripe_payment_intent_id: session.payment_intent as string,
            payment_metadata: {
              stripe_session_id: session.id,
              amount_total: session.amount_total,
              currency: session.currency,
              customer_email: session.customer_email,
            },
            status: 'processing', // Move to processing when paid
          })
          .eq('id', orderId)
          .select('*, order_items(*)')
          .single()

          if (error) {
            console.error('❌ Error updating order:', error)
          } else {
            console.log(`✅ Order ${orderId} marked as PAID (payment_status: paid, status: processing)`)
            
            // ============================================
            // DECREMENT STOCK AFTER PAYMENT SUCCESS
            // ============================================
            try {
              console.log('📦 Decrementing stock for order:', orderId)
              
              for (const item of updatedOrder.order_items) {
                const { data: variant, error: stockError } = await supabase
                  .from('product_variants')
                  .select('stock_quantity')
                  .eq('id', item.variant_id)
                  .gte('stock_quantity', item.quantity)
                  .single()
                
                if (!stockError && variant) {
                  await supabase
                    .from('product_variants')
                    .update({ 
                      stock_quantity: Math.max(0, variant.stock_quantity - item.quantity)
                    })
                    .eq('id', item.variant_id)
                  
                  console.log(`✅ Stock decremented for ${item.product_name}: ${variant.stock_quantity - item.quantity} remaining`)
                } else {
                  console.error(`⚠️ Could not decrement stock for ${item.product_name}:`, stockError)
                }
              }
              
              console.log('✅ Stock decrement completed for all items')
            } catch (stockError) {
              console.error('❌ Error during stock decrement:', stockError)
            }
            
            // Send order confirmation email
            if (updatedOrder && session.customer_email) {
              try {
                console.log('📧 [WEBHOOK LEGACY] Preparing to send order confirmation email...')
                const shippingAddress = updatedOrder.shipping_address as any
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mose-webshop.vercel.app'
                
                console.log(`📧 [WEBHOOK LEGACY] Sending to: ${session.customer_email}`)
                console.log(`📧 [WEBHOOK LEGACY] Order ID: ${updatedOrder.id}`)
                console.log(`📧 [WEBHOOK LEGACY] Order total: €${updatedOrder.total}`)
                console.log(`📧 [WEBHOOK LEGACY] Locale: ${updatedOrder.locale || 'nl'}`)
                
                const emailResult = await sendOrderConfirmationEmail({
                  customerName: shippingAddress?.name || session.metadata?.customerName || 'Klant',
                  customerEmail: session.customer_email,
                  orderId: updatedOrder.id,
                  orderTotal: updatedOrder.total,
                  orderItems: updatedOrder.order_items.map((item: any) => ({
                    name: item.product_name,
                    size: item.size,
                    color: item.color,
                    quantity: item.quantity,
                    price: item.price_at_purchase,
                    imageUrl: item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${siteUrl}${item.image_url}`) : '',
                    isPresale: item.is_presale || false,  // PRESALE: Pass presale status
                    presaleExpectedDate: item.presale_expected_date || undefined,  // PRESALE: Expected date
                  })),
                  shippingAddress: {
                    name: shippingAddress?.name || '',
                    address: shippingAddress?.address || '',
                    city: shippingAddress?.city || '',
                    postalCode: shippingAddress?.postalCode || '',
                  },
                  locale: updatedOrder.locale || 'nl', // Pass locale for multi-language emails
                })
                
                if (emailResult.success) {
                  console.log('✅ [WEBHOOK LEGACY] Order confirmation email sent successfully!')
                  console.log('✅ [WEBHOOK LEGACY] Email ID:', emailResult.data)
                  
                  // Update last_email_sent_at to prevent duplicate emails
                  try {
                    await supabase
                      .from('orders')
                      .update({ 
                        last_email_sent_at: new Date().toISOString(),
                        last_email_type: 'order_confirmation'
                      })
                      .eq('id', updatedOrder.id)
                    
                    console.log('✅ [WEBHOOK LEGACY] Email timestamp updated in database')
                  } catch (updateError) {
                    console.error('❌ [WEBHOOK LEGACY] Failed to update email timestamp:', updateError)
                    // Don't fail webhook if timestamp update fails
                  }
                } else {
                  console.error('❌ [WEBHOOK LEGACY] Email send failed:', emailResult.error)
                }
              } catch (emailError: any) {
                console.error('❌ [WEBHOOK LEGACY] Exception sending confirmation email:', emailError)
                console.error('❌ [WEBHOOK LEGACY] Error details:', emailError.message)
                // Don't fail the webhook if email fails
              }
            }
          }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        // Use service role key for webhooks to bypass RLS policies
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )
        const orderId = session.metadata?.orderId

        if (orderId) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'expired',
              payment_metadata: {
                expired_at: new Date().toISOString(),
                stripe_session_id: session.id,
              },
            })
            .eq('id', orderId)

          console.log(`⏰ Checkout session expired for order ${orderId}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        // Use service role key for webhooks to bypass RLS policies
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )

        // Find order by payment intent ID
        const { data: order } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .single()

        if (order) {
          await supabase
            .from('orders')
            .update({
              payment_status: 'failed',
              payment_metadata: {
                failure_code: paymentIntent.last_payment_error?.code,
                failure_message: paymentIntent.last_payment_error?.message,
                failed_at: new Date().toISOString(),
              },
            })
            .eq('id', order.id)

          console.error(`❌ Payment failed for order ${order.id}: ${paymentIntent.last_payment_error?.message}`)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        // Use service role key for webhooks to bypass RLS policies
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )

        // Check if this is a return refund
        const refundMetadata = charge.refunds?.data?.[0]?.metadata
        if (refundMetadata?.type === 'return_refund' && refundMetadata?.return_id) {
          const returnId = refundMetadata.return_id
          console.log('💰 Webhook: Return refund detected for return:', returnId)
          
          // Update return status
          const { data: returnRecord, error: returnError } = await supabase
            .from('returns')
            .update({
              status: 'refunded',
              refunded_at: new Date().toISOString(),
              stripe_refund_status: 'succeeded',
            })
            .eq('id', returnId)
            .select()
            .single()
          
          if (returnError) {
            console.error('❌ Error updating return refund status:', returnError)
          } else {
            console.log('✅ Return refund status updated:', returnId)
            
            // ============================================
            // INCREMENT STOCK AFTER REFUND (Return items back to inventory)
            // ============================================
            try {
              console.log('📦 Incrementing stock for returned items:', returnId)
              
              // Get return items
              const { data: returnItems, error: itemsError } = await supabase
                .from('return_items')
                .select('variant_id, quantity, product_name')
                .eq('return_id', returnId)
              
              if (!itemsError && returnItems) {
                for (const item of returnItems) {
                  const { data: currentVariant, error: fetchError } = await supabase
                    .from('product_variants')
                    .select('stock_quantity')
                    .eq('id', item.variant_id)
                    .single()
                  
                  if (!fetchError && currentVariant) {
                    const { data: variant, error: stockError } = await supabase
                      .from('product_variants')
                      .update({ 
                        stock_quantity: currentVariant.stock_quantity + item.quantity
                      })
                      .eq('id', item.variant_id)
                      .select('id, stock_quantity')
                      .single()
                    
                    if (stockError || !variant) {
                      console.error(`⚠️ Could not increment stock for ${item.product_name}:`, stockError)
                    } else {
                      console.log(`✅ Stock incremented for ${item.product_name}: ${variant.stock_quantity} in stock`)
                    }
                  }
                }
                
                console.log('✅ Stock increment completed for all returned items')
              }
            } catch (stockError) {
              console.error('❌ Error during stock increment:', stockError)
            }
          }
          
          // Also update order if needed (for backwards compatibility)
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_intent_id', charge.payment_intent as string)
            .single()

          if (order) {
            await supabase
              .from('orders')
              .update({
                payment_status: 'refunded',
                payment_metadata: {
                  refunded_at: new Date().toISOString(),
                  refund_amount: charge.amount_refunded,
                  refund_reason: charge.refunds?.data?.[0]?.reason,
                  return_id: returnId,
                },
              })
              .eq('id', order.id)

            console.log(`💰 Refund processed for order ${order.id} (return ${returnId}): €${(charge.amount_refunded / 100).toFixed(2)}`)
          }
        } else {
          // Regular order refund (not a return)
          const { data: order } = await supabase
            .from('orders')
            .select('id')
            .eq('stripe_payment_intent_id', charge.payment_intent as string)
            .single()

          if (order) {
            await supabase
              .from('orders')
              .update({
                payment_status: 'refunded',
                payment_metadata: {
                  refunded_at: new Date().toISOString(),
                  refund_amount: charge.amount_refunded,
                  refund_reason: charge.refunds?.data?.[0]?.reason,
                },
              })
              .eq('id', order.id)

            console.log(`💰 Refund processed for order ${order.id}: €${(charge.amount_refunded / 100).toFixed(2)}`)
          }
        }
        break
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ CRITICAL: Webhook handler unexpected error:', error)
    console.error('❌ Error name:', error.name)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    console.error('⚠️ Acknowledging webhook despite error to prevent Stripe from disabling it')
    // IMPORTANT: Return 200 OK even on catastrophic errors
    // This prevents Stripe from disabling the webhook after 5 consecutive failures
    // We log extensively so we can debug and fix the underlying issue
    return NextResponse.json(
      { 
        received: true,
        warning: 'Webhook handler encountered an error - check logs',
        error_name: error.name,
        error_message: error.message
      },
      { status: 200 }
    )
  }
}

