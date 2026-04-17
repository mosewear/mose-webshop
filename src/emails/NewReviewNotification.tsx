import { Link } from '@react-email/components'
import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailCta from './components/EmailCta'
import EmailCallout from './components/EmailCallout'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface NewReviewNotificationEmailProps {
  reviewerName: string
  reviewerEmail: string
  productName: string
  productSlug: string
  rating: number
  title?: string
  comment?: string
  reviewId: string
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

function renderStars(rating: number) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped)
}

export default function NewReviewNotificationEmail({
  reviewerName,
  reviewerEmail,
  productName,
  rating,
  title,
  comment,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: NewReviewNotificationEmailProps) {
  const adminUrl = `${siteUrl}/admin/reviews`

  const infoRows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t('newReview.product') || 'Product', value: productName },
    { label: t('newReview.reviewer') || 'Reviewer', value: reviewerName },
    {
      label: t('newReview.email') || 'E-mail',
      value: (
        <Link
          href={`mailto:${reviewerEmail}`}
          style={{ color: EMAIL_COLORS.primary, textDecoration: 'none', fontWeight: 700 }}
        >
          {reviewerEmail}
        </Link>
      ),
    },
    {
      label: t('newReview.rating') || 'Rating',
      value: (
        <span style={{ color: EMAIL_COLORS.warning, fontWeight: 800 }}>
          {renderStars(rating)} <span style={{ color: EMAIL_COLORS.text }}>({rating}/5)</span>
        </span>
      ),
    },
  ]

  return (
    <EmailShell
      locale={locale}
      preview={
        t('newReview.preheader', { name: reviewerName, rating }) ||
        `Nieuwe review (${rating}/5) van ${reviewerName} — klaar voor moderatie.`
      }
    >
      <EmailHeader siteUrl={siteUrl} status={t('newReview.status') || 'Review'} />

      <EmailHero
        badge={t('newReview.badge') || '▲ New Review'}
        title={t('newReview.heroTitle') || 'New\nReview.'}
        subtitle={
          t('newReview.subtitle') ||
          'Er wacht een nieuwe review op moderatie. Bekijk en keur goed in het dashboard.'
        }
      />

      <EmailModule padding="24px 30px">
        <EmailSectionTitle title={t('newReview.detailsTitle') || 'Review details'} />
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ marginTop: '18px' }}
        >
          <tbody>
            {infoRows.map((row, idx) => (
              <tr key={idx}>
                <td
                  width="130"
                  valign="top"
                  style={{
                    width: '130px',
                    padding: '6px 0',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '11px',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: EMAIL_COLORS.textFaint,
                    fontWeight: 800,
                  }}
                >
                  {row.label}
                </td>
                <td
                  valign="top"
                  style={{
                    padding: '6px 0',
                    fontFamily: EMAIL_FONTS.body,
                    fontSize: '14px',
                    color: EMAIL_COLORS.text,
                    fontWeight: 600,
                  }}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </EmailModule>

      {title || comment ? (
        <EmailModule padding="24px 30px" background={EMAIL_COLORS.sectionAlt}>
          {title ? (
            <>
              <EmailSectionTitle title={t('newReview.reviewTitle') || 'Titel'} />
              <div
                style={{
                  marginTop: '10px',
                  marginBottom: '18px',
                  fontFamily: EMAIL_FONTS.display,
                  fontSize: '20px',
                  letterSpacing: '0.04em',
                  color: EMAIL_COLORS.ink,
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </div>
            </>
          ) : null}
          {comment ? (
            <>
              <EmailSectionTitle title={t('newReview.reviewComment') || 'Bericht'} />
              <div
                style={{
                  marginTop: '12px',
                  fontFamily: EMAIL_FONTS.body,
                  fontSize: '15px',
                  lineHeight: 1.7,
                  color: EMAIL_COLORS.text,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {comment}
              </div>
            </>
          ) : null}
        </EmailModule>
      ) : null}

      <EmailCta
        href={adminUrl}
        label={`${t('newReview.approveButton') || 'Beoordeel review'}  →`}
        variant="primary"
      />

      <EmailCallout tone="info">
        {t('newReview.info') ||
          'Reviews zijn pas zichtbaar op de productpagina nadat jij ze hebt goedgekeurd.'}
      </EmailCallout>

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
