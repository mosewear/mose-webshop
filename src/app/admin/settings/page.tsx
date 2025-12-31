'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
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
                defaultValue="MOSE Wear"
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Contact Email
              </label>
              <input
                type="email"
                defaultValue="info@mosewear.nl"
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
                defaultValue="50.00"
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="maintenance_mode"
                defaultChecked={false}
                className="w-5 h-5"
              />
              <label htmlFor="maintenance_mode" className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Onderhoudsmodus
              </label>
            </div>

            <button
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
              <select className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors">
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
                defaultValue="21.00"
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
                defaultValue="4.95"
                className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                Low Stock Waarschuwing (aantal)
              </label>
              <input
                type="number"
                defaultValue="5"
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

