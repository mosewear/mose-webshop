import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import {
  AbandonedCartEmail,
  BackInStockEmail,
  ContactFormEmail,
  InsiderBehindScenesEmail,
  InsiderCommunityEmail,
  InsiderLaunchWeekEmail,
  InsiderWelcomeEmail,
  NewReviewNotificationEmail,
  NewsletterWelcomeEmail,
  OrderCancelledEmail,
  OrderConfirmationEmail,
  OrderDeliveredEmail,
  OrderProcessingEmail,
  PreorderConfirmationEmail,
  ReturnApprovedEmail,
  ReturnLabelGeneratedEmail,
  ReturnRefundedEmail,
  ReturnRejectedEmail,
  ReturnRequestedEmail,
  ShippingConfirmationEmail,
} from '@/emails'
import { EMAIL_TEMPLATES } from '@/lib/email-catalog'
import { getEmailT } from '@/lib/email-i18n'
import { createClient } from '@/lib/supabase/server'

/**
 * Mapping from preview slug to the React Email template + dummy payload.
 *
 * We accept both the newer `previewSlug` (from the catalog) and the legacy
 * type ids that the admin UI used to call, so old bookmarks keep working.
 */

const LEGACY_TYPE_ALIASES: Record<string, string> = {
  confirmation: 'order-confirmation',
  preorder: 'preorder-confirmation',
  processing: 'order-processing',
  shipped: 'shipping-confirmation',
  delivered: 'order-delivered',
  cancelled: 'order-cancelled',
  return_label: 'return-label',
  return_approved: 'return-approved',
  return_refunded: 'return-refunded',
  return_rejected: 'return-rejected',
  return_requested: 'return-requested',
  abandoned_cart: 'abandoned-cart',
  newsletter_welcome: 'newsletter-welcome',
  back_in_stock: 'back-in-stock',
  contact_form: 'contact-form',
  new_review: 'new-review',
  insider_welcome: 'insider-welcome',
  insider_community: 'insider-community',
  insider_behind_scenes: 'insider-behind-scenes',
  insider_launch_week: 'insider-launch-week',
}

async function getPreviewProductData() {
  try {
    const supabase = await createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'

    const { data: variants, error } = await supabase
      .from('product_variants')
      .select(
        `id, size, color, price, image_url, products!inner(id, name, slug)`
      )
      .eq('is_available', true)
      .not('image_url', 'is', null)
      .limit(2)

    if (error || !variants?.length) return null

    return variants.map((variant: any) => {
      const imageUrl = variant.image_url
        ? variant.image_url.startsWith('http')
          ? variant.image_url
          : `${siteUrl}${variant.image_url}`
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
  const rawType = searchParams.get('type') || 'order-confirmation'
  const locale = searchParams.get('locale') || 'nl'

  const slug = LEGACY_TYPE_ALIASES[rawType] || rawType

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mosewear.com'
  const contactEmail = 'info@mosewear.com'
  const contactPhone = '+31 50 211 1931'
  const contactAddress = 'Stavangerweg 13, 9723 JC Groningen'

  try {
    const realProducts = await getPreviewProductData()

    const defaultProducts = [
      {
        name: 'MOSE Essential Hoodie',
        size: 'L',
        color: 'Zwart',
        quantity: 1,
        price: 69.95,
        imageUrl: `${siteUrl}/logomose.png`,
        isPresale: false,
      },
      {
        name: 'MOSE Classic Cap',
        size: 'One Size',
        color: 'Navy',
        quantity: 1,
        price: 19.99,
        imageUrl: `${siteUrl}/logomose.png`,
        isPresale: false,
      },
    ]

    const orderItems = realProducts || defaultProducts

    const dummyData = {
      customerName: 'Jan de Vries',
      customerEmail: 'jan@example.com',
      orderId: 'abc123de-4567-89fg-hijk-lmnopqr12345',
      orderTotal: 89.95,
      subtotal: 84.95,
      shippingCost: 5.0,
      tax: 15.75,
      orderItems,
      shippingAddress: {
        name: 'Jan de Vries',
        address: 'Damstraat 42',
        city: 'Amsterdam',
        postalCode: '1012 JM',
      },
      promoCode: 'PRESALE30',
      discountAmount: 25.5,
      trackingCode: 'TEST-TRACKING-123456',
      trackingUrl:
        'https://www.dhlparcel.nl/en/private/track-trace?tt=TEST-TRACKING-123456',
      carrier: 'DHL',
      estimatedDeliveryDate: new Date(
        Date.now() + 2 * 24 * 60 * 60 * 1000
      ).toLocaleDateString('nl-NL'),
      presaleExpectedDate: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString('nl-NL'),
      cancellationReason: 'Product niet op voorraad',
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
      productName: 'MOSE Essential Hoodie',
      productSlug: 'essential-hoodie',
      productImageUrl: orderItems[0]?.imageUrl || `${siteUrl}/logomose.png`,
      variantInfo: { size: 'L', color: 'Zwart' },
      name: 'Jan de Vries',
      email: 'jan@example.com',
      subject: 'Vraag over bestelling',
      message:
        'Ik heb een vraag over mijn recente bestelling. Wanneer wordt deze verzonden?',
      checkoutUrl: 'https://mosewear.com/checkout?session=abc123',
      reviewerName: 'Sanne K.',
      reviewerEmail: 'sanne@example.com',
      rating: 5,
      reviewTitle: 'Zit als gegoten',
      reviewComment:
        'Echt top kwaliteit, pasvorm perfect en verzending razendsnel. Ik bestel volgend seizoen zeker weer.',
      reviewId: 'rev-12345678-90ab-cdef-ghij-klmnopqrs123',
      subscriberCount: 1247,
      daysUntilLaunch: 7,
      storyContent:
        'Het begon met een idee op het atelier in Groningen: streetwear die mee-groeit met wie het draagt. Dit seizoen zoomen we in op het verhaal achter onze nieuwste midweight hoodie — van stof tot stiksel.',
      limitedItems: ['Essential Hoodie — Stone', 'Crewneck — Midnight', 'Cap — Forest'],
      promoCodeValue: 'INSIDER10',
      promoExpiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    }

    const t = await getEmailT(locale)

    let html: string

    switch (slug) {
      case 'order-confirmation':
        html = await render(
          OrderConfirmationEmail({
            ...dummyData,
            hasPresaleItems: false,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
          })
        )
        break

      case 'preorder-confirmation':
        html = await render(
          PreorderConfirmationEmail({
            ...dummyData,
            presaleExpectedDate: dummyData.presaleExpectedDate,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
          })
        )
        break

      case 'shipping-confirmation':
        html = await render(
          ShippingConfirmationEmail({
            ...dummyData,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
          })
        )
        break

      case 'order-processing':
        html = await render(
          OrderProcessingEmail({
            orderNumber: dummyData.orderId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
          })
        )
        break

      case 'order-delivered':
        html = await render(
          OrderDeliveredEmail({
            orderNumber: dummyData.orderId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
          })
        )
        break

      case 'order-cancelled':
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
            locale,
          })
        )
        break

      case 'return-requested':
        html = await render(
          ReturnRequestedEmail({
            orderNumber: dummyData.orderId.slice(0, 8).toUpperCase(),
            returnNumber: dummyData.returnId.slice(0, 8).toUpperCase(),
            customerName: dummyData.customerName,
            items: dummyData.returnItems.map((item) => ({
              name: `${item.product_name} (${item.size} - ${item.color})`,
              quantity: item.quantity,
            })),
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
          })
        )
        break

      case 'return-label':
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
            locale,
          })
        )
        break

      case 'return-approved':
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
            locale,
          })
        )
        break

      case 'return-refunded':
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
            locale,
          })
        )
        break

      case 'return-rejected':
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
            locale,
          })
        )
        break

      case 'abandoned-cart':
        html = await render(
          AbandonedCartEmail({
            customerName: dummyData.customerName,
            items: dummyData.orderItems.map((item) => ({
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
            locale,
          })
        )
        break

      case 'newsletter-welcome':
        html = await render(
          NewsletterWelcomeEmail({
            email: dummyData.customerEmail,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
            promoCode: dummyData.promoCodeValue,
            promoExpiry: dummyData.promoExpiry,
          })
        )
        break

      case 'back-in-stock':
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
            locale,
          })
        )
        break

      case 'contact-form':
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
            locale,
          })
        )
        break

      case 'new-review':
        html = await render(
          NewReviewNotificationEmail({
            reviewerName: dummyData.reviewerName,
            reviewerEmail: dummyData.reviewerEmail,
            productName: dummyData.productName,
            productSlug: dummyData.productSlug,
            rating: dummyData.rating,
            title: dummyData.reviewTitle,
            comment: dummyData.reviewComment,
            reviewId: dummyData.reviewId,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
          })
        )
        break

      case 'insider-welcome':
        html = await render(
          InsiderWelcomeEmail({
            email: dummyData.customerEmail,
            t,
            siteUrl,
            contactEmail,
            contactPhone,
            contactAddress,
            locale,
            promoCode: dummyData.promoCodeValue,
            promoExpiry: dummyData.promoExpiry,
          })
        )
        break

      case 'insider-community':
        html = await render(
          InsiderCommunityEmail({
            email: dummyData.customerEmail,
            subscriberCount: dummyData.subscriberCount,
            daysUntilLaunch: dummyData.daysUntilLaunch,
            featuredProducts: orderItems.slice(0, 3).map((item: any) => ({
              name: item.name,
              slug: 'essential-hoodie',
              imageUrl: item.imageUrl,
              url: `${siteUrl}/${locale}/shop`,
            })),
            t,
            siteUrl,
            locale,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'insider-behind-scenes':
        html = await render(
          InsiderBehindScenesEmail({
            email: dummyData.customerEmail,
            storyContent: dummyData.storyContent,
            t,
            siteUrl,
            locale,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      case 'insider-launch-week':
        html = await render(
          InsiderLaunchWeekEmail({
            email: dummyData.customerEmail,
            daysUntilLaunch: dummyData.daysUntilLaunch,
            limitedItems: dummyData.limitedItems,
            t,
            siteUrl,
            locale,
            contactEmail,
            contactPhone,
            contactAddress,
          })
        )
        break

      default:
        return NextResponse.json(
          {
            error: 'Invalid email preview type',
            availableTypes: EMAIL_TEMPLATES.map((tpl) => tpl.previewSlug),
          },
          { status: 400 }
        )
    }

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Error generating email preview:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate email preview',
        details: (error as Error)?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}
