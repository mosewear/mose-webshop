import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import {
  OrderConfirmationEmail,
  PreorderConfirmationEmail,
  ShippingConfirmationEmail,
  OrderProcessingEmail,
  OrderDeliveredEmail,
  OrderCancelledEmail,
  ReturnRequestedEmail,
  ReturnLabelGeneratedEmail,
  ReturnApprovedEmail,
  ReturnRefundedEmail,
  ReturnRejectedEmail,
  AbandonedCartEmail,
  NewsletterWelcomeEmail,
  BackInStockEmail,
  ContactFormEmail,
} from '@/emails'
import { getEmailT } from '@/lib/email-i18n'
import { createClient } from '@/lib/supabase/server'

// Function to get real product data for preview
async function getPreviewProductData() {
  try {
    const supabase = await createClient()
    
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
    
    // Get 2 product variants with images - simpler query
    const { data: variants, error } = await supabase
      .from('product_variants')
      .select(`
        id,
        size,
        color,
        price,
        image_url,
        products!inner(
          id,
          name,
          slug
        )
      `)
      .eq('is_available', true)
      .not('image_url', 'is', null)
      .limit(2)
    
    if (error) {
      console.error('⚠️ Error fetching products for preview:', error)
      return null
    }
    
    if (!variants || variants.length === 0) {
      console.log('⚠️ No products found for preview, using fallback')
      return null
    }
    
    console.log(`✅ Found ${variants.length} products for preview`)
    
    return variants.map((variant: any) => {
      const imageUrl = variant.image_url 
        ? (variant.image_url.startsWith('http') ? variant.image_url : `${siteUrl}${variant.image_url}`)
        : `${siteUrl}/logomose.png`
      
      return {
        name: variant.products.name,
        size: variant.size || 'M',
        color: variant.color || 'Zwart',
        quantity: 1,
        price: variant.price || 69.95,
        imageUrl,
        isPresale: false,
      }
    })
  } catch (err) {
    console.error('Error fetching preview products:', err)
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'confirmation'
  const locale = searchParams.get('locale') || 'nl'
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = 'info@mosewear.com'
  const contactPhone = '+31 50 211 1931'
  const contactAddress = 'Stavangerweg 13, 9723 JC Groningen'
  
  try {
    // Try to get real product data
    const realProducts = await getPreviewProductData()
    
    // Fallback dummy products if real data fetch fails
    const defaultProducts = [
      {
        name: 'MOSE Essential Hoodie',
        size: 'L',
        color: 'Zwart',
        quantity: 1,
        price: 69.95,
        imageUrl: `${siteUrl}/logomose.png`, // Use MOSE logo as fallback
        isPresale: false,
      },
      {
        name: 'MOSE Classic Cap',
        size: 'One Size',
        color: 'Navy',
        quantity: 1,
        price: 19.99,
        imageUrl: `${siteUrl}/logomose.png`, // Use MOSE logo as fallback
        isPresale: false,
      },
    ]
    
    const orderItems = realProducts || defaultProducts
    
    // Dummy data voor preview
    const dummyData = {
      // Order data
      customerName: 'Jan de Vries',
      customerEmail: 'jan@example.com',
      orderId: 'abc123de-4567-89fg-hijk-lmnopqr12345',
      orderTotal: 89.95,
      subtotal: 84.95,
      shippingCost: 5.00,
      tax: 15.75,
      orderItems,
      shippingAddress: {
        name: 'Jan de Vries',
        address: 'Damstraat 42',
        city: 'Amsterdam',
        postalCode: '1012 JM',
      },
      
      // Shipping data
      trackingCode: 'TEST-TRACKING-123456',
      trackingUrl: 'https://www.dhlparcel.nl/en/private/track-trace?tt=TEST-TRACKING-123456',
      carrier: 'DHL',
      estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL'),
      
      // Presale data
      presaleExpectedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL'),
      
      // Cancellation data
      cancellationReason: 'Product niet op voorraad',
      
      // Return data
      returnId: 'ret-12345678-90ab-cdef-ghij-klmnopqrs123',
      returnItems: [
        {
          product_name: 'MOSE Essential Hoodie',
          size: 'L',
          color: 'Zwart',
          quantity: 1,
        },
      ],
      returnReason: 'Past niet goed',
      labelUrl: 'https://mosewear.com/downloads/return-label-example.pdf',
      refundAmount: 69.95,
      rejectionReason: 'Product is beschadigd geretourneerd',
      
      // Product data (for back in stock)
      productName: 'MOSE Essential Hoodie',
      productSlug: 'essential-hoodie',
      productImageUrl: orderItems[0]?.imageUrl || `${siteUrl}/logomose.png`,
      variantInfo: {
        size: 'L',
        color: 'Zwart',
      },
      
      // Contact form data
      name: 'Jan de Vries',
      email: 'jan@example.com',
      subject: 'Vraag over bestelling',
      message: 'Ik heb een vraag over mijn recente bestelling. Wanneer wordt deze verzonden?',
      
      // Checkout URL (for abandoned cart)
      checkoutUrl: 'https://mosewear.com/checkout?session=abc123',
    }
    
    const t = await getEmailT(locale)
    
    // DEBUG: Test if translation function works
    console.log('🔍 [email-preview] Testing translation function:')
    console.log('  - Locale:', locale)
    console.log('  - t("orderProcessing.title"):', t('orderProcessing.title'))
    console.log('  - t("common.mose"):', t('common.mose'))
    
    let html: string

    switch (type) {
      case 'confirmation':
        html = await render(
          OrderConfirmationEmail({
            ...dummyData,
            hasPresaleItems: false,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'preorder':
        html = await render(
          PreorderConfirmationEmail({
            ...dummyData,
            presaleExpectedDate: dummyData.presaleExpectedDate,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'shipped':
        html = await render(
          ShippingConfirmationEmail({
            ...dummyData,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'processing':
        html = await render(
          OrderProcessingEmail({
            orderNumber: dummyData.orderId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'delivered':
        html = await render(
          OrderDeliveredEmail({
            orderNumber: dummyData.orderId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'cancelled':
        html = await render(
          OrderCancelledEmail({
            orderNumber: dummyData.orderId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            reason: dummyData.cancellationReason,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'return_requested':
        html = await render(
          ReturnRequestedEmail({
            orderNumber: dummyData.orderId.slice(0, 8).toUpperCase(),
            returnNumber: dummyData.returnId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            items: dummyData.returnItems.map(item => ({
              name: `${item.product_name} (${item.size} - ${item.color})`,
              quantity: item.quantity,
            })),
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'return_label':
        html = await render(
          ReturnLabelGeneratedEmail({
            returnNumber: dummyData.returnId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            returnLabelUrl: dummyData.labelUrl,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'return_approved':
        html = await render(
          ReturnApprovedEmail({
            returnNumber: dummyData.returnId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            refundAmount: dummyData.refundAmount,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'return_refunded':
        html = await render(
          ReturnRefundedEmail({
            returnNumber: dummyData.returnId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            refundAmount: dummyData.refundAmount,
            refundMethod: 'Original Payment Method',
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'return_rejected':
        html = await render(
          ReturnRejectedEmail({
            returnNumber: dummyData.returnId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            reason: dummyData.rejectionReason,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'abandoned_cart':
        html = await render(
          AbandonedCartEmail({
            customerName: dummyData.customerName,
            items: dummyData.orderItems.map(item => ({
              name: item.name,
              price: item.price,
              imageUrl: item.imageUrl,
              quantity: item.quantity,
            })),
            totalAmount: dummyData.orderTotal,
            cartUrl: dummyData.checkoutUrl,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'newsletter_welcome':
        html = await render(
          NewsletterWelcomeEmail({
            email: dummyData.customerEmail,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'back_in_stock':
        html = await render(
          BackInStockEmail({
            email: dummyData.customerEmail,
            productName: dummyData.productName,
            productSlug: dummyData.productSlug,
            variantName: `${dummyData.variantInfo.size} - ${dummyData.variantInfo.color}`,
            productImage: dummyData.productImageUrl,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'contact_form':
        html = await render(
          ContactFormEmail({
            customerName: dummyData.name,
            customerEmail: dummyData.email,
            subject: dummyData.subject,
            message: dummyData.message,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      default:
        return NextResponse.json({ 
          error: 'Invalid email type',
          availableTypes: [
            'confirmation', 'preorder', 'shipped', 'processing', 'delivered', 'cancelled',
            'return_requested', 'return_label', 'return_approved', 'return_refunded', 'return_rejected',
            'abandoned_cart', 'newsletter_welcome', 'back_in_stock', 'contact_form'
          ]
        }, { status: 400 })
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating email preview:', error)
    return NextResponse.json({ 
      error: 'Failed to generate email preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
