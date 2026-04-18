/**
 * Quick sanity check: render every modular email template for both NL and
 * EN and assert that the resulting HTML contains no leaked translation
 * keys (e.g. `shipping.badge`, `orderConfirmation.heroGreeting`, …).
 *
 * Run with: npx tsx scripts/render-check.ts
 */

import { render } from '@react-email/render'
import React from 'react'
import { getEmailT } from '@/lib/email-i18n'
import ShippingConfirmationEmail from '@/emails/ShippingConfirmation'
import OrderConfirmationEmail from '@/emails/OrderConfirmation'
import OrderProcessingEmail from '@/emails/OrderProcessing'
import OrderDeliveredEmail from '@/emails/OrderDelivered'
import OrderCancelledEmail from '@/emails/OrderCancelled'
import PreorderConfirmationEmail from '@/emails/PreorderConfirmation'
import ReturnRequestedEmail from '@/emails/ReturnRequested'
import ReturnLabelGeneratedEmail from '@/emails/ReturnLabelGenerated'
import ReturnApprovedEmail from '@/emails/ReturnApproved'
import ReturnRefundedEmail from '@/emails/ReturnRefunded'
import ReturnRejectedEmail from '@/emails/ReturnRejected'
import AbandonedCartEmail from '@/emails/AbandonedCart'
import BackInStockEmail from '@/emails/BackInStock'
import NewsletterWelcomeEmail from '@/emails/NewsletterWelcome'
import InsiderWelcomeEmail from '@/emails/InsiderWelcome'
import InsiderCommunityEmail from '@/emails/InsiderCommunity'
import InsiderBehindScenesEmail from '@/emails/InsiderBehindScenes'
import InsiderLaunchWeekEmail from '@/emails/InsiderLaunchWeek'
import ContactFormEmail from '@/emails/ContactForm'
import NewReviewNotificationEmail from '@/emails/NewReviewNotification'
import LoyaltyStatusUpdateEmail from '@/emails/LoyaltyStatusUpdate'
import ReturnCreatedByAdminEmail from '@/emails/ReturnCreatedByAdmin'

async function main() {
  const locales: Array<'nl' | 'en'> = ['nl', 'en']

  const cartItem = {
    id: 'i1',
    productId: 'p1',
    name: 'MOSE Hoodie',
    size: 'M',
    color: 'Zwart',
    quantity: 1,
    price: 89,
    image: 'https://x/img.png',
  }

  const orderItems = [
    { name: 'MOSE Hoodie', size: 'M', color: 'Zwart', quantity: 1, price: 89 },
  ]

  const returnItems = [
    { name: 'Hoodie', quantity: 1 },
  ]

  const fixtures: Array<{ name: string; build: (t: any, locale: string) => any }> = [
    {
      name: 'ShippingConfirmation',
      build: (t, locale) =>
        React.createElement(ShippingConfirmationEmail, {
          customerName: 'Pieter Jansen',
          orderId: '02760B0AXYZ',
          trackingCode: 'JVGL0631640000139275',
          trackingUrl: 'https://example.com/track',
          carrier: 'PostNL',
          estimatedDelivery: '2026-04-20',
          t,
          locale,
        }),
    },
    {
      name: 'OrderConfirmation',
      build: (t, locale) =>
        React.createElement(OrderConfirmationEmail, {
          customerName: 'Pieter Jansen',
          orderId: '02760B0AXYZ',
          orderTotal: 89,
          subtotal: 89,
          shippingCost: 0,
          orderItems,
          shippingAddress: { name: 'Pieter Jansen', address: 'Keizersgracht 1', city: 'Amsterdam', postalCode: '1015 AB' },
          t,
          locale,
        }),
    },
    {
      name: 'OrderProcessing',
      build: (t, locale) =>
        React.createElement(OrderProcessingEmail, {
          customerName: 'Pieter',
          orderNumber: '02760B0A',
          t,
          locale,
        }),
    },
    {
      name: 'OrderDelivered',
      build: (t, locale) =>
        React.createElement(OrderDeliveredEmail, {
          customerName: 'Pieter',
          orderNumber: '02760B0A',
          t,
          locale,
        }),
    },
    {
      name: 'OrderCancelled',
      build: (t, locale) =>
        React.createElement(OrderCancelledEmail, {
          customerName: 'Pieter',
          orderNumber: '02760B0A',
          reason: 'Out of stock',
          t,
          locale,
        }),
    },
    {
      name: 'Preorder',
      build: (t, locale) =>
        React.createElement(PreorderConfirmationEmail, {
          customerName: 'Pieter',
          orderId: '02760B0A',
          orderTotal: 89,
          subtotal: 89,
          shippingCost: 0,
          orderItems,
          shippingAddress: { name: 'Pieter', address: 'x', city: 'A', postalCode: '1000 AA' },
          presaleExpectedDate: '2026-05-01',
          t,
          locale,
        }),
    },
    {
      name: 'ReturnRequested',
      build: (t, locale) =>
        React.createElement(ReturnRequestedEmail, {
          customerName: 'Pieter',
          orderNumber: '02760B0A',
          returnNumber: 'RTN-123',
          items: returnItems,
          t,
          locale,
        }),
    },
    {
      name: 'ReturnLabelGenerated',
      build: (t, locale) =>
        React.createElement(ReturnLabelGeneratedEmail, {
          customerName: 'Pieter',
          returnNumber: 'RTN-123',
          labelUrl: 'https://example.com/label.pdf',
          trackingCode: 'TRK-999',
          t,
          locale,
        } as any),
    },
    {
      name: 'ReturnApproved',
      build: (t, locale) =>
        React.createElement(ReturnApprovedEmail, {
          customerName: 'Pieter',
          returnNumber: 'RTN-123',
          refundAmount: 89,
          t,
          locale,
        }),
    },
    {
      name: 'ReturnRefunded',
      build: (t, locale) =>
        React.createElement(ReturnRefundedEmail, {
          customerName: 'Pieter',
          returnNumber: 'RTN-123',
          refundAmount: 89,
          refundMethod: 'iDEAL',
          t,
          locale,
        }),
    },
    {
      name: 'ReturnRejected',
      build: (t, locale) =>
        React.createElement(ReturnRejectedEmail, {
          customerName: 'Pieter',
          returnNumber: 'RTN-123',
          reason: 'Worn item',
          t,
          locale,
        } as any),
    },
    {
      name: 'AbandonedCart',
      build: (t, locale) =>
        React.createElement(AbandonedCartEmail, {
          customerName: 'Pieter',
          items: [cartItem as any],
          totalAmount: 89,
          cartUrl: 'https://example.com/cart',
          t,
          locale,
        }),
    },
    {
      name: 'BackInStock',
      build: (t, locale) =>
        React.createElement(BackInStockEmail, {
          email: 'p@example.com',
          productName: 'Hoodie',
          productSlug: 'hoodie',
          variantName: 'M / Zwart',
          productImage: 'https://x/img.png',
          t,
          locale,
        } as any),
    },
    {
      name: 'NewsletterWelcome',
      build: (t, locale) =>
        React.createElement(NewsletterWelcomeEmail, {
          email: 'p@example.com',
          promoCode: 'WELCOME10',
          t,
          locale,
        }),
    },
    {
      name: 'InsiderWelcome',
      build: (t, locale) =>
        React.createElement(InsiderWelcomeEmail, {
          email: 'p@example.com',
          promoCode: 'INSIDER10',
          t,
          locale,
        }),
    },
    {
      name: 'InsiderCommunity',
      build: (t, locale) =>
        React.createElement(InsiderCommunityEmail, {
          email: 'p@example.com',
          subscriberCount: 500,
          daysUntilLaunch: 14,
          t,
          locale,
        }),
    },
    {
      name: 'InsiderBehindScenes',
      build: (t, locale) =>
        React.createElement(InsiderBehindScenesEmail, {
          email: 'p@example.com',
          storyContent: 'Onze atelier in Groningen draait op volle toeren.',
          t,
          locale,
        }),
    },
    {
      name: 'InsiderLaunchWeek',
      build: (t, locale) =>
        React.createElement(InsiderLaunchWeekEmail, {
          email: 'p@example.com',
          daysUntilLaunch: 7,
          limitedItems: ['MOSE Hoodie Black', 'MOSE Tee White'],
          t,
          locale,
        }),
    },
    {
      name: 'ContactForm',
      build: (t, locale) =>
        React.createElement(ContactFormEmail, {
          customerName: 'Pieter',
          customerEmail: 'p@example.com',
          subject: 'Retour',
          message: 'Hoi',
          t,
          locale,
        }),
    },
    {
      name: 'NewReview',
      build: (t, locale) =>
        React.createElement(NewReviewNotificationEmail, {
          reviewerName: 'Lisa',
          reviewerEmail: 'l@example.com',
          productName: 'Hoodie',
          productSlug: 'hoodie',
          rating: 5,
          title: 'Top',
          comment: 'Goed',
          reviewId: 'rev-1',
          t,
          locale,
        } as any),
    },
    {
      name: 'LoyaltyStatusUpdate',
      build: (_t, locale) =>
        React.createElement(LoyaltyStatusUpdateEmail, {
          customerName: 'Pieter Jansen',
          tier: 'bronze',
          pointsBalance: 400,
          lifetimePoints: 400,
          previousTier: null,
          variant: 'broadcast',
          locale,
        }),
    },
    {
      name: 'ReturnCreatedByAdmin',
      build: (t, locale) =>
        React.createElement(ReturnCreatedByAdminEmail, {
          returnNumber: 'A1B2C3D4',
          orderNumber: '9919CFEA',
          customerName: 'Rick',
          labelMode: 'customer_free',
          inStoreState: undefined,
          returnItems: [
            { product_name: 'MOSE Tee', size: 'M', color: 'Beige', quantity: 1 },
          ],
          refundAmount: 65,
          labelCost: 7.87,
          t,
          locale,
        }),
    },
  ]

  const rawKeyRe = /\b[a-z][a-zA-Z]*\.[a-z][A-Za-z0-9_]+/g
  const ignoredNs = new Set([
    'fonts', 'www', 'mosewear', 'admin', 'supabase', 'image',
    'https', 'http', 'en', 'nl', 'assets', 'maps', 'ui', 'max',
    'min', 'cdn', 'api', 'w3', 'schema', 'reply',
  ])
  let anyFail = false
  for (const locale of locales) {
    const t = await getEmailT(locale)
    for (const f of fixtures) {
      let html = ''
      try {
        html = await render(f.build(t, locale))
      } catch (e: any) {
        console.log(`[${locale}] ${f.name}: RENDER ERROR -> ${e?.message}`)
        anyFail = true
        continue
      }
      const text = html.replace(/<[^>]+>/g, ' ')
      const matches = text.match(rawKeyRe) || []
      const raw = matches.filter(m => {
        if (/@|\.com|\.nl|\.co|\.io|\.org|\.be|\.de|\.pdf|\.png|\.jpg|\.svg|\.css|\.html/.test(m)) return false
        if (/^mailto/.test(m)) return false
        const [ns, key] = m.split('.')
        if (ignoredNs.has(ns)) return false
        return /^[a-z][A-Za-z0-9]+$/.test(key)
      })
      if (raw.length) {
        console.log(`[${locale}] ${f.name}: LEAKED KEYS -> ${[...new Set(raw)].slice(0, 10).join(', ')}`)
        anyFail = true
      } else {
        console.log(`[${locale}] ${f.name}: OK`)
      }
    }
  }
  if (anyFail) {
    console.log('\nSome templates still leak translation keys.')
    process.exit(1)
  } else {
    console.log('\nAll templates render cleanly in both NL and EN.')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
