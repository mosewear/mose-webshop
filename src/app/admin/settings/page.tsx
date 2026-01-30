'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearSettingsCache } from '@/lib/settings'
import MediaPicker from '@/components/admin/MediaPicker'

interface SiteSetting {
  key: string
  value: any
  description: string | null
  updated_at: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  // Form state
  const [siteName, setSiteName] = useState('MOSE Wear')
  const [contactEmail, setContactEmail] = useState('info@mosewear.nl')
  const [contactPhone, setContactPhone] = useState('+31 50 211 1931')
  const [contactAddress, setContactAddress] = useState('Helper Brink 27a, 9722 EG Groningen')
  const [freeShipping, setFreeShipping] = useState('100.00')
  const [returnDays, setReturnDays] = useState('14')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [currency, setCurrency] = useState('EUR')
  const [taxRate, setTaxRate] = useState('21.00')
  const [shippingCost, setShippingCost] = useState('0')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')
  const [faviconUrl, setFaviconUrl] = useState('/favicon.ico')
  
  // Abandoned cart settings
  const [abandonedCartEnabled, setAbandonedCartEnabled] = useState(true)
  const [abandonedCartHours, setAbandonedCartHours] = useState('24')

  // Returns settings
  const [returnsAutoApprove, setReturnsAutoApprove] = useState(true)
  const [returnLabelCostExclBtw, setReturnLabelCostExclBtw] = useState('6.50')
  const [returnLabelCostInclBtw, setReturnLabelCostInclBtw] = useState('7.87')

  // Admin users state
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchAdminUsers()
  }, [])

  // Automatisch BTW herberekenen wanneer excl BTW of tax rate wijzigt
  useEffect(() => {
    if (returnLabelCostExclBtw && taxRate && !isNaN(parseFloat(returnLabelCostExclBtw)) && !isNaN(parseFloat(taxRate))) {
      const taxMultiplier = 1 + (parseFloat(taxRate) / 100)
      const calculatedIncl = (parseFloat(returnLabelCostExclBtw) * taxMultiplier).toFixed(2)
      // Alleen updaten als de waarde anders is om infinite loops te voorkomen
      if (Math.abs(parseFloat(calculatedIncl) - parseFloat(returnLabelCostInclBtw || '0')) > 0.01) {
        setReturnLabelCostInclBtw(calculatedIncl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnLabelCostExclBtw, taxRate])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .order('key')

      if (error) throw error
      setSettings(data || [])

      // Load settings into form state
      if (data) {
        data.forEach((setting: SiteSetting) => {
          switch (setting.key) {
            case 'site_name':
              setSiteName(setting.value)
              break
            case 'contact_email':
              setContactEmail(setting.value)
              break
            case 'contact_phone':
              setContactPhone(setting.value)
              break
            case 'contact_address':
              setContactAddress(setting.value)
              break
            case 'free_shipping_threshold':
              setFreeShipping(setting.value)
              break
            case 'return_days':
              setReturnDays(setting.value)
              break
            case 'maintenance_mode':
              setMaintenanceMode(setting.value === 'true' || setting.value === true)
              break
            case 'currency':
              setCurrency(setting.value)
              break
            case 'tax_rate':
              setTaxRate(setting.value)
              break
            case 'shipping_cost':
              setShippingCost(setting.value)
              break
            case 'low_stock_threshold':
              setLowStockThreshold(setting.value)
              break
            case 'abandoned_cart_email_enabled':
              setAbandonedCartEnabled(setting.value === 'true' || setting.value === true)
              break
            case 'abandoned_cart_hours':
              setAbandonedCartHours(setting.value)
              break
            case 'returns_auto_approve':
              setReturnsAutoApprove(setting.value === 'true' || setting.value === true)
              break
            case 'return_label_cost_excl_btw':
              setReturnLabelCostExclBtw(String(setting.value))
              break
            case 'return_label_cost_incl_btw':
              setReturnLabelCostInclBtw(String(setting.value))
              break
            case 'favicon_url':
              setFaviconUrl(setting.value)
              break
          }
        })
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSaving(true)
      setError('')

      // Als BTW percentage is gewijzigd, herbereken return label kosten incl BTW
      let finalReturnLabelCostInclBtw = returnLabelCostInclBtw
      if (parseFloat(returnLabelCostExclBtw) && parseFloat(taxRate)) {
        const taxMultiplier = 1 + (parseFloat(taxRate) / 100)
        finalReturnLabelCostInclBtw = (parseFloat(returnLabelCostExclBtw) * taxMultiplier).toFixed(2)
      }

      const settingsToSave = [
        { key: 'site_name', value: siteName },
        { key: 'contact_email', value: contactEmail },
        { key: 'contact_phone', value: contactPhone },
        { key: 'contact_address', value: contactAddress },
        { key: 'free_shipping_threshold', value: freeShipping },
        { key: 'return_days', value: returnDays },
        { key: 'maintenance_mode', value: maintenanceMode },
        { key: 'currency', value: currency },
        { key: 'tax_rate', value: taxRate },
        { key: 'shipping_cost', value: shippingCost },
        { key: 'low_stock_threshold', value: lowStockThreshold },
        { key: 'abandoned_cart_email_enabled', value: abandonedCartEnabled },
        { key: 'abandoned_cart_hours', value: abandonedCartHours },
        { key: 'returns_auto_approve', value: returnsAutoApprove },
        { key: 'return_label_cost_excl_btw', value: returnLabelCostExclBtw },
        { key: 'return_label_cost_incl_btw', value: finalReturnLabelCostInclBtw },
        { key: 'favicon_url', value: faviconUrl },
      ]

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(
            {
              key: setting.key,
              value: setting.value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
          )

        if (error) throw error
      }

      alert('✅ Instellingen opgeslagen!')
      clearSettingsCache() // Clear cache so new settings are loaded
      fetchSettings()
    } catch (err: any) {
      setError(err.message)
      alert(`Fout bij opslaan: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_admin', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdminUsers(data || [])
    } catch (err: any) {
      console.error('Error fetching admin users:', err)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminEmail.includes('@')) {
      alert('Vul een geldig e-mailadres in')
      return
    }

    try {
      setAddingAdmin(true)

      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', newAdminEmail)
        .single()

      if (profileError) {
        alert('Gebruiker niet gevonden. De gebruiker moet eerst inloggen op de website voordat je hem/haar admin kunt maken.')
        return
      }

      // Update to admin
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', profile.id)

      if (updateError) throw updateError

      alert('✅ Admin toegevoegd!')
      setShowAddAdmin(false)
      setNewAdminEmail('')
      fetchAdminUsers()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleRemoveAdmin = async (userId: string, email: string) => {
    // Prevent removing yourself
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id === userId) {
      alert('Je kunt jezelf niet als admin verwijderen')
      return
    }

    if (!confirm(`Weet je zeker dat je ${email} als admin wilt verwijderen?`)) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: false })
        .eq('id', userId)

      if (error) throw error

      alert('Admin verwijderd')
      fetchAdminUsers()
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Instellingen</h1>
        <p className="text-gray-600 text-sm md:text-base">Beheer website instellingen en admin gebruikers</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-6">Algemene Instellingen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Website Naam
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Contact Telefoon
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="+31 50 211 1931"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Contact Adres
              </label>
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                placeholder="Helper Brink 27a, 9722 EG Groningen"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Favicon
              </label>
              <MediaPicker
                mode="single"
                currentImageUrl={faviconUrl}
                onImageSelected={(url: string) => setFaviconUrl(url)}
                bucket="images"
                folder="favicon"
                accept="images"
                buttonText="Upload Favicon"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload een favicon (.ico, .png of .svg). Aanbevolen: 32x32px of 512x512px PNG. Huidige: <span className="font-mono">{faviconUrl}</span>
              </p>
              {faviconUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={faviconUrl} alt="Current favicon" className="w-8 h-8 border border-gray-300" />
                  <span className="text-xs text-gray-600">Preview</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Gratis Verzending Boven (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={freeShipping}
                onChange={(e) => setFreeShipping(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Gebruikt overal op de site (homepage, product pagina's, cart, checkout, emails, etc.)
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Retourbeleid (dagen)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={returnDays}
                onChange={(e) => setReturnDays(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                Aantal dagen bedenktijd. Gebruikt overal op de site (homepage, product pagina's, cart, verzending pagina, etc.)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="maintenance_mode"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="maintenance_mode" className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Onderhoudsmodus
              </label>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
            </button>
          </div>
        </div>

        {/* Store Settings */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-6">Winkel Instellingen</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Valuta
              </label>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                BTW Percentage (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Standaard Verzendkosten (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Low Stock Waarschuwing (aantal)
              </label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Returns Settings */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-6">Retour Instellingen</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="returns_auto_approve"
                checked={returnsAutoApprove}
                onChange={(e) => setReturnsAutoApprove(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="returns_auto_approve" className="text-sm font-bold text-gray-700 uppercase tracking-wide cursor-pointer">
                Automatisch Retouren Goedkeuren
              </label>
            </div>

            <div className="bg-blue-50 border-l-3 border-blue-400 p-4 text-sm text-blue-900">
              <p className="font-bold mb-1">ℹ️ Hoe werkt het?</p>
              <p className="mb-2">
                <strong>Ingeschakeld:</strong> Retouraanvragen worden direct goedgekeurd en de klant kan meteen 
                betalen voor het retourlabel (€7,87). Dit geeft de snelste flow.
              </p>
              <p>
                <strong>Uitgeschakeld:</strong> Retouraanvragen blijven in afwachting tot jij ze goedkeurt 
                in het admin panel. De klant krijgt pas de betaalstap na jouw goedkeuring.
              </p>
            </div>

            <div className="bg-green-50 border-l-3 border-green-400 p-4 text-sm text-green-900">
              <p className="font-bold mb-1">✅ Aanbevolen</p>
              <p>
                Voor de beste klantervaring raden we aan om auto-goedkeuring aan te laten staan. 
                Dit zorgt voor een naadloze flow zonder wachttijden.
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-bold mb-4">Retourlabel Kosten</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Kosten Retourlabel (excl. BTW)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={returnLabelCostExclBtw}
                    onChange={(e) => {
                      const exclValue = e.target.value
                      setReturnLabelCostExclBtw(exclValue)
                      // Automatisch BTW berekenen op basis van BTW percentage
                      if (exclValue && !isNaN(parseFloat(exclValue))) {
                        const taxMultiplier = 1 + (parseFloat(taxRate) / 100)
                        const inclValue = (parseFloat(exclValue) * taxMultiplier).toFixed(2)
                        setReturnLabelCostInclBtw(inclValue)
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                    placeholder="6.50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kosten voor retourlabel exclusief BTW. De prijs inclusief BTW wordt automatisch berekend op basis van het BTW percentage ({taxRate}%).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                    Kosten Retourlabel (incl. BTW)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={returnLabelCostInclBtw}
                    onChange={(e) => {
                      const inclValue = e.target.value
                      setReturnLabelCostInclBtw(inclValue)
                      // Automatisch BTW terugrekenen
                      if (inclValue && !isNaN(parseFloat(inclValue))) {
                        const taxMultiplier = 1 + (parseFloat(taxRate) / 100)
                        const exclValue = (parseFloat(inclValue) / taxMultiplier).toFixed(2)
                        setReturnLabelCostExclBtw(exclValue)
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors bg-gray-50"
                    placeholder="7.87"
                    readOnly={false}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kosten voor retourlabel inclusief BTW. Je kunt dit handmatig aanpassen, of automatisch laten berekenen via het veld hierboven.
                  </p>
                </div>

                <div className="bg-blue-50 border-l-3 border-blue-400 p-4 text-sm text-blue-900">
                  <p className="font-bold mb-1">ℹ️ Waar wordt dit gebruikt?</p>
                  <p className="mb-2">
                    Deze kosten worden gebruikt wanneer klanten een retour aanvragen en betalen voor hun retourlabel.
                  </p>
                  <p className="mb-2">
                    <strong>Huidige waarde:</strong> €{parseFloat(returnLabelCostExclBtw || '0').toFixed(2)} excl. BTW / €{parseFloat(returnLabelCostInclBtw || '0').toFixed(2)} incl. BTW
                  </p>
                  <p>
                    Deze instellingen worden alleen toegepast op <strong>nieuwe retouren</strong>. 
                    Bestaande retouren behouden hun oorspronkelijke kosten.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Abandoned Cart Email Settings */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            🛒 Abandoned Cart Emails
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="abandoned_cart_enabled"
                checked={abandonedCartEnabled}
                onChange={(e) => setAbandonedCartEnabled(e.target.checked)}
                className="w-5 h-5"
              />
              <label htmlFor="abandoned_cart_enabled" className="text-sm font-bold text-gray-700 uppercase tracking-wide cursor-pointer">
                Abandoned Cart Emails Inschakelen
              </label>
            </div>

            <div className="bg-blue-50 border-l-3 border-blue-400 p-4 text-sm text-blue-900">
              <p className="font-bold mb-1">ℹ️ Hoe werkt het?</p>
              <p>
                Wanneer een klant checkout start maar niet betaalt, wordt na het ingestelde aantal uren automatisch 
                een herinneringsmail gestuurd om de bestelling alsnog af te ronden. De email bevat de cart items, 
                social proof, USPs en urgency messaging.
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Aantal Uren Wachten (voor email)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={abandonedCartHours}
                onChange={(e) => setAbandonedCartHours(e.target.value)}
                disabled={!abandonedCartEnabled}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Standaard: 24 uur. Min: 1 uur, Max: 168 uur (7 dagen)
              </p>
            </div>

            <div className="bg-yellow-50 border-l-3 border-yellow-400 p-4 text-sm text-yellow-900">
              <p className="font-bold mb-1">⚠️ Let op!</p>
              <p>
                Deze emails worden automatisch verstuurd via een cron job. Zorg dat de cron job is ingesteld op Vercel 
                om de <code className="bg-yellow-100 px-1 font-mono">/api/abandoned-cart-cron</code> endpoint aan te roepen.
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-gray-600">
                  Emails worden verzonden vanaf <code className="font-mono font-bold">bestellingen@orders.mosewear.nl</code>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Users Section */}
      <div className="bg-white border-2 border-gray-200 p-6 mt-6">
        <h2 className="text-2xl font-bold mb-6">Admin Gebruikers</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y-2 divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Naam
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Aangemaakt
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adminUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Geen admin gebruikers gevonden
                  </td>
                </tr>
              ) : (
                adminUsers.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {admin.email || 'Geen email'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {admin.first_name && admin.last_name 
                        ? `${admin.first_name} ${admin.last_name}` 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveAdmin(admin.id, admin.email)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          {!showAddAdmin ? (
            <button
              onClick={() => setShowAddAdmin(true)}
              className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
            >
              + Nieuwe Admin Toevoegen
            </button>
          ) : (
            <div className="border-2 border-gray-200 p-4 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Email van bestaande gebruiker
                </label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                  placeholder="gebruiker@voorbeeld.nl"
                />
                <p className="text-xs text-gray-500 mt-2">
                  De gebruiker moet eerst inloggen op de website voordat je hem/haar admin kunt maken.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddAdmin}
                  disabled={addingAdmin}
                  className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                  {addingAdmin ? 'Toevoegen...' : 'Admin Toevoegen'}
                </button>
                <button
                  onClick={() => {
                    setShowAddAdmin(false)
                    setNewAdminEmail('')
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 uppercase tracking-wider transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white border-2 border-gray-200 p-6 mt-6">
        <h2 className="text-2xl font-bold mb-6">Systeem Informatie</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Platform</div>
            <div className="text-lg">Next.js 15 + Supabase</div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Hosting</div>
            <div className="text-lg">Vercel</div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Database</div>
            <div className="text-lg">PostgreSQL (Supabase)</div>
          </div>
          <div>
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Storage</div>
            <div className="text-lg">Supabase Storage</div>
          </div>
        </div>
      </div>
    </div>
  )
}


