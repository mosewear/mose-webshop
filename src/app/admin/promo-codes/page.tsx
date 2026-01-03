'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ticket, Plus, Trash2, Edit, Check, X } from 'lucide-react'

interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_value: number
  usage_limit: number | null
  usage_count: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export default function PromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_value: '0',
    usage_limit: '',
    expires_at: '',
    is_active: true,
  })

  useEffect(() => {
    fetchPromoCodes()
  }, [])

  const fetchPromoCodes = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPromoCodes(data || [])
    } catch (error) {
      console.error('Error fetching promo codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const supabase = createClient()

      const dataToSave = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value) || 0,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
      }

      if (editingId) {
        const { error } = await supabase
          .from('promo_codes')
          .update(dataToSave)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('promo_codes').insert(dataToSave)
        if (error) throw error
      }

      resetForm()
      fetchPromoCodes()
    } catch (error: any) {
      console.error('Error saving promo code:', error)
      alert(error.message || 'Er is een fout opgetreden')
    }
  }

  const handleEdit = (promoCode: PromoCode) => {
    setEditingId(promoCode.id)
    setFormData({
      code: promoCode.code,
      description: promoCode.description || '',
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value.toString(),
      min_order_value: promoCode.min_order_value.toString(),
      usage_limit: promoCode.usage_limit?.toString() || '',
      expires_at: promoCode.expires_at ? promoCode.expires_at.split('T')[0] : '',
      is_active: promoCode.is_active,
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Weet je zeker dat je code "${code}" wilt verwijderen?`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('promo_codes').delete().eq('id', id)

      if (error) throw error
      fetchPromoCodes()
    } catch (error) {
      console.error('Error deleting promo code:', error)
      alert('Kon code niet verwijderen')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchPromoCodes()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '0',
      usage_limit: '',
      expires_at: '',
      is_active: true,
    })
    setEditingId(null)
    setShowCreateForm(false)
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isLimitReached = (code: PromoCode) => {
    if (code.usage_limit === null) return false
    return code.usage_count >= code.usage_limit
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold mb-2">Kortingscodes</h1>
          <p className="text-gray-600">Beheer promo codes en kortingsacties</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors"
        >
          + Nieuwe Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-brand-primary mb-2">{promoCodes.length}</div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totaal Codes</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {promoCodes.filter((c) => c.is_active && !isExpired(c.expires_at)).length}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Actieve Codes</div>
        </div>
        <div className="bg-white p-6 border-2 border-gray-200">
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {promoCodes.reduce((sum, code) => sum + code.usage_count, 0)}
          </div>
          <div className="text-sm text-gray-600 uppercase tracking-wide">Totaal Gebruikt</div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border-2 border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">
            {editingId ? 'Code Bewerken' : 'Nieuwe Code Aanmaken'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="ZOMER2024"
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 focus:border-brand-primary focus:outline-none uppercase tracking-wider font-mono"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Type Korting *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_type: e.target.value as 'percentage' | 'fixed',
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Vast bedrag (€)</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Korting {formData.discount_type === 'percentage' ? '(%)' : '(€)'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Min Order Value */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Min. Bestelwaarde (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Max Gebruik
                </label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Onbeperkt"
                  className="w-full px-4 py-2 border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
                />
              </div>

              {/* Expires At */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Verloopt Op
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Beschrijving
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Korte beschrijving van de actie..."
                rows={2}
                className="w-full px-4 py-2 border-2 border-gray-200 focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="is_active" className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                Code is actief
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-brand-primary hover:bg-brand-primary-hover text-white px-6 py-2 font-bold uppercase tracking-wider transition-colors"
              >
                {editingId ? 'Opslaan' : 'Aanmaken'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border-2 border-gray-200 px-6 py-2 font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promo Codes Table */}
      <div className="bg-white border-2 border-gray-200 overflow-hidden">
        {promoCodes.length === 0 ? (
          <div className="text-center py-12">
            <Ticket size={64} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">Nog geen kortingscodes</h3>
            <p className="text-gray-500 mb-6">Begin met het toevoegen van je eerste promo code!</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-6 uppercase tracking-wider transition-colors"
            >
              + Nieuwe Code
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Korting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Min. Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Gebruik
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Verloopt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promoCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-bold text-gray-900 font-mono">{code.code}</div>
                        {code.description && (
                          <div className="text-xs text-gray-500 mt-1">{code.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {code.discount_type === 'percentage'
                          ? `${code.discount_value}%`
                          : `€${code.discount_value.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.min_order_value > 0 ? (
                        <span className="text-sm text-gray-900">€{code.min_order_value.toFixed(2)}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <span className="font-bold">{code.usage_count}</span>
                        {code.usage_limit !== null && (
                          <span className="text-gray-500"> / {code.usage_limit}</span>
                        )}
                      </div>
                      {isLimitReached(code) && (
                        <div className="text-xs text-red-600 font-semibold mt-1">Limiet bereikt</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.expires_at ? (
                        <div className={isExpired(code.expires_at) ? 'text-red-600' : 'text-gray-900'}>
                          <div className="text-sm">
                            {new Date(code.expires_at).toLocaleDateString('nl-NL')}
                          </div>
                          {isExpired(code.expires_at) && (
                            <div className="text-xs font-semibold mt-1">Verlopen</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Geen expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(code.id, code.is_active)}
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold border ${
                          code.is_active && !isExpired(code.expires_at) && !isLimitReached(code)
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {code.is_active ? 'Actief' : 'Inactief'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(code)}
                          className="text-brand-primary hover:text-brand-primary-hover transition-colors p-2"
                          title="Bewerken"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id, code.code)}
                          className="text-red-600 hover:text-red-800 transition-colors p-2"
                          title="Verwijderen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


  useEffect(() => {
    fetchPromoCodes()
  }, [])

  const fetchPromoCodes = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPromoCodes(data || [])
    } catch (error) {
      console.error('Error fetching promo codes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const supabase = createClient()

      const dataToSave = {
        code: formData.code.toUpperCase(),
        description: formData.description || null,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        min_order_value: parseFloat(formData.min_order_value) || 0,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
      }

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('promo_codes')
          .update(dataToSave)
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase.from('promo_codes').insert(dataToSave)

        if (error) throw error
      }

      // Reset form
      resetForm()
      fetchPromoCodes()
    } catch (error: any) {
      console.error('Error saving promo code:', error)
      alert(error.message || 'Er is een fout opgetreden')
    }
  }

  const handleEdit = (promoCode: PromoCode) => {
    setEditingId(promoCode.id)
    setFormData({
      code: promoCode.code,
      description: promoCode.description || '',
      discount_type: promoCode.discount_type,
      discount_value: promoCode.discount_value.toString(),
      min_order_value: promoCode.min_order_value.toString(),
      usage_limit: promoCode.usage_limit?.toString() || '',
      expires_at: promoCode.expires_at ? promoCode.expires_at.split('T')[0] : '',
      is_active: promoCode.is_active,
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze code wilt verwijderen?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('promo_codes').delete().eq('id', id)

      if (error) throw error
      fetchPromoCodes()
    } catch (error) {
      console.error('Error deleting promo code:', error)
      alert('Kon code niet verwijderen')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchPromoCodes()
    } catch (error) {
      console.error('Error toggling status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_value: '0',
      usage_limit: '',
      expires_at: '',
      is_active: true,
    })
    setEditingId(null)
    setShowCreateForm(false)
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isLimitReached = (code: PromoCode) => {
    if (code.usage_limit === null) return false
    return code.usage_count >= code.usage_limit
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold uppercase tracking-wider flex items-center gap-3">
              <Ticket size={32} />
              Kortingscodes
            </h1>
            <p className="text-gray-600 mt-2">Beheer promo codes en kortingsacties</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-black text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Nieuwe Code
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white border-2 border-black p-6 mb-8">
          <h2 className="text-xl font-bold uppercase tracking-wider mb-6">
            {editingId ? 'Code Bewerken' : 'Nieuwe Code Aanmaken'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="ZOMER2024"
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none uppercase tracking-wider font-mono"
                />
              </div>

              {/* Discount Type */}
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                  Type Korting *
                </label>
                <select
                  value={formData.discount_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_type: e.target.value as 'percentage' | 'fixed',
                    })
                  }
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Vast bedrag (€)</option>
                </select>
              </div>

              {/* Discount Value */}
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                  Korting {formData.discount_type === 'percentage' ? '(%)' : '(€)'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percentage' ? '10' : '5.00'}
                  required
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>

              {/* Min Order Value */}
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                  Min. Bestelwaarde (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.min_order_value}
                  onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>

              {/* Usage Limit */}
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                  Max Gebruik (leeg = onbeperkt)
                </label>
                <input
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Onbeperkt"
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>

              {/* Expires At */}
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                  Verloopt Op (leeg = geen expiry)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                Beschrijving
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Korte beschrijving van de actie..."
                rows={2}
                className="w-full px-4 py-2 border-2 border-gray-300 focus:border-black focus:outline-none"
              />
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5"
              />
              <label htmlFor="is_active" className="font-bold uppercase tracking-wider text-sm">
                Code is actief
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-black text-white px-6 py-2 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Check size={18} />
                {editingId ? 'Opslaan' : 'Aanmaken'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border-2 border-black px-6 py-2 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <X size={18} />
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border-2 border-black p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-600">Totaal Codes</p>
              <p className="text-3xl font-bold mt-1">{promoCodes.length}</p>
            </div>
            <Ticket size={40} className="text-gray-300" />
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-600">Actieve Codes</p>
              <p className="text-3xl font-bold mt-1 text-green-600">
                {promoCodes.filter((c) => c.is_active && !isExpired(c.expires_at)).length}
              </p>
            </div>
            <Check size={40} className="text-green-300" />
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-gray-600">Totaal Gebruikt</p>
              <p className="text-3xl font-bold mt-1">
                {promoCodes.reduce((sum, code) => sum + code.usage_count, 0)}
              </p>
            </div>
            <TrendingUp size={40} className="text-gray-300" />
          </div>
        </div>
      </div>

      {/* Promo Codes List */}
      <div className="bg-white border-2 border-black">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Code</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Korting</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Min. Order</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Gebruik</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Verloopt</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Acties</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Ticket size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-bold">Nog geen kortingscodes</p>
                    <p className="text-sm mt-1">Maak je eerste promo code aan</p>
                  </td>
                </tr>
              ) : (
                promoCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-mono font-bold text-lg">{code.code}</div>
                        {code.description && (
                          <div className="text-xs text-gray-600 mt-1">{code.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold">
                        {code.discount_type === 'percentage'
                          ? `${code.discount_value}%`
                          : `€${code.discount_value.toFixed(2)}`}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {code.min_order_value > 0 ? (
                        <span className="text-sm">€{code.min_order_value.toFixed(2)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <span className="font-bold">{code.usage_count}</span>
                        {code.usage_limit !== null && (
                          <span className="text-gray-600"> / {code.usage_limit}</span>
                        )}
                        {isLimitReached(code) && (
                          <div className="text-xs text-red-600 font-bold mt-1">Limiet bereikt</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {code.expires_at ? (
                        <div className={isExpired(code.expires_at) ? 'text-red-600' : ''}>
                          <div className="text-sm">
                            {new Date(code.expires_at).toLocaleDateString('nl-NL')}
                          </div>
                          {isExpired(code.expires_at) && (
                            <div className="text-xs font-bold mt-1">Verlopen</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Geen expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(code.id, code.is_active)}
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                          code.is_active && !isExpired(code.expires_at) && !isLimitReached(code)
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {code.is_active ? 'Actief' : 'Inactief'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(code)}
                          className="p-2 hover:bg-gray-200 transition-colors"
                          title="Bewerken"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="p-2 hover:bg-red-100 text-red-600 transition-colors"
                          title="Verwijderen"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

