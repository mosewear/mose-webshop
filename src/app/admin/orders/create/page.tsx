'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Trash2, Package, User, Truck, CreditCard } from 'lucide-react'

const COUNTRY_OPTIONS = [
  { value: 'NL', label: 'Nederland' },
  { value: 'BE', label: 'België' },
  { value: 'DE', label: 'Duitsland' },
  { value: 'FR', label: 'Frankrijk' },
  { value: 'LU', label: 'Luxemburg' },
  { value: 'GB', label: 'Verenigd Koninkrijk' },
  { value: 'AT', label: 'Oostenrijk' },
  { value: 'ES', label: 'Spanje' },
  { value: 'IT', label: 'Italië' },
  { value: 'PT', label: 'Portugal' },
]

interface Product {
  id: string
  name: string
  base_price: number
  sale_price: number | null
  product_images: { url: string; is_primary: boolean }[]
}

interface Variant {
  id: string
  product_id: string
  size: string
  color: string
  color_hex: string | null
  sku: string
  stock_quantity: number
  presale_stock_quantity: number
  price_adjustment: number
  is_available: boolean
}

interface OrderLineItem {
  key: string
  product_id: string
  variant_id: string
  product_name: string
  size: string
  color: string
  sku: string
  quantity: number
  price_at_purchase: number
  image_url: string | null
}

export default function CreateOrderPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Customer
  const [email, setEmail] = useState('')
  const [shippingName, setShippingName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingHouseNumber, setShippingHouseNumber] = useState('')
  const [shippingAddition, setShippingAddition] = useState('')
  const [shippingPostalCode, setShippingPostalCode] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingCountry, setShippingCountry] = useState('NL')
  const [shippingPhone, setShippingPhone] = useState('')
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [billingName, setBillingName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingHouseNumber, setBillingHouseNumber] = useState('')
  const [billingAddition, setBillingAddition] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingCountry, setBillingCountry] = useState('NL')

  // Products
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [itemQuantity, setItemQuantity] = useState(1)
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([])

  // Delivery & payment
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'pickup'>('shipping')
  const [paymentStatus, setPaymentStatus] = useState('paid')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [shippingCost, setShippingCost] = useState(0)
  const [defaultShippingCost, setDefaultShippingCost] = useState(0)
  const [internalNotes, setInternalNotes] = useState('')

  useEffect(() => {
    fetchProducts()
    fetchShippingSettings()
  }, [])

  useEffect(() => {
    if (selectedProductId) {
      fetchVariants(selectedProductId)
    } else {
      setVariants([])
      setSelectedVariantId('')
    }
  }, [selectedProductId])

  useEffect(() => {
    setShippingCost(deliveryMethod === 'pickup' ? 0 : defaultShippingCost)
  }, [deliveryMethod, defaultShippingCost])

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, base_price, sale_price, product_images(url, is_primary)')
      .eq('is_active', true)
      .order('name')
    if (data) setProducts(data)
  }

  const fetchVariants = async (productId: string) => {
    const { data } = await supabase
      .from('product_variants')
      .select('id, product_id, size, color, color_hex, sku, stock_quantity, presale_stock_quantity, price_adjustment, is_available')
      .eq('product_id', productId)
      .eq('is_available', true)
      .order('display_order')
    if (data) {
      setVariants(data)
      setSelectedVariantId('')
    }
  }

  const fetchShippingSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('key', 'shipping_cost')
      .single()
    if (data?.value) {
      const cost = parseFloat(String(data.value))
      if (!isNaN(cost)) {
        setDefaultShippingCost(cost)
        setShippingCost(cost)
      }
    }
  }

  const getProductPrice = (product: Product, variant?: Variant) => {
    const base = product.sale_price ?? product.base_price
    const adjustment = variant?.price_adjustment || 0
    return base + adjustment
  }

  const getProductImage = (product: Product): string | null => {
    const primary = product.product_images?.find(img => img.is_primary)
    return primary?.url || product.product_images?.[0]?.url || null
  }

  const handleAddItem = () => {
    if (!selectedProductId || !selectedVariantId || itemQuantity < 1) return

    const product = products.find(p => p.id === selectedProductId)
    const variant = variants.find(v => v.id === selectedVariantId)
    if (!product || !variant) return

    const totalStock = variant.stock_quantity + variant.presale_stock_quantity
    const existingItem = lineItems.find(li => li.variant_id === variant.id)
    const existingQty = existingItem?.quantity || 0

    if (existingQty + itemQuantity > totalStock) {
      setError(`Maximaal ${totalStock} beschikbaar voor ${product.name} (${variant.size} - ${variant.color}). Je hebt al ${existingQty} in de order.`)
      return
    }

    setError('')

    if (existingItem) {
      setLineItems(prev =>
        prev.map(li =>
          li.variant_id === variant.id
            ? { ...li, quantity: li.quantity + itemQuantity }
            : li
        )
      )
    } else {
      setLineItems(prev => [
        ...prev,
        {
          key: `${variant.id}-${Date.now()}`,
          product_id: product.id,
          variant_id: variant.id,
          product_name: product.name,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          quantity: itemQuantity,
          price_at_purchase: getProductPrice(product, variant),
          image_url: getProductImage(product),
        },
      ])
    }

    setSelectedVariantId('')
    setItemQuantity(1)
  }

  const handleRemoveItem = (key: string) => {
    setLineItems(prev => prev.filter(li => li.key !== key))
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.price_at_purchase * li.quantity, 0)
  const total = subtotal + (deliveryMethod === 'pickup' ? 0 : shippingCost)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!email.trim()) throw new Error('E-mailadres is verplicht')
      if (lineItems.length === 0) throw new Error('Voeg minimaal 1 product toe')
      if (!shippingName.trim()) throw new Error('Naam bij verzendadres is verplicht')
      if (!shippingAddress.trim()) throw new Error('Straat bij verzendadres is verplicht')
      if (!shippingCity.trim()) throw new Error('Plaats bij verzendadres is verplicht')
      if (!shippingPostalCode.trim()) throw new Error('Postcode bij verzendadres is verplicht')

      const shippingAddr = {
        name: shippingName.trim(),
        address: shippingAddress.trim(),
        houseNumber: shippingHouseNumber.trim(),
        addition: shippingAddition.trim(),
        postalCode: shippingPostalCode.trim(),
        city: shippingCity.trim(),
        country: shippingCountry,
        phone: shippingPhone.trim(),
      }

      const billingAddr = sameAsBilling
        ? shippingAddr
        : {
            name: billingName.trim() || shippingAddr.name,
            address: billingAddress.trim() || shippingAddr.address,
            houseNumber: billingHouseNumber.trim(),
            addition: billingAddition.trim(),
            postalCode: billingPostalCode.trim() || shippingAddr.postalCode,
            city: billingCity.trim() || shippingAddr.city,
            country: billingCountry || shippingAddr.country,
          }

      const res = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          shipping_address: shippingAddr,
          billing_address: billingAddr,
          delivery_method: deliveryMethod,
          payment_status: paymentStatus,
          payment_method: paymentMethod.trim() || null,
          shipping_cost: shippingCost,
          internal_notes: internalNotes.trim() || null,
          items: lineItems.map(({ key, ...item }) => item),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Onbekende fout')

      router.push(`/admin/orders/${data.orderId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)
  const selectedVariant = variants.find(v => v.id === selectedVariantId)

  const inputClass = 'w-full px-3 py-2.5 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm'
  const labelClass = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1'

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/orders" className="p-2 hover:bg-gray-100 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold mb-1">Nieuwe Order</h1>
          <p className="text-gray-600 text-sm">Maak handmatig een bestelling aan</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 mb-6 text-sm font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Customer Info */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-bold uppercase tracking-wide">Klantgegevens</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>E-mailadres *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className={inputClass} placeholder="klant@email.nl" />
            </div>

            <div className="border-t pt-4">
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Verzendadres</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="md:col-span-2">
                  <label className={labelClass}>Naam *</label>
                  <input type="text" required value={shippingName} onChange={e => setShippingName(e.target.value)}
                    className={inputClass} placeholder="Jan Janssen" />
                </div>
                <div>
                  <label className={labelClass}>Straat *</label>
                  <input type="text" required value={shippingAddress} onChange={e => setShippingAddress(e.target.value)}
                    className={inputClass} placeholder="Kalverstraat" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Huisnr. *</label>
                    <input type="text" required value={shippingHouseNumber} onChange={e => setShippingHouseNumber(e.target.value)}
                      className={inputClass} placeholder="27" />
                  </div>
                  <div>
                    <label className={labelClass}>Toev.</label>
                    <input type="text" value={shippingAddition} onChange={e => setShippingAddition(e.target.value)}
                      className={inputClass} placeholder="A" />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Postcode *</label>
                  <input type="text" required value={shippingPostalCode} onChange={e => setShippingPostalCode(e.target.value)}
                    className={inputClass} placeholder="1012 AB" />
                </div>
                <div>
                  <label className={labelClass}>Plaats *</label>
                  <input type="text" required value={shippingCity} onChange={e => setShippingCity(e.target.value)}
                    className={inputClass} placeholder="Amsterdam" />
                </div>
                <div>
                  <label className={labelClass}>Land</label>
                  <select value={shippingCountry} onChange={e => setShippingCountry(e.target.value)}
                    className={`${inputClass} bg-white`}>
                    {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Telefoon</label>
                  <input type="tel" value={shippingPhone} onChange={e => setShippingPhone(e.target.value)}
                    className={inputClass} placeholder="+31 6 12345678" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={sameAsBilling} onChange={e => setSameAsBilling(e.target.checked)}
                  className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" />
                <span className="text-sm font-semibold text-gray-700">Factuuradres is hetzelfde als verzendadres</span>
              </label>

              {!sameAsBilling && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Naam</label>
                    <input type="text" value={billingName} onChange={e => setBillingName(e.target.value)}
                      className={inputClass} placeholder="Jan Janssen" />
                  </div>
                  <div>
                    <label className={labelClass}>Straat</label>
                    <input type="text" value={billingAddress} onChange={e => setBillingAddress(e.target.value)}
                      className={inputClass} placeholder="Kalverstraat" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Huisnr.</label>
                      <input type="text" value={billingHouseNumber} onChange={e => setBillingHouseNumber(e.target.value)}
                        className={inputClass} placeholder="27" />
                    </div>
                    <div>
                      <label className={labelClass}>Toev.</label>
                      <input type="text" value={billingAddition} onChange={e => setBillingAddition(e.target.value)}
                        className={inputClass} placeholder="A" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Postcode</label>
                    <input type="text" value={billingPostalCode} onChange={e => setBillingPostalCode(e.target.value)}
                      className={inputClass} placeholder="1012 AB" />
                  </div>
                  <div>
                    <label className={labelClass}>Plaats</label>
                    <input type="text" value={billingCity} onChange={e => setBillingCity(e.target.value)}
                      className={inputClass} placeholder="Amsterdam" />
                  </div>
                  <div>
                    <label className={labelClass}>Land</label>
                    <select value={billingCountry} onChange={e => setBillingCountry(e.target.value)}
                      className={`${inputClass} bg-white`}>
                      {COUNTRY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Products */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-bold uppercase tracking-wide">Producten</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-1">
              <label className={labelClass}>Product</label>
              <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}
                className={`${inputClass} bg-white`}>
                <option value="">— Selecteer —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — €{(p.sale_price ?? p.base_price).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Variant</label>
              <select value={selectedVariantId} onChange={e => setSelectedVariantId(e.target.value)}
                className={`${inputClass} bg-white`} disabled={!selectedProductId}>
                <option value="">— Selecteer —</option>
                {variants.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.size} / {v.color} ({v.stock_quantity + v.presale_stock_quantity} op voorraad)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Aantal</label>
              <input type="number" min={1} value={itemQuantity} onChange={e => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={inputClass} />
            </div>
            <div>
              <button type="button" onClick={handleAddItem}
                disabled={!selectedProductId || !selectedVariantId}
                className="w-full flex items-center justify-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2.5 px-4 uppercase tracking-wider text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" /> Toevoegen
              </button>
            </div>
          </div>

          {selectedProduct && selectedVariant && (
            <div className="mt-3 text-sm text-gray-600">
              Prijs per stuk: <span className="font-bold text-gray-900">€{getProductPrice(selectedProduct, selectedVariant).toFixed(2)}</span>
              {selectedVariant.price_adjustment !== 0 && (
                <span className="text-gray-400 ml-1">(incl. variant toeslag €{selectedVariant.price_adjustment.toFixed(2)})</span>
              )}
            </div>
          )}

          {lineItems.length > 0 ? (
            <div className="mt-5 border-t pt-4">
              <div className="space-y-3">
                {lineItems.map(li => (
                  <div key={li.key} className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200">
                    {li.image_url && (
                      <img src={li.image_url} alt="" className="w-12 h-12 object-cover border border-gray-200 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{li.product_name}</div>
                      <div className="text-xs text-gray-500">{li.size} / {li.color} — SKU: {li.sku}</div>
                    </div>
                    <div className="text-sm text-gray-600 flex-shrink-0">
                      {li.quantity}x €{li.price_at_purchase.toFixed(2)}
                    </div>
                    <div className="font-bold text-sm flex-shrink-0 w-20 text-right">
                      €{(li.price_at_purchase * li.quantity).toFixed(2)}
                    </div>
                    <button type="button" onClick={() => handleRemoveItem(li.key)}
                      className="text-red-500 hover:text-red-700 p-1 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 border-t pt-4 text-center py-8 text-gray-400 text-sm">
              Nog geen producten toegevoegd
            </div>
          )}
        </div>

        {/* Section 3: Delivery & Payment */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Truck className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-bold uppercase tracking-wide">Bezorging &amp; Betaling</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bezorgmethode</label>
              <div className="flex gap-3 mt-1">
                <label className={`flex items-center gap-2 px-4 py-2.5 border-2 cursor-pointer transition-colors text-sm font-semibold ${
                  deliveryMethod === 'shipping' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}>
                  <input type="radio" name="delivery" value="shipping" checked={deliveryMethod === 'shipping'}
                    onChange={() => setDeliveryMethod('shipping')} className="sr-only" />
                  Verzenden
                </label>
                <label className={`flex items-center gap-2 px-4 py-2.5 border-2 cursor-pointer transition-colors text-sm font-semibold ${
                  deliveryMethod === 'pickup' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}>
                  <input type="radio" name="delivery" value="pickup" checked={deliveryMethod === 'pickup'}
                    onChange={() => setDeliveryMethod('pickup')} className="sr-only" />
                  Afhalen
                </label>
              </div>
            </div>

            {deliveryMethod === 'shipping' && (
              <div>
                <label className={labelClass}>Verzendkosten (€)</label>
                <input type="number" step="0.01" min="0" value={shippingCost}
                  onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                  className={inputClass} />
              </div>
            )}

            <div>
              <label className={labelClass}>Betalingsstatus</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}
                className={`${inputClass} bg-white`}>
                <option value="paid">Betaald</option>
                <option value="pending">In afwachting</option>
                <option value="unpaid">Niet betaald</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Betaalmethode</label>
              <input type="text" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className={inputClass} placeholder="Bijv. Contant, PIN, Bankoverschrijving" />
            </div>
          </div>
        </div>

        {/* Section 4: Summary */}
        <div className="bg-white border-2 border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-5 h-5 text-brand-primary" />
            <h2 className="text-lg font-bold uppercase tracking-wide">Overzicht</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Interne notitie (optioneel)</label>
              <textarea rows={3} value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
                className={`${inputClass} resize-none`} placeholder="Bijv. telefonische bestelling, afrekening bij afhalen..." />
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotaal ({lineItems.reduce((s, li) => s + li.quantity, 0)} items)</span>
                <span className="font-semibold">€{subtotal.toFixed(2)}</span>
              </div>
              {deliveryMethod === 'shipping' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verzendkosten</span>
                  <span className="font-semibold">{shippingCost === 0 ? 'Gratis' : `€${shippingCost.toFixed(2)}`}</span>
                </div>
              )}
              {deliveryMethod === 'pickup' && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Afhalen</span>
                  <span className="font-semibold text-green-600">Gratis</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                <span>Totaal</span>
                <span>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-2">
          <button type="submit" disabled={loading || lineItems.length === 0}
            className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-8 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Order Aanmaken...' : 'Order Aanmaken'}
          </button>
          <Link href="/admin/orders"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 uppercase tracking-wider transition-colors flex items-center">
            Annuleren
          </Link>
        </div>
      </form>
    </div>
  )
}
