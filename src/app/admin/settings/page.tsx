'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearSettingsCache } from '@/lib/settings'

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
  const [freeShipping, setFreeShipping] = useState('50.00')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [currency, setCurrency] = useState('EUR')
  const [taxRate, setTaxRate] = useState('21.00')
  const [shippingCost, setShippingCost] = useState('0')
  const [lowStockThreshold, setLowStockThreshold] = useState('5')

  useEffect(() => {
    fetchSettings()
  }, [])

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
            case 'free_shipping_threshold':
              setFreeShipping(setting.value)
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

      const settingsToSave = [
        { key: 'site_name', value: siteName },
        { key: 'contact_email', value: contactEmail },
        { key: 'free_shipping_threshold', value: freeShipping },
        { key: 'maintenance_mode', value: maintenanceMode },
        { key: 'currency', value: currency },
        { key: 'tax_rate', value: taxRate },
        { key: 'shipping_cost', value: shippingCost },
        { key: 'low_stock_threshold', value: lowStockThreshold },
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
                Gratis Verzending Boven (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={freeShipping}
                onChange={(e) => setFreeShipping(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
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
                  Role
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
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  info@mosewear.nl
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 text-xs font-semibold bg-brand-primary text-white border-2 border-brand-primary">
                    ADMIN
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date().toLocaleDateString('nl-NL')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-gray-400 cursor-not-allowed">
                    Verwijderen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6">
          <button
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
          >
            + Nieuwe Admin Toevoegen
          </button>
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


