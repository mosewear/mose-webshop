import EmailShell from './components/EmailShell'
import EmailHeader from './components/EmailHeader'
import EmailFooter from './components/EmailFooter'
import EmailHero from './components/EmailHero'
import EmailMetaGrid from './components/EmailMetaGrid'
import EmailModule from './components/EmailModule'
import EmailSectionTitle from './components/EmailSectionTitle'
import EmailCallout from './components/EmailCallout'
import EmailParagraph from './components/EmailParagraph'
import EmailCta from './components/EmailCta'
import { EMAIL_COLORS, EMAIL_DEFAULT_CONTACT, EMAIL_FONTS, EMAIL_SITE_URL } from './tokens'

interface ReturnRequestedEmailProps {
  orderNumber: string
  returnNumber: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
  }>
  t: (key: string, options?: any) => string
  locale?: string
  siteUrl?: string
  contactEmail?: string
  contactPhone?: string
  contactAddress?: string
}

export default function ReturnRequestedEmail({
  orderNumber,
  returnNumber,
  customerName,
  items,
  t,
  locale = 'nl',
  siteUrl = EMAIL_SITE_URL,
  contactEmail = EMAIL_DEFAULT_CONTACT.email,
  contactPhone = EMAIL_DEFAULT_CONTACT.phone,
  contactAddress = EMAIL_DEFAULT_CONTACT.address,
}: ReturnRequestedEmailProps) {
  const firstName = customerName.split(' ')[0] || customerName

  return (
    <EmailShell
      locale={locale}
      preview={
        t('returnRequested.preheader', { returnNumber }) ||
        `Je retour ${returnNumber} is ontvangen. We verwerken het binnen 2 werkdagen.`
      }
    >
      <EmailHeader
        siteUrl={siteUrl}
        status={t('returnRequested.status') || 'Return Requested'}
        statusColor={EMAIL_COLORS.warning}
      />

      <EmailHero
        badge={t('returnRequested.badge') || '↺ Retour Geregistreerd'}
        badgeColor={EMAIL_COLORS.warning}
        title={`${t('returnRequested.heroGreeting') || 'Return'},\n${firstName}.`}
        subtitle={
          t('returnRequested.heroSubtitle') ||
          'We hebben je retour-aanvraag ontvangen. Binnen 2 werkdagen hoor je of alles is goedgekeurd.'
        }
      />

      <EmailMetaGrid
        pairs={[
          { label: t('returnRequested.returnNumber') || 'Retour', value: `#${returnNumber}` },
          { label: t('returnRequested.orderNumber') || 'Order', value: `#${orderNumber}` },
        ]}
      />

      <EmailModule padding="28px 30px">
        <EmailSectionTitle
          title={t('returnRequested.itemsTitle') || 'Te retourneren items'}
          meta={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
        />
        <div style={{ marginTop: '18px' }}>
          {items.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '14px 0',
                borderBottom:
                  idx === items.length - 1
                    ? 'none'
                    : `1px solid ${EMAIL_COLORS.border}`,
              }}
            >
              <table
                role="presentation"
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        fontFamily: EMAIL_FONTS.display,
                        fontSize: '18px',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: EMAIL_COLORS.ink,
                      }}
                    >
                      {item.name}
                    </td>
                    <td
                      align="right"
                      style={{
                        fontFamily: EMAIL_FONTS.body,
                        fontSize: '13px',
                        color: EMAIL_COLORS.textMuted,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.quantity}×
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </EmailModule>

      <EmailModule padding="26px 30px" background={EMAIL_COLORS.sectionAlt}>
        <EmailParagraph>
          {t('returnRequested.description') ||
            'Zodra we je aanvraag hebben beoordeeld sturen we je het retourlabel. Verstuur je items in de originele staat met labels nog bevestigd.'}
        </EmailParagraph>
      </EmailModule>

      <EmailCallout tone="warning" title={t('returnRequested.processingTimeTitle') || 'Verwerkingstijd'}>
        {t('returnRequested.processingTime') ||
          'We beoordelen retour-aanvragen binnen 2 werkdagen. Je hoort zo snel mogelijk van ons.'}
      </EmailCallout>

      <EmailCta
        href={`${siteUrl}/${locale}/account/returns/${returnNumber}`}
        label={`${t('returnRequested.viewCta') || 'Bekijk mijn retour'}  →`}
        footnote={
          <>
            {t('returnRequested.questions') || 'Vragen?'}{' '}
            <a
              href={`mailto:${contactEmail}`}
              style={{ color: EMAIL_COLORS.primary, fontWeight: 700, textDecoration: 'none' }}
            >
              {contactEmail}
            </a>
          </>
        }
      />

      <EmailFooter
        siteUrl={siteUrl}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        contactAddress={contactAddress}
      />
    </EmailShell>
  )
}
