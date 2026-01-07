'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Order {
  id: string
  created_at: string
  total: number
  status: string
  payment_status: string
  order_items: {
    product_name: string
    size: string
    color: string
    quantity: number
    price_at_purchase: number
    subtotal: number
    image_url: string | null
  }[]
}

interface Profile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

interface Address {
  id: string
  name: string
  address: string
  city: string
  postal_code: string
  phone: string | null
  country: string
  is_default_shipping: boolean
  is_default_billing: boolean
  created_at: string
  updated_at: string
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [returnsLoading, setReturnsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'profile' | 'addresses' | 'returns'>('orders')

  // Profile state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [addressError, setAddressError] = useState('')

  // Addresses state
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)
  const [addressForm, setAddressForm] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    country: 'NL',
    is_default_shipping: false,
    is_default_billing: false,
  })

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (activeTab === 'profile' && user) {
      fetchProfile()
    }
    if (activeTab === 'addresses' && user) {
      fetchAddresses()
    }
    if (activeTab === 'returns' && user) {
      fetchReturns()
    }
  }, [activeTab, user])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUser(user)
    await fetchOrders(user.email!)
    setLoading(false)
  }

  async function fetchOrders(email: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('email', email)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOrders(data)
    }
  }

  async function fetchReturns() {
    if (!user) return
    
    setReturnsLoading(true)
    try {
      const response = await fetch('/api/returns')
      const data = await response.json()
      if (data.returns) {
        setReturns(data.returns)
      }
    } catch (error) {
      console.error('Error fetching returns:', error)
    } finally {
      setReturnsLoading(false)
    }
  }

  async function fetchProfile() {
    if (!user) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return
    }

    if (data) {
      setProfile(data)
      setProfileForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: user.email || '',
      })
    } else {
      // Create profile if it doesn't exist
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
        })
        .select()
        .single()

      if (newProfile) {
        setProfile(newProfile)
        setProfileForm({
          first_name: '',
          last_name: '',
          email: user.email || '',
        })
      }
    }
  }

  async function updateProfile() {
    if (!user) return

    setProfileLoading(true)
    const supabase = createClient()

    try {
      // Update profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name || null,
          last_name: profileForm.last_name || null,
          email: profileForm.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Update email in auth if changed
      if (profileForm.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileForm.email,
        })
        if (emailError) throw emailError
      }

      toast.success('Profiel bijgewerkt!')
      await fetchProfile()
    } catch (error: any) {
      toast.error(error.message || 'Kon profiel niet bijwerken')
    } finally {
      setProfileLoading(false)
    }
  }

  async function updatePassword() {
    if (!user) return

    setPasswordError('')

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Wachtwoord moet minimaal 6 karakters lang zijn')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Wachtwoorden komen niet overeen')
      return
    }

    setPasswordLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      toast.success('Wachtwoord bijgewerkt!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordError('')
    } catch (error: any) {
      setPasswordError(error.message || 'Kon wachtwoord niet bijwerken')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function fetchAddresses() {
    if (!user) return

    setAddressesLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, just set empty array (table will be created later)
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('user_addresses table does not exist yet')
          setAddresses([])
          return
        }
        throw error
      }
      setAddresses(data || [])
    } catch (error: any) {
      console.error('Error fetching addresses:', error)
      // Don't show toast error for missing table - just set empty array
      if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
        toast.error('Kon adressen niet laden')
      }
      setAddresses([])
    } finally {
      setAddressesLoading(false)
    }
  }

  async function saveAddress() {
    if (!user) return

    setAddressError('')

    if (!addressForm.name || !addressForm.address || !addressForm.city || !addressForm.postal_code) {
      setAddressError('Vul alle verplichte velden in')
      return
    }

    const supabase = createClient()

    try {
      // If setting as default, unset other defaults
      if (addressForm.is_default_shipping) {
        await supabase
          .from('user_addresses')
          .update({ is_default_shipping: false })
          .eq('user_id', user.id)
          .neq('id', editingAddress?.id || '00000000-0000-0000-0000-000000000000')
      }

      if (addressForm.is_default_billing) {
        await supabase
          .from('user_addresses')
          .update({ is_default_billing: false })
          .eq('user_id', user.id)
          .neq('id', editingAddress?.id || '00000000-0000-0000-0000-000000000000')
      }

      if (editingAddress) {
        // Update existing address
        const { error } = await supabase
          .from('user_addresses')
          .update({
            ...addressForm,
            phone: addressForm.phone || null,
          })
          .eq('id', editingAddress.id)

        if (error) throw error
        toast.success('Adres bijgewerkt!')
      } else {
        // Create new address
        const { error } = await supabase
          .from('user_addresses')
          .insert({
            user_id: user.id,
            ...addressForm,
            phone: addressForm.phone || null,
          })

        if (error) throw error
        toast.success('Adres toegevoegd!')
      }

      setShowAddressForm(false)
      setEditingAddress(null)
      setAddressForm({
        name: '',
        address: '',
        city: '',
        postal_code: '',
        phone: '',
        country: 'NL',
        is_default_shipping: false,
        is_default_billing: false,
      })
      setAddressError('')
      await fetchAddresses()
    } catch (error: any) {
      setAddressError(error.message || 'Kon adres niet opslaan')
    }
  }

  async function deleteAddress(id: string) {
    if (!confirm('Weet je zeker dat je dit adres wilt verwijderen?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          toast.error('Adres tabel bestaat nog niet.')
          return
        }
        throw error
      }
      toast.success('Adres verwijderd!')
      await fetchAddresses()
    } catch (error: any) {
      toast.error('Kon adres niet verwijderen')
    }
  }

  function startEditAddress(address: Address) {
    setEditingAddress(address)
    setAddressForm({
      name: address.name,
      address: address.address,
      city: address.city,
      postal_code: address.postal_code,
      phone: address.phone || '',
      country: address.country,
      is_default_shipping: address.is_default_shipping,
      is_default_billing: address.is_default_billing,
    })
    setShowAddressForm(true)
  }

  function cancelAddressForm() {
    setShowAddressForm(false)
    setEditingAddress(null)
    setAddressForm({
      name: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      country: 'NL',
      is_default_shipping: false,
      is_default_billing: false,
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'processing':
        return 'bg-yellow-400 text-black'
      case 'shipped':
        return 'bg-brand-primary text-white'
      case 'delivered':
        return 'bg-gray-800 text-white'
      case 'cancelled':
        return 'bg-red-600 text-white'
      default:
        return 'bg-gray-400 text-white'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'In behandeling'
      case 'processing':
        return 'Wordt verwerkt'
      case 'shipped':
        return 'Verzonden'
      case 'delivered':
        return 'Afgeleverd'
      case 'cancelled':
        return 'Geannuleerd'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-6 md:pt-8 px-4 pb-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-display mb-2">MIJN ACCOUNT</h1>
            <p className="text-gray-600">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold uppercase text-sm self-start md:self-auto"
          >
            Uitloggen
          </button>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden mb-6 overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 border-b-2 border-gray-200">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-3 font-bold uppercase text-sm whitespace-nowrap transition-colors ${
                activeTab === 'orders'
                  ? 'border-b-2 border-brand-primary text-brand-primary'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Bestellingen
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-bold uppercase text-sm whitespace-nowrap transition-colors ${
                activeTab === 'profile'
                  ? 'border-b-2 border-brand-primary text-brand-primary'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Profiel
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`px-4 py-3 font-bold uppercase text-sm whitespace-nowrap transition-colors ${
                activeTab === 'addresses'
                  ? 'border-b-2 border-brand-primary text-brand-primary'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Adressen
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`px-4 py-3 font-bold uppercase text-sm whitespace-nowrap transition-colors ${
                activeTab === 'returns'
                  ? 'border-b-2 border-brand-primary text-brand-primary'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Retouren
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Desktop Sidebar */}
          <div className="hidden md:block md:col-span-1">
            <div className="bg-gray-50 border-2 border-gray-300 p-4 sticky top-24">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-left px-4 py-3 font-bold transition-colors ${
                    activeTab === 'orders'
                      ? 'bg-brand-primary text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Bestellingen
                </button>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-3 font-bold transition-colors ${
                    activeTab === 'profile'
                      ? 'bg-brand-primary text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Profiel
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full text-left px-4 py-3 font-bold transition-colors ${
                    activeTab === 'addresses'
                      ? 'bg-brand-primary text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Adressen
                </button>
                <button
                  onClick={() => setActiveTab('returns')}
                  className={`w-full text-left px-4 py-3 font-bold transition-colors ${
                    activeTab === 'returns'
                      ? 'bg-brand-primary text-white'
                      : 'hover:bg-gray-200'
                  }`}
                >
                  Retouren
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <>
                <h2 className="text-2xl md:text-3xl font-display mb-6">MIJN BESTELLINGEN</h2>

                {orders.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-gray-300 p-8 md:p-12 text-center">
                    <p className="text-gray-600 mb-6 text-lg">Je hebt nog geen bestellingen geplaatst</p>
                    <Link
                      href="/shop"
                      className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                    >
                      Start met shoppen
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="bg-white border-2 border-black p-6">
                        {/* Order Header */}
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg md:text-xl">
                                Bestelling #{order.id.slice(0, 8).toUpperCase()}
                              </h3>
                              <span className={`px-3 py-1 text-xs font-bold uppercase ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-left md:text-right">
                            <p className="text-2xl md:text-3xl font-display mb-1">€{order.total.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">
                              {order.order_items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
                            </p>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="border-t-2 border-gray-200 pt-4 space-y-4">
                          {order.order_items.map((item, idx) => (
                            <div key={idx} className="flex gap-4">
                              {/* Product Thumbnail */}
                              <div className="flex-shrink-0">
                                {item.image_url ? (
                                  <div className="relative w-20 h-20 md:w-24 md:h-24 border-2 border-gray-200 overflow-hidden">
                                    <Image
                                      src={item.image_url}
                                      alt={item.product_name}
                                      fill
                                      sizes="96px"
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs text-center px-2">Geen afbeelding</span>
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-base md:text-lg mb-1">{item.product_name}</p>
                                <p className="text-sm text-gray-600 mb-2">
                                  {item.size} • {item.color} • x{item.quantity}
                                </p>
                                <p className="font-bold text-lg">€{item.subtotal.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="border-t-2 border-gray-200 pt-4 mt-4 flex flex-col sm:flex-row gap-3">
                          <Link
                            href={`/order-confirmation?order=${order.id}`}
                            className="px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors text-center"
                          >
                            Bekijk details
                          </Link>
                          {order.status === 'delivered' && (
                            <>
                              <Link
                                href={`/returns/new?order_id=${order.id}`}
                                className="px-6 py-3 border-2 border-black font-bold uppercase text-sm hover:bg-black hover:text-white transition-colors text-center"
                              >
                                Retour aanvragen
                              </Link>
                              <Link
                                href="/shop"
                                className="px-6 py-3 border-2 border-gray-300 font-bold uppercase text-sm hover:bg-gray-100 transition-colors text-center"
                              >
                                Bestel opnieuw
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl md:text-3xl font-display mb-6">PROFIEL</h2>

                {/* Profile Information */}
                <div className="bg-white border-2 border-black p-6 md:p-8">
                  <h3 className="text-xl font-display mb-4">Persoonlijke Gegevens</h3>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Voornaam *
                        </label>
                        <input
                          type="text"
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Achternaam *
                        </label>
                        <input
                          type="text"
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={updateProfile}
                      disabled={profileLoading}
                      className="px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {profileLoading ? 'Opslaan...' : 'Profiel opslaan'}
                    </button>
                  </div>
                </div>

                {/* Password Change */}
                <div className="bg-white border-2 border-black p-6 md:p-8">
                  <h3 className="text-xl font-display mb-4">Wachtwoord Wijzigen</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Nieuw Wachtwoord *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                        placeholder="Minimaal 6 karakters"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">
                        Bevestig Wachtwoord *
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                      />
                    </div>
                    {passwordError && (
                      <div className="p-3 bg-red-50 border-2 border-red-600 text-red-900 text-sm">
                        {passwordError}
                      </div>
                    )}
                    <button
                      onClick={updatePassword}
                      disabled={passwordLoading}
                      className="px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {passwordLoading ? 'Opslaan...' : 'Wachtwoord wijzigen'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <h2 className="text-2xl md:text-3xl font-display">ADRESSEN</h2>
                  {!showAddressForm && (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors"
                    >
                      + Nieuw Adres
                    </button>
                  )}
                </div>

                {addressesLoading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Laden...</p>
                  </div>
                ) : showAddressForm ? (
                  <div className="bg-white border-2 border-black p-6 md:p-8">
                    <h3 className="text-xl font-display mb-6">
                      {editingAddress ? 'Adres Bewerken' : 'Nieuw Adres'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Naam * <span className="text-gray-500 font-normal">(bijv. Thuis, Werk)</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                          placeholder="Bijv. Thuis"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">
                          Adres * <span className="text-gray-500 font-normal">(straat + huisnummer)</span>
                        </label>
                        <input
                          type="text"
                          value={addressForm.address}
                          onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                          placeholder="Straat + huisnummer"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold mb-2">
                            Postcode *
                          </label>
                          <input
                            type="text"
                            value={addressForm.postal_code}
                            onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                            placeholder="1234AB"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2">
                            Stad *
                          </label>
                          <input
                            type="text"
                            value={addressForm.city}
                            onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                            placeholder="Groningen"
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold mb-2">
                            Telefoon
                          </label>
                          <input
                            type="tel"
                            value={addressForm.phone}
                            onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                            placeholder="+31 6 12345678"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2">
                            Land *
                          </label>
                          <select
                            value={addressForm.country}
                            onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                          >
                            <option value="NL">Nederland</option>
                            <option value="BE">België</option>
                            <option value="DE">Duitsland</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2 pt-4 border-t-2 border-gray-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addressForm.is_default_shipping}
                            onChange={(e) => setAddressForm({ ...addressForm, is_default_shipping: e.target.checked })}
                            className="w-5 h-5 border-2 border-gray-300 focus:border-brand-primary"
                          />
                          <span className="text-sm font-bold">Gebruik als standaard verzendadres</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addressForm.is_default_billing}
                            onChange={(e) => setAddressForm({ ...addressForm, is_default_billing: e.target.checked })}
                            className="w-5 h-5 border-2 border-gray-300 focus:border-brand-primary"
                          />
                          <span className="text-sm font-bold">Gebruik als standaard factuuradres</span>
                        </label>
                      </div>
                      {addressError && (
                        <div className="p-3 bg-red-50 border-2 border-red-600 text-red-900 text-sm">
                          {addressError}
                        </div>
                      )}
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={saveAddress}
                          className="px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={cancelAddressForm}
                          className="px-6 py-3 border-2 border-black font-bold uppercase text-sm hover:bg-black hover:text-white transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-gray-300 p-8 md:p-12 text-center">
                    <p className="text-gray-600 mb-6 text-lg">Je hebt nog geen adressen opgeslagen</p>
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                    >
                      Voeg eerste adres toe
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((address) => (
                      <div key={address.id} className="bg-white border-2 border-black p-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-bold text-lg">{address.name}</h3>
                              {address.is_default_shipping && (
                                <span className="px-2 py-1 text-xs font-bold uppercase bg-brand-primary text-white">
                                  Standaard verzending
                                </span>
                              )}
                              {address.is_default_billing && (
                                <span className="px-2 py-1 text-xs font-bold uppercase bg-gray-800 text-white">
                                  Standaard factuur
                                </span>
                              )}
                            </div>
                            <div className="text-gray-600 space-y-1">
                              <p>{address.address}</p>
                              <p>{address.postal_code} {address.city}</p>
                              {address.phone && <p>{address.phone}</p>}
                              <p>{address.country}</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => startEditAddress(address)}
                              className="px-4 py-2 border-2 border-black font-bold uppercase text-xs hover:bg-black hover:text-white transition-colors"
                            >
                              Bewerken
                            </button>
                            <button
                              onClick={() => deleteAddress(address.id)}
                              className="px-4 py-2 border-2 border-red-600 text-red-600 font-bold uppercase text-xs hover:bg-red-600 hover:text-white transition-colors"
                            >
                              Verwijderen
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Returns Tab */}
            {activeTab === 'returns' && (
              <>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <h2 className="text-2xl md:text-3xl font-display">MIJN RETOUREN</h2>
                  <Link
                    href="/returns/new"
                    className="px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors text-center"
                  >
                    + Nieuwe Retour Aanvragen
                  </Link>
                </div>

                {returnsLoading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Laden...</p>
                  </div>
                ) : returns.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-gray-300 p-8 md:p-12 text-center">
                    <p className="text-gray-600 mb-6 text-lg">Je hebt nog geen retouren aangevraagd</p>
                    <Link
                      href="/returns/new"
                      className="inline-block px-8 py-4 bg-brand-primary text-white font-bold uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                    >
                      Retour Aanvragen
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {returns.map((returnItem) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'return_requested':
                            return 'bg-yellow-400 text-black'
                          case 'return_approved':
                            return 'bg-blue-500 text-white'
                          case 'return_label_payment_pending':
                            return 'bg-orange-500 text-white'
                          case 'return_label_payment_completed':
                            return 'bg-purple-500 text-white'
                          case 'return_label_generated':
                            return 'bg-green-500 text-white'
                          case 'return_in_transit':
                            return 'bg-brand-primary text-white'
                          case 'return_received':
                            return 'bg-gray-600 text-white'
                          case 'refund_processing':
                            return 'bg-indigo-500 text-white'
                          case 'refunded':
                            return 'bg-gray-800 text-white'
                          case 'return_rejected':
                            return 'bg-red-600 text-white'
                          default:
                            return 'bg-gray-400 text-white'
                        }
                      }

                      const getStatusText = (status: string) => {
                        const labels: Record<string, string> = {
                          return_requested: 'Aangevraagd',
                          return_approved: 'Goedgekeurd',
                          return_label_payment_pending: 'Betaling Label',
                          return_label_payment_completed: 'Label Betaald',
                          return_label_generated: 'Label Beschikbaar',
                          return_in_transit: 'Onderweg',
                          return_received: 'Ontvangen',
                          refund_processing: 'Refund Bezig',
                          refunded: 'Terugbetaald',
                          return_rejected: 'Afgewezen',
                        }
                        return labels[status] || status
                      }

                      return (
                        <div key={returnItem.id} className="bg-white border-2 border-black p-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3 mb-2">
                                <h3 className="font-bold text-lg md:text-xl">
                                  Retour #{returnItem.id.slice(0, 8).toUpperCase()}
                                </h3>
                                <span className={`px-3 py-1 text-xs font-bold uppercase ${getStatusColor(returnItem.status)}`}>
                                  {getStatusText(returnItem.status)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                Order #{returnItem.orders?.id?.slice(0, 8).toUpperCase() || 'N/A'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(returnItem.created_at).toLocaleDateString('nl-NL', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                            {returnItem.total_refund && (
                              <div className="text-left md:text-right">
                                <p className="text-2xl md:text-3xl font-display mb-1">€{returnItem.total_refund.toFixed(2)}</p>
                                <p className="text-sm text-gray-600">Terug te betalen</p>
                              </div>
                            )}
                          </div>

                          <div className="border-t-2 border-gray-200 pt-4">
                            <p className="font-bold mb-2">Reden: {returnItem.return_reason}</p>
                            {returnItem.customer_notes && (
                              <p className="text-sm text-gray-600 mb-4">{returnItem.customer_notes}</p>
                            )}
                          </div>

                          <div className="border-t-2 border-gray-200 pt-4 mt-4 flex flex-col sm:flex-row gap-3">
                            <Link
                              href={`/returns/${returnItem.id}`}
                              className="px-6 py-3 bg-brand-primary text-white font-bold uppercase text-sm hover:bg-brand-primary-hover transition-colors text-center"
                            >
                              Bekijk details
                            </Link>
                            {returnItem.status === 'return_approved' && (
                              <Link
                                href={`/returns/${returnItem.id}`}
                                className="px-6 py-3 border-2 border-black font-bold uppercase text-sm hover:bg-black hover:text-white transition-colors text-center"
                              >
                                Betaal voor label (€7,87)
                              </Link>
                            )}
                            {returnItem.status === 'return_label_generated' && returnItem.return_label_url && (
                              <a
                                href={returnItem.return_label_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3 border-2 border-black font-bold uppercase text-sm hover:bg-black hover:text-white transition-colors text-center"
                              >
                                Download label
                              </a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
