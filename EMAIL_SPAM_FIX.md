# Email Spam Probleem Oplossen

## ✅ Wat is aangepast

1. **Email adres gewijzigd:** `contact@mosewear.nl` → `contact@orders.mosewear.nl`
   - Gebruikt nu het geverifieerde domein `orders.mosewear.nl`

2. **Error handling verbeterd** in contact formulier
   - Betere error handling voor response parsing

## 🔧 Aanvullende Stappen om Spam te Voorkomen

### 1. DNS Records in Resend (Belangrijk!)

Ga naar Resend Dashboard → Domains → `orders.mosewear.nl` → DNS Settings

Zorg dat deze DNS records zijn toegevoegd aan je domein DNS:

- **SPF Record** (TXT record)
- **DKIM Records** (meerdere TXT records)
- **DMARC Record** (TXT record)

Resend geeft je de exacte records die je moet toevoegen.

### 2. Verifieer DNS Records

Gebruik een tool zoals https://mxtoolbox.com/ om te checken of je DNS records correct zijn:
- Check SPF: https://mxtoolbox.com/spf.aspx
- Check DKIM: https://mxtoolbox.com/dkim.aspx
- Check DMARC: https://mxtoolbox.com/dmarc.aspx

### 3. Warm-up je Email Domain (Voor nieuwe domains)

Als `orders.mosewear.nl` een nieuw domein is:
- Start met kleine volumes
- Verhoog geleidelijk het aantal emails
- Dit bouwt "reputation" op bij email providers

### 4. Email Best Practices

**Al geïmplementeerd in code:**
- ✅ Gebruikt geverifieerd domein
- ✅ Professionele email template
- ✅ Duidelijke subject lines
- ✅ Reply-To header

**Nog te overwegen:**
- Vermijd spam-achtige woorden in subject (bv. "GRATIS", "WIN", "KOOP NU")
- Gebruik een duidelijke "From" naam
- Voeg unsubscribe link toe (niet nodig voor contact form, wel voor marketing)

### 5. Test Email Deliverability

Gebruik tools om te testen:
- **Mail-tester.com**: https://www.mail-tester.com/
  - Verstuur een test email naar het adres dat ze geven
  - Krijg een score en tips
  
- **Resend Dashboard**: Check email logs voor delivery status

### 6. Vraag Ontvangers om Whitelisting

Voeg instructies toe aan je emails:
```
"Voeg info@mosewear.nl toe aan je contacten om te zorgen dat je 
onze emails niet mist!"
```

## 📊 Monitoring

Check regelmatig:
- **Resend Dashboard** → Logs: Delivery rates, bounces, spam complaints
- **Gmail/Outlook** spam folders van test emails
- **Bounce rates**: Hoge bounce rates kunnen je reputation schaden

## 🚨 Als Emails Nog Steeds in Spam Komen

1. **Check DNS records** nog een keer
2. **Wacht 24-48 uur** na DNS updates (propagatie tijd)
3. **Test met verschillende email providers** (Gmail, Outlook, etc.)
4. **Check Resend logs** voor specifieke errors
5. **Overweeg email authentication service** zoals SendGrid of Mailgun (maar Resend zou moeten werken)

## 💡 Quick Fix Checklist

- [x] Email adres gebruikt geverifieerd domein (`orders.mosewear.nl`)
- [ ] DNS records (SPF, DKIM, DMARC) zijn toegevoegd
- [ ] DNS records zijn geverifieerd met mxtoolbox
- [ ] Test email is verzonden en getest met mail-tester.com
- [ ] Resend dashboard toont geen errors

## 📝 Notes

- Het kan 24-48 uur duren voordat DNS changes volledig zijn gepropageerd
- Gmail heeft strengere spam filters dan andere providers
- Nieuwe domains hebben tijd nodig om "reputation" op te bouwen
- Resend heeft goede deliverability, maar DNS records zijn essentieel

