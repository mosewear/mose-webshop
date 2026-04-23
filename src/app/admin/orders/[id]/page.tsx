'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Package, Clock, CheckCircle2, XCircle, Truck, AlertCircle, ChevronDown, ChevronUp, Printer, Zap, RefreshCw, Pencil, X, Save, Trash2, Plus, Minus, RotateCcw } from 'lucide-react'
import { getCarrierOptions, generateTrackingUrl, calculateEstimatedDelivery } from '@/lib/order-utils'

interface Order {
  id: string
  user_id: string | null
  email: string
  status: string
  payment_status: string
  paid_at: string | null
  payment_method: string | null
  stripe_payment_intent_id: string | null
  payment_metadata: any
  checkout_started_at: string | null
  total: number
  subtotal?: number
  shipping_cost?: number
  delivery_method?: 'shipping' | 'pickup'
  pickup_distance_km?: number | null
  pickup_location_name?: string | null
  pickup_location_address?: string | null
  shipping_address: any
  billing_address: any
  tracking_code: string | null
  tracking_url: string | null
  carrier: string | null
  label_url: string | null
  estimated_delivery_date: string | null
  internal_notes: string | null
  last_email_sent_at: string | null
  last_email_type: string | null
  review_invitation_sent_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

interface OrderItem {
  id: string
  product_id: string | null
  product_name: string | null
  variant_id: string | null
  quantity: number
  price_at_purchase: number
  original_price: number | null
  quantity_discount_amount: number | null
  size: string | null
  color: string | null
  sku: string | null
  image_url: string | null
}

interface StatusHistoryItem {
  id: string
  old_status: string | null
  new_status: string
  changed_at: string
  changed_by: string | null
  notes: string | null
  email_sent: boolean
}

const COUNTRY_LABELS: Record<string, string> = {
  NL: 'Nederland', BE: 'België', DE: 'Duitsland', FR: 'Frankrijk',
  LU: 'Luxemburg', GB: 'Verenigd Koninkrijk', AT: 'Oostenrijk',
  ES: 'Spanje', IT: 'Italië', PT: 'Portugal',
}

function displayCountry(code: string | undefined): string {
  if (!code) return 'Nederland'
  return COUNTRY_LABELS[code.toUpperCase()] || code
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([])
  const [returns, setReturns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Form states
  const [trackingCode, setTrackingCode] = useState('')
  const [trackingUrl, setTrackingUrl] = useState('')
  const [carrier, setCarrier] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [sendEmailOnStatusChange, setSendEmailOnStatusChange] = useState(true)
  const [autoUpdateToShipped, setAutoUpdateToShipped] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showTimeline, setShowTimeline] = useState(true)
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [labelSuccess, setLabelSuccess] = useState(false)
  const [labelUrl, setLabelUrl] = useState('')
  const [refreshingReturns, setRefreshingReturns] = useState(false)

  // Customer info edit states
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [customerEmail, setCustomerEmail] = useState('')
  const [shippingName, setShippingName] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [shippingHouseNumber, setShippingHouseNumber] = useState('')
  const [shippingAddition, setShippingAddition] = useState('')
  const [shippingPostalCode, setShippingPostalCode] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingCountry, setShippingCountry] = useState('')
  const [shippingPhone, setShippingPhone] = useState('')
  const [billingName, setBillingName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingHouseNumber, setBillingHouseNumber] = useState('')
  const [billingAddition, setBillingAddition] = useState('')
  const [billingPostalCode, setBillingPostalCode] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingCountry, setBillingCountry] = useState('')

  // Order items edit states
  const [editingItems, setEditingItems] = useState(false)
  const [savingItems, setSavingItems] = useState(false)
  const [editedItems, setEditedItems] = useState<OrderItem[]>([])
  const [addingProduct, setAddingProduct] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string; base_price: number; sale_price: number | null; product_images: { url: string; is_primary: boolean; color: string | null; media_type: string | null }[] }[]>([])
  const [availableVariants, setAvailableVariants] = useState<{ id: string; product_id: string; size: string; color: string; color_hex: string | null; sku: string; stock_quantity: number; price_adjustment: number; is_available: boolean }[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [addQuantity, setAddQuantity] = useState(1)

  const carrierOptions = getCarrierOptions()

  useEffect(() => {
    fetchOrder()
    fetchOrderItems()
    fetchStatusHistory()
    fetchReturns()
    
    // Setup realtime subscription voor return status updates
    const channel = supabase
      .channel(`returns-for-order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'returns',
          filter: `order_id=eq.${id}`
        },
        (payload) => {
          fetchReturns()
        }
      )
      .subscribe()
    
    // Refresh data wanneer admin terugkomt naar tab
    const handleFocus = () => {
      fetchReturns()
    }
    
    window.addEventListener('focus', handleFocus)
    
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('focus', handleFocus)
    }
  }, [id])

  const fetchReturns = async () => {
    try {
      setRefreshingReturns(true)
      const { data, error } = await supabase
        .from('returns')
        .select('id, status, return_label_payment_status, return_label_paid_at, return_label_url, created_at, updated_at')
        .eq('order_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      setReturns(data || [])
    } catch (err: any) {
      console.error('Error fetching returns:', err)
    } finally {
      setRefreshingReturns(false)
    }
  }

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setOrder(data)
      setNewStatus(data.status)
      setTrackingCode(data.tracking_code || '')
      setTrackingUrl(data.tracking_url || '')
      setCarrier(data.carrier || '')
      setInternalNotes(data.internal_notes || '')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchOrderItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id)

      if (error) throw error

      const items: OrderItem[] = data || []

      const productIds = [...new Set(items.filter(i => i.product_id).map(i => i.product_id!))]
      if (productIds.length > 0) {
        const { data: images } = await supabase
          .from('product_images')
          .select('product_id, url, color, is_primary, media_type')
          .in('product_id', productIds)

        if (images && images.length > 0) {
          const onlyImages = images.filter(img => img.media_type !== 'video')
          const enriched = items.map(item => {
            if (!item.product_id) return item
            const productImgs = onlyImages.filter(img => img.product_id === item.product_id)
            const colorImg = item.color
              ? productImgs.find(img => img.color === item.color)
              : null
            const primaryImg = productImgs.find(img => img.is_primary)
            const bestUrl = colorImg?.url || primaryImg?.url || productImgs[0]?.url || null
            if (bestUrl && bestUrl !== item.image_url) {
              return { ...item, image_url: bestUrl }
            }
            return item
          })
          setOrderItems(enriched)
          return
        }
      }

      setOrderItems(items)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatusHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('changed_at', { ascending: false })

      if (error) throw error
      setStatusHistory(data || [])
    } catch (err: any) {
      console.error('Error fetching status history:', err)
    }
  }

  const handleAutoGenerateUrl = () => {
    if (!carrier || !trackingCode) {
      alert('Vul eerst vervoerder en tracking code in!')
      return
    }
    
    const url = generateTrackingUrl(carrier, trackingCode)
    setTrackingUrl(url)
  }

  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) return

    if (!confirm(`Status wijzigen naar "${getStatusLabel(newStatus)}"?`)) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error

      // Send email if checkbox is checked
      if (sendEmailOnStatusChange) {
        await handleSendStatusEmail(order.status, newStatus)
      }

      await fetchOrder()
      await fetchStatusHistory()
      alert('✅ Status bijgewerkt!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateTracking = async () => {
    if (!order) return

    try {
      setUpdating(true)
      
      const updates: any = {
        tracking_code: trackingCode || null,
        tracking_url: trackingUrl || null,
        carrier: carrier || null,
        updated_at: new Date().toISOString(),
      }

      // Auto-update status to shipped if checkbox is checked
      if (autoUpdateToShipped && trackingCode && order.status !== 'shipped') {
        updates.status = 'shipped'
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Send shipping email if updating to shipped
      if (autoUpdateToShipped && trackingCode && order.status !== 'shipped') {
        await handleSendShippingEmail()
      }

      await fetchOrder()
      await fetchStatusHistory()
      alert('✅ Tracking informatie opgeslagen!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateNotes = async () => {
    if (!order) return

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('orders')
        .update({
          internal_notes: internalNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      await fetchOrder()
      alert('✅ Notities opgeslagen!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const handleSendStatusEmail = async (oldStatus: string, newStatus: string) => {
    try {
      const response = await fetch('/api/send-status-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          oldStatus,
          newStatus,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send email')
      }

    } catch (err: any) {
      console.error('Error sending status email:', err)
      // Don't fail the status update if email fails
    }
  }

  const handleSendShippingEmail = async () => {
    if (!order || !trackingCode) {
      alert('Voeg eerst een tracking code toe!')
      return
    }

    try {
      setSendingEmail(true)
      const response = await fetch('/api/send-shipping-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send email')
      }

      alert('✅ Verzend-email verzonden!')
    } catch (err: any) {
      alert(`Fout bij versturen email: ${err.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleResendReviewInvitation = async (alreadySent: boolean) => {
    if (!order) return
    const confirmMsg = alreadySent
      ? 'Deze review invitation is al verstuurd. Weet je zeker dat je de delivered-email nogmaals wil versturen (klant krijgt dan een dubbele email)?'
      : 'De delivered-email wordt verstuurd en Trustpilot AFS wordt geBCC\'d voor een review invitation. Doorgaan?'
    if (!confirm(confirmMsg)) return

    try {
      setSendingEmail(true)
      const response = await fetch('/api/admin/trigger-delivered-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order.id], force: alreadySent }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Versturen mislukt')
      }

      const result = data.results?.[0]
      if (result?.success && !result?.skipped) {
        alert(
          data.trustpilotConfigured
            ? '✅ Delivered-email verstuurd en Trustpilot AFS geBCC\'d.'
            : '✅ Delivered-email verstuurd. Waarschuwing: TRUSTPILOT_AFS_BCC_EMAIL is niet geconfigureerd, dus er is geen review invitation naar Trustpilot gestuurd.'
        )
        await fetchOrder()
      } else if (result?.skipped) {
        alert(`ℹ️ Overgeslagen: ${result.info || result.error || 'Already sent'}`)
      } else {
        throw new Error(result?.error || 'Onbekende fout')
      }
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleCreateLabel = async () => {
    if (!order) return

    if (!confirm('Automatisch verzendlabel aanmaken via Sendcloud + DHL?')) return

    try {
      setCreatingLabel(true)
      setLabelSuccess(false)
      
      const response = await fetch('/api/create-shipping-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          sendEmail: true, // Automatisch shipping email versturen
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create label')
      }

      const result = await response.json()
      
      setLabelSuccess(true)
      setLabelUrl(result.data.labelUrl)
      
      // Update local state
      setTrackingCode(result.data.trackingNumber)
      setTrackingUrl(result.data.trackingUrl)
      setCarrier(result.data.carrier)

      // Refresh order data
      await fetchOrder()
      await fetchStatusHistory()

      alert('✅ Label aangemaakt en klant gemaild!')

      // Open label in new tab
      if (result.data.labelUrl) {
        window.open(result.data.labelUrl, '_blank')
      }
    } catch (err: any) {
      alert(`Fout bij aanmaken label: ${err.message}`)
    } finally {
      setCreatingLabel(false)
    }
  }

  const startEditingCustomer = () => {
    if (!order) return
    const sa = typeof order.shipping_address === 'object' ? order.shipping_address : {}
    const ba = typeof order.billing_address === 'object' ? order.billing_address : {}
    setCustomerEmail(order.email || '')
    setShippingName(sa?.name || '')
    setShippingAddress(sa?.address || '')
    setShippingHouseNumber(sa?.houseNumber || '')
    setShippingAddition(sa?.addition || '')
    setShippingPostalCode(sa?.postalCode || '')
    setShippingCity(sa?.city || '')
    setShippingCountry(sa?.country || 'NL')
    setShippingPhone(sa?.phone || '')
    setBillingName(ba?.name || '')
    setBillingAddress(ba?.address || '')
    setBillingHouseNumber(ba?.houseNumber || '')
    setBillingAddition(ba?.addition || '')
    setBillingPostalCode(ba?.postalCode || '')
    setBillingCity(ba?.city || '')
    setBillingCountry(ba?.country || '')
    setEditingCustomer(true)
  }

  const handleSaveCustomerInfo = async () => {
    if (!order) return
    try {
      setSavingCustomer(true)
      const newShippingAddress = {
        name: shippingName,
        address: shippingAddress,
        houseNumber: shippingHouseNumber,
        addition: shippingAddition,
        postalCode: shippingPostalCode,
        city: shippingCity,
        country: shippingCountry || 'NL',
        phone: shippingPhone,
      }
      const hasBilling = billingName || billingAddress || billingCity || billingPostalCode
      const newBillingAddress = hasBilling ? {
        name: billingName,
        address: billingAddress,
        houseNumber: billingHouseNumber,
        addition: billingAddition,
        postalCode: billingPostalCode,
        city: billingCity,
        country: billingCountry || 'NL',
      } : null

      const { error } = await supabase
        .from('orders')
        .update({
          email: customerEmail,
          shipping_address: newShippingAddress,
          billing_address: newBillingAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      await fetchOrder()
      setEditingCustomer(false)
      alert('✅ Klantgegevens opgeslagen!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleClearShippingAddress = async () => {
    if (!order) return
    if (!confirm('Weet je zeker dat je het verzendadres wilt verwijderen?')) return
    try {
      setSavingCustomer(true)
      const { error } = await supabase
        .from('orders')
        .update({ shipping_address: null, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await fetchOrder()
      setEditingCustomer(false)
      alert('✅ Verzendadres verwijderd!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleClearBillingAddress = async () => {
    if (!order) return
    if (!confirm('Weet je zeker dat je het factuuradres wilt verwijderen?')) return
    try {
      setSavingCustomer(true)
      const { error } = await supabase
        .from('orders')
        .update({ billing_address: null, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await fetchOrder()
      setEditingCustomer(false)
      alert('✅ Factuuradres verwijderd!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleClearEmail = async () => {
    if (!order) return
    if (!confirm('Weet je zeker dat je het e-mailadres wilt verwijderen? Dit kan invloed hebben op communicatie met de klant.')) return
    try {
      setSavingCustomer(true)
      const { error } = await supabase
        .from('orders')
        .update({ email: '', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await fetchOrder()
      setEditingCustomer(false)
      alert('✅ E-mailadres verwijderd!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setSavingCustomer(false)
    }
  }

  const startEditingItems = async () => {
    setEditedItems(orderItems.map(item => ({ ...item })))
    setEditingItems(true)
    setAddingProduct(false)
    setSelectedProductId('')
    setSelectedVariantId('')
    setAddQuantity(1)

    const { data: products } = await supabase
      .from('products')
      .select('id, name, base_price, sale_price, product_images(url, is_primary, color, media_type)')
      .eq('is_active', true)
      .order('name')
    if (products) setAvailableProducts(products)

    const { data: variants } = await supabase
      .from('product_variants')
      .select('id, product_id, size, color, color_hex, sku, stock_quantity, price_adjustment, is_available')
      .eq('is_available', true)
    if (variants) setAvailableVariants(variants)
  }

  const handleUpdateItemQuantity = (itemId: string, delta: number) => {
    setEditedItems(prev => prev.map(item => {
      if (item.id !== itemId) return item
      const newQty = Math.max(1, item.quantity + delta)
      return { ...item, quantity: newQty }
    }))
  }

  const handleUpdateItemPrice = (itemId: string, newPrice: number) => {
    setEditedItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, price_at_purchase: Math.max(0, newPrice) } : item
    ))
  }

  const handleDeleteItem = (itemId: string) => {
    if (editedItems.length <= 1) {
      alert('Een order moet minimaal 1 product bevatten.')
      return
    }
    setEditedItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleAddItemToOrder = () => {
    if (!selectedProductId || !selectedVariantId) return
    const product = availableProducts.find(p => p.id === selectedProductId)
    const variant = availableVariants.find(v => v.id === selectedVariantId)
    if (!product || !variant) return

    const existing = editedItems.find(i => i.variant_id === variant.id)
    if (existing) {
      setEditedItems(prev => prev.map(item =>
        item.variant_id === variant.id
          ? { ...item, quantity: item.quantity + addQuantity }
          : item
      ))
    } else {
      const imgs = product.product_images?.filter(img => img.media_type !== 'video') || []
      const colorImg = imgs.find(img => img.color === variant.color)
      const primaryImg = imgs.find(img => img.is_primary)
      const imageUrl = colorImg?.url || primaryImg?.url || imgs[0]?.url || null
      const price = (product.sale_price ?? product.base_price) + (variant.price_adjustment || 0)

      setEditedItems(prev => [
        ...prev,
        {
          id: `new-${Date.now()}`,
          product_id: product.id,
          product_name: product.name,
          variant_id: variant.id,
          quantity: addQuantity,
          price_at_purchase: price,
          original_price: price,
          quantity_discount_amount: 0,
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
          image_url: imageUrl,
        },
      ])
    }

    setSelectedProductId('')
    setSelectedVariantId('')
    setAddQuantity(1)
    setAddingProduct(false)
  }

  const handleSaveItems = async () => {
    if (!order || editedItems.length === 0) return
    try {
      setSavingItems(true)

      const originalIds = new Set(orderItems.map(i => i.id))
      const editedIds = new Set(editedItems.map(i => i.id))

      const toDelete = orderItems.filter(i => !editedIds.has(i.id))
      const toUpdate = editedItems.filter(i => originalIds.has(i.id))
      const toInsert = editedItems.filter(i => i.id.startsWith('new-'))

      for (const item of toDelete) {
        const { error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', item.id)
        if (error) throw error
      }

      for (const item of toUpdate) {
        const original = orderItems.find(i => i.id === item.id)
        if (original && (original.quantity !== item.quantity || original.price_at_purchase !== item.price_at_purchase)) {
          const { error } = await supabase
            .from('order_items')
            .update({
              quantity: item.quantity,
              price_at_purchase: item.price_at_purchase,
              subtotal: item.price_at_purchase * item.quantity,
            })
            .eq('id', item.id)
          if (error) throw error
        }
      }

      for (const item of toInsert) {
        const { error } = await supabase
          .from('order_items')
          .insert([{
            order_id: id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name: item.product_name,
            quantity: item.quantity,
            price_at_purchase: item.price_at_purchase,
            original_price: item.original_price,
            quantity_discount_amount: item.quantity_discount_amount,
            subtotal: item.price_at_purchase * item.quantity,
            size: item.size,
            color: item.color,
            sku: item.sku,
            image_url: item.image_url,
          }])
        if (error) throw error
      }

      const newSubtotal = editedItems.reduce((sum, i) => sum + (i.price_at_purchase * i.quantity), 0)
      const shippingCost = order.shipping_cost || 0
      const newTotal = newSubtotal + shippingCost
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ subtotal: newSubtotal, total: newTotal, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (orderErr) throw orderErr

      await fetchOrder()
      await fetchOrderItems()
      setEditingItems(false)
      alert('✅ Producten bijgewerkt!')
    } catch (err: any) {
      alert(`Fout: ${err.message}`)
    } finally {
      setSavingItems(false)
    }
  }

  const editedSubtotal = editedItems.reduce((sum, i) => sum + (i.price_at_purchase * i.quantity), 0)
  const editedTotal = editedSubtotal + (order?.shipping_cost || 0)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      paid: 'bg-blue-100 text-blue-700 border-blue-200',
      processing: 'bg-purple-100 text-purple-700 border-purple-200',
      shipped: 'bg-orange-100 text-orange-700 border-orange-200',
      delivered: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200',
      return_requested: 'bg-amber-100 text-amber-700 border-amber-200',
      returned: 'bg-gray-100 text-gray-700 border-gray-200',
      refunded: 'bg-pink-100 text-pink-700 border-pink-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'paid':
        return <Clock className="w-5 h-5" />
      case 'processing':
        return <Package className="w-5 h-5" />
      case 'shipped':
        return <Truck className="w-5 h-5" />
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5" />
      case 'cancelled':
      case 'return_requested':
      case 'returned':
        return <XCircle className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'In afwachting',
      paid: 'Betaald',
      processing: 'In behandeling',
      shipped: 'Verzonden',
      delivered: 'Afgeleverd',
      cancelled: 'Geannuleerd',
      return_requested: 'Retour aangevraagd',
      returned: 'Geretourneerd',
      refunded: 'Terugbetaald',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Order niet gevonden</p>
        <Link href="/admin/orders" className="text-brand-primary font-semibold mt-4 inline-block">
          Terug naar orders
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <Link
            href="/admin/orders"
            className="p-2 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">
              Order #{order.id.slice(0, 8)}
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Geplaatst op {new Date(order.created_at).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-stretch sm:items-center gap-2 shrink-0 lg:pt-1">
          <Link
            href={`/admin/returns/new?orderId=${encodeURIComponent(order.id)}`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-brand-primary text-brand-primary font-bold uppercase text-xs sm:text-sm hover:bg-brand-primary hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />
            Retour aanmaken
          </Link>
          <span className={`px-4 py-2 text-sm font-semibold border-2 flex items-center justify-center gap-2 ${getStatusColor(order.status)}`}>
            {getStatusIcon(order.status)}
            {getStatusLabel(order.status).toUpperCase()}
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Last Email Info */}
      {order.last_email_sent_at && (
        <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded flex items-center gap-3">
          <Mail className="w-5 h-5 text-blue-600" />
          <div className="text-sm">
            <strong>Laatste email:</strong> {order.last_email_type} verzonden op {' '}
            {new Date(order.last_email_sent_at).toLocaleString('nl-NL')}
          </div>
        </div>
      )}

      {/* Trustpilot Review Invitation Status */}
      {order.payment_status === 'paid' && (
        <div
          className={`border-2 p-4 rounded flex flex-col sm:flex-row sm:items-center gap-3 ${
            order.review_invitation_sent_at
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <CheckCircle2
              className={`w-5 h-5 shrink-0 ${
                order.review_invitation_sent_at ? 'text-green-600' : 'text-amber-600'
              }`}
            />
            <div className="text-sm">
              <strong>Trustpilot review invitation:</strong>{' '}
              {order.review_invitation_sent_at ? (
                <>
                  verstuurd op{' '}
                  {new Date(order.review_invitation_sent_at).toLocaleString('nl-NL')}
                </>
              ) : order.status === 'delivered' ? (
                <>nog niet verstuurd</>
              ) : (
                <>wordt automatisch verstuurd zodra de bestelling &quot;delivered&quot; is</>
              )}
              {order.delivered_at && (
                <span className="block text-xs text-gray-600 mt-0.5">
                  Pakket afgeleverd op{' '}
                  {new Date(order.delivered_at).toLocaleString('nl-NL')}
                </span>
              )}
            </div>
          </div>
          {order.status === 'delivered' && (
            <button
              onClick={() => handleResendReviewInvitation(Boolean(order.review_invitation_sent_at))}
              disabled={sendingEmail}
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 border-current hover:bg-current hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {order.review_invitation_sent_at ? 'Opnieuw versturen' : 'Nu versturen'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Items & Customer Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Bestelde Producten</h2>
              {!editingItems ? (
                <button
                  onClick={startEditingItems}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-brand-primary hover:bg-brand-primary hover:text-white border-2 border-brand-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Bewerken
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditingItems(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 border-2 border-gray-300 transition-colors">
                    <X className="w-3.5 h-3.5" />
                    Annuleren
                  </button>
                  <button onClick={handleSaveItems} disabled={savingItems}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-brand-primary hover:bg-brand-primary-hover border-2 border-brand-primary transition-colors disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" />
                    {savingItems ? 'Opslaan...' : 'Opslaan'}
                  </button>
                </div>
              )}
            </div>

            {!editingItems ? (
              <>
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0">
                      <div className="relative w-20 h-24 bg-gray-100 flex-shrink-0 border border-gray-200">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.product_name || 'Product'}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm md:text-base">
                          {item.product_name || `Product ${item.product_id?.slice(0, 8)}`}
                        </div>
                        <div className="text-xs md:text-sm text-gray-600">
                          {item.size && `Maat: ${item.size}`} {item.color && `• Kleur: ${item.color}`}
                        </div>
                        {item.sku && (
                          <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                            {item.sku}
                          </code>
                        )}
                      </div>
                      <div className="text-right">
                        {item.quantity_discount_amount && item.quantity_discount_amount > 0 && item.original_price ? (
                          <>
                            <div className="text-xs text-gray-400 line-through">€{Number(item.original_price).toFixed(2)}</div>
                            <div className="font-bold text-sm md:text-base">€{Number(item.price_at_purchase).toFixed(2)}</div>
                            <div className="text-[10px] text-gray-500 font-semibold">
                              <span className="inline-flex items-center px-1 py-0.5 bg-gray-100 text-gray-600">
                                Staffelkorting -€{Number(item.quantity_discount_amount).toFixed(2)}/stuk
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="font-bold text-sm md:text-base">€{Number(item.price_at_purchase).toFixed(2)}</div>
                        )}
                        <div className="text-xs md:text-sm text-gray-600">Aantal: {item.quantity}</div>
                        <div className="text-xs md:text-sm font-semibold text-brand-primary mt-1">
                          €{(Number(item.price_at_purchase) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t-2 border-gray-200 space-y-2">
                  {(order.shipping_cost || 0) > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotaal</span>
                        <span className="font-semibold">€{(Number(order.subtotal || 0) || (Number(order.total) - Number(order.shipping_cost || 0))).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Verzendkosten</span>
                        <span className="font-semibold">€{Number(order.shipping_cost).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Waarvan BTW (21%)</span>
                    <span className="text-gray-500">€{(Number(order.total) - Number(order.total) / 1.21).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-lg font-bold">Totaal (incl. BTW)</span>
                    <span className="text-2xl md:text-3xl font-bold text-brand-primary">
                      €{Number(order.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  {editedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-gray-200 last:border-0">
                      <div className="relative w-14 h-16 bg-gray-100 flex-shrink-0 border border-gray-200">
                        {item.image_url ? (
                          <Image src={item.image_url} alt="" fill className="object-cover" sizes="56px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{item.product_name}</div>
                        <div className="text-xs text-gray-500">{item.size} / {item.color}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-gray-500">€</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={item.price_at_purchase}
                            onChange={e => handleUpdateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20 px-1.5 py-0.5 border border-gray-300 focus:border-brand-primary focus:outline-none text-xs font-medium"
                          />
                          <span className="text-xs text-gray-400">p/s</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button" onClick={() => handleUpdateItemQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 flex items-center justify-center border border-gray-300 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => handleUpdateItemQuantity(item.id, 1)}
                          className="w-7 h-7 flex items-center justify-center border border-gray-300 hover:bg-gray-100 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-right text-sm font-semibold w-16 flex-shrink-0">
                        €{(item.price_at_purchase * item.quantity).toFixed(2)}
                      </div>
                      <button type="button" onClick={() => handleDeleteItem(item.id)}
                        className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {!addingProduct ? (
                  <button onClick={() => setAddingProduct(true)}
                    className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-primary hover:underline">
                    <Plus className="w-4 h-4" /> Product toevoegen
                  </button>
                ) : (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    <div className="text-sm font-semibold text-gray-700">Product toevoegen</div>
                    <select value={selectedProductId}
                      onChange={e => { setSelectedProductId(e.target.value); setSelectedVariantId('') }}
                      className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm bg-white">
                      <option value="">— Kies product —</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} — €{(p.sale_price ?? p.base_price).toFixed(2)}</option>
                      ))}
                    </select>
                    {selectedProductId && (
                      <select value={selectedVariantId} onChange={e => setSelectedVariantId(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm bg-white">
                        <option value="">— Kies variant —</option>
                        {availableVariants
                          .filter(v => v.product_id === selectedProductId)
                          .map(v => (
                            <option key={v.id} value={v.id}>{v.size} / {v.color} (voorraad: {v.stock_quantity})</option>
                          ))}
                      </select>
                    )}
                    {selectedVariantId && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Aantal:</label>
                        <input type="number" min={1} value={addQuantity} onChange={e => setAddQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-20 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={handleAddItemToOrder} disabled={!selectedVariantId}
                        className="px-4 py-2 text-sm font-semibold bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        Toevoegen
                      </button>
                      <button onClick={() => { setAddingProduct(false); setSelectedProductId(''); setSelectedVariantId('') }}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-300 hover:bg-gray-100 transition-colors">
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t-2 border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotaal producten</span>
                    <span className="font-semibold">€{editedSubtotal.toFixed(2)}</span>
                  </div>
                  {(order.shipping_cost || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Verzendkosten</span>
                      <span className="font-semibold">€{Number(order.shipping_cost).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Waarvan BTW (21%)</span>
                    <span className="text-gray-500">€{(editedTotal - editedTotal / 1.21).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-lg font-bold">Nieuw totaal</span>
                    <span className="text-2xl md:text-3xl font-bold text-brand-primary">
                      €{editedTotal.toFixed(2)}
                    </span>
                  </div>
                  {editedTotal !== Number(order.total) && (
                    <div className="text-xs text-amber-600 font-medium">
                      Verschil: {editedTotal > Number(order.total) ? '+' : ''}€{(editedTotal - Number(order.total)).toFixed(2)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Klantinformatie</h2>
              {!editingCustomer ? (
                <button
                  onClick={startEditingCustomer}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-brand-primary hover:bg-brand-primary hover:text-white border-2 border-brand-primary transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Bewerken
                </button>
              ) : (
                <button
                  onClick={() => setEditingCustomer(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 border-2 border-gray-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Annuleren
                </button>
              )}
            </div>

            {!editingCustomer ? (
              /* --- VIEW MODE --- */
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Email</span>
                  <div className="text-sm md:text-base mt-1">{order.email || <span className="text-gray-400 italic">Geen email</span>}</div>
                </div>

                {order.shipping_address && typeof order.shipping_address === 'object' && (
                  <div>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Verzendadres</span>
                    <div className="text-sm md:text-base mt-1 text-gray-700">
                      <div>{order.shipping_address.name || 'N/A'}</div>
                      <div>
                        {order.shipping_address.address || 'N/A'}
                        {order.shipping_address.houseNumber && ` ${order.shipping_address.houseNumber}`}
                        {order.shipping_address.addition && ` ${order.shipping_address.addition}`}
                      </div>
                      <div>{order.shipping_address.postalCode || 'N/A'}, {order.shipping_address.city || 'N/A'}</div>
                      <div>{displayCountry(order.shipping_address.country)}</div>
                      {order.shipping_address.phone && (
                        <div className="mt-1 text-gray-600">Tel: {order.shipping_address.phone}</div>
                      )}
                    </div>
                  </div>
                )}

                {order.billing_address && typeof order.billing_address === 'object' && (
                  <div>
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Factuuradres</span>
                    <div className="text-sm md:text-base mt-1 text-gray-700">
                      <div>{order.billing_address.name || 'N/A'}</div>
                      <div>
                        {order.billing_address.address || 'N/A'}
                        {order.billing_address.houseNumber && ` ${order.billing_address.houseNumber}`}
                        {order.billing_address.addition && ` ${order.billing_address.addition}`}
                      </div>
                      <div>{order.billing_address.postalCode || 'N/A'}, {order.billing_address.city || 'N/A'}</div>
                      <div>{displayCountry(order.billing_address.country)}</div>
                    </div>
                  </div>
                )}

                <div>
                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Levermethode</span>
                  <div className="text-sm md:text-base mt-1 text-gray-700">
                    {order.delivery_method === 'pickup' ? (
                      <>
                        <div className="font-semibold text-green-700">Afhalen in Groningen</div>
                        <div>{order.pickup_location_name || 'MOSE Groningen'}</div>
                        <div>{order.pickup_location_address || 'Stavangerweg 13, 9723 JC Groningen'}</div>
                        {typeof order.pickup_distance_km === 'number' && (
                          <div className="text-xs text-gray-500 mt-1">Afstand klant: {order.pickup_distance_km.toFixed(1)} km</div>
                        )}
                      </>
                    ) : (
                      <div className="font-semibold">Verzending</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* --- EDIT MODE --- */
              <div className="space-y-5">
                {/* Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Email</label>
                    <button onClick={handleClearEmail} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Verwijderen
                    </button>
                  </div>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                    placeholder="klant@voorbeeld.nl"
                  />
                </div>

                {/* Verzendadres */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Verzendadres</span>
                    <button onClick={handleClearShippingAddress} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Verwijderen
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Naam</label>
                      <input type="text" value={shippingName} onChange={(e) => setShippingName(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Volledige naam" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Straat</label>
                      <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Straatnaam" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Huisnr.</label>
                        <input type="text" value={shippingHouseNumber} onChange={(e) => setShippingHouseNumber(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Nr." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Toev.</label>
                        <input type="text" value={shippingAddition} onChange={(e) => setShippingAddition(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="A, B..." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Postcode</label>
                      <input type="text" value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="1234 AB" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Plaats</label>
                      <input type="text" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Stad" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Land</label>
                      <select value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm bg-white">
                        <option value="NL">Nederland</option>
                        <option value="BE">België</option>
                        <option value="DE">Duitsland</option>
                        <option value="FR">Frankrijk</option>
                        <option value="LU">Luxemburg</option>
                        <option value="GB">Verenigd Koninkrijk</option>
                        <option value="AT">Oostenrijk</option>
                        <option value="ES">Spanje</option>
                        <option value="IT">Italië</option>
                        <option value="PT">Portugal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Telefoon</label>
                      <input type="tel" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="+31 6 12345678" />
                    </div>
                  </div>
                </div>

                {/* Factuuradres */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Factuuradres</span>
                    {(billingName || billingAddress || billingCity) && (
                      <button onClick={handleClearBillingAddress} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Verwijderen
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Laat leeg als hetzelfde als verzendadres</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Naam</label>
                      <input type="text" value={billingName} onChange={(e) => setBillingName(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Factuurnaam" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Straat</label>
                      <input type="text" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Straatnaam" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Huisnr.</label>
                        <input type="text" value={billingHouseNumber} onChange={(e) => setBillingHouseNumber(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Nr." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Toev.</label>
                        <input type="text" value={billingAddition} onChange={(e) => setBillingAddition(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="A, B..." />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Postcode</label>
                      <input type="text" value={billingPostalCode} onChange={(e) => setBillingPostalCode(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="1234 AB" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Plaats</label>
                      <input type="text" value={billingCity} onChange={(e) => setBillingCity(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm" placeholder="Stad" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Land</label>
                      <select value={billingCountry} onChange={(e) => setBillingCountry(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm bg-white">
                        <option value="">— Selecteer —</option>
                        <option value="NL">Nederland</option>
                        <option value="BE">België</option>
                        <option value="DE">Duitsland</option>
                        <option value="FR">Frankrijk</option>
                        <option value="LU">Luxemburg</option>
                        <option value="GB">Verenigd Koninkrijk</option>
                        <option value="AT">Oostenrijk</option>
                        <option value="ES">Spanje</option>
                        <option value="IT">Italië</option>
                        <option value="PT">Portugal</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={handleSaveCustomerInfo}
                    disabled={savingCustomer}
                    className="flex-1 bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savingCustomer ? 'Opslaan...' : 'Klantgegevens Opslaan'}
                  </button>
                  <button
                    onClick={() => setEditingCustomer(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Returns Information */}
          {returns.length > 0 && (
            <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold">Retouren</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/admin/returns/new?orderId=${encodeURIComponent(order.id)}`}
                    className="text-sm font-bold text-brand-primary hover:underline whitespace-nowrap"
                  >
                    + Nieuwe retour
                  </Link>
                  <button
                    onClick={fetchReturns}
                    disabled={refreshingReturns}
                    className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors disabled:opacity-50"
                    title="Ververs retour statuses"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshingReturns ? 'animate-spin' : ''}`} />
                    {refreshingReturns ? 'Bezig...' : 'Ververs'}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {returns.map((returnItem) => (
                  <div key={returnItem.id} className="border-2 border-gray-200 p-4 rounded">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Link 
                          href={`/admin/returns/${returnItem.id}`}
                          className="font-bold text-brand-primary hover:underline"
                        >
                          Retour #{returnItem.id.slice(0, 8).toUpperCase()}
                        </Link>
                        <div className="text-xs text-gray-600 mt-1">
                          Aangevraagd: {new Date(returnItem.created_at).toLocaleDateString('nl-NL')}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold border ${
                        returnItem.status === 'return_label_payment_pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        returnItem.status === 'return_label_payment_completed' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                        returnItem.status === 'return_label_generated' ? 'bg-green-100 text-green-700 border-green-200' :
                        returnItem.status === 'return_received' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                        returnItem.status === 'return_approved' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        returnItem.status === 'refunded' ? 'bg-gray-800 text-white border-gray-900' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {returnItem.status === 'return_label_payment_pending' && '⏳ Betaling Label'}
                        {returnItem.status === 'return_label_payment_completed' && '✓ Label Betaald'}
                        {returnItem.status === 'return_label_generated' && '✓ Label Beschikbaar'}
                        {returnItem.status === 'return_received' && '📦 Ontvangen'}
                        {returnItem.status === 'return_approved' && '✓ Goedgekeurd'}
                        {returnItem.status === 'refunded' && '✓ Terugbetaald'}
                        {!['return_label_payment_pending', 'return_label_payment_completed', 'return_label_generated', 'return_received', 'return_approved', 'refunded'].includes(returnItem.status) && returnItem.status}
                      </span>
                    </div>
                    {returnItem.return_label_payment_status && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            returnItem.return_label_payment_status === 'completed' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {returnItem.return_label_payment_status === 'completed' ? '✓ Label betaald' : '⏳ Label betaling wachtend'}
                          </span>
                          {returnItem.return_label_paid_at && (
                            <span className="text-gray-600">
                              op {new Date(returnItem.return_label_paid_at).toLocaleDateString('nl-NL')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              💳 Betalingsinformatie
            </h2>
            <div className="space-y-4">
              {/* Payment Status Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Status</span>
                <span className={`px-3 py-1.5 text-sm font-bold border-2 inline-block ${
                  order.payment_status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                  order.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                  order.payment_status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                  order.payment_status === 'refunded' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                  order.payment_status === 'expired' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}>
                  {order.payment_status === 'paid' && '✓ Betaald'}
                  {order.payment_status === 'unpaid' && '○ Onbetaald'}
                  {order.payment_status === 'pending' && '⏳ Wacht op betaling'}
                  {order.payment_status === 'failed' && '✕ Betaling mislukt'}
                  {order.payment_status === 'refunded' && '↩ Terugbetaald'}
                  {order.payment_status === 'expired' && '⌛ Verlopen'}
                  {!order.payment_status && '○ Onbekend'}
                </span>
              </div>

              {/* Payment Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {order.paid_at && (
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                      Betaald op
                    </span>
                    <div className="text-sm text-gray-900">
                      {new Date(order.paid_at).toLocaleString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}

                {order.checkout_started_at && (
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                      Checkout gestart
                    </span>
                    <div className="text-sm text-gray-900">
                      {new Date(order.checkout_started_at).toLocaleString('nl-NL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                )}

                {order.payment_method && (
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                      Betaalmethode
                    </span>
                    <div className="text-sm text-gray-900 capitalize">
                      {order.payment_method === 'card' && '💳 Creditcard'}
                      {order.payment_method === 'ideal' && '🏦 iDEAL'}
                      {order.payment_method === 'paypal' && '💙 PayPal'}
                      {!['card', 'ideal', 'paypal'].includes(order.payment_method) && order.payment_method}
                    </div>
                  </div>
                )}

                {order.stripe_payment_intent_id && (
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-1">
                      Stripe Payment Intent
                    </span>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block break-all">
                      {order.stripe_payment_intent_id}
                    </code>
                  </div>
                )}
              </div>

              {/* Payment Metadata */}
              {order.payment_metadata && Object.keys(order.payment_metadata).length > 0 && (
                <div className="pt-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block mb-2">
                    Payment Metadata
                  </span>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-1">
                    {Object.entries(order.payment_metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-600 font-mono">{key}:</span>
                        <span className="text-gray-900 font-mono">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversion Time */}
              {order.checkout_started_at && order.paid_at && (
                <div className="bg-blue-50 border-l-3 border-blue-400 p-3 mt-3">
                  <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
                    ⚡ Conversie Tijd
                  </div>
                  <div className="text-sm text-blue-900">
                    {(() => {
                      const start = new Date(order.checkout_started_at).getTime()
                      const end = new Date(order.paid_at).getTime()
                      const diffMinutes = Math.round((end - start) / 1000 / 60)
                      if (diffMinutes < 1) return 'Minder dan 1 minuut'
                      if (diffMinutes < 60) return `${diffMinutes} minuten`
                      const diffHours = Math.floor(diffMinutes / 60)
                      const remainingMinutes = diffMinutes % 60
                      return `${diffHours}u ${remainingMinutes}m`
                    })()}
                  </div>
                </div>
              )}

              {/* Unpaid Warning */}
              {order.payment_status !== 'paid' && order.payment_status !== 'refunded' && (
                <div className="bg-yellow-50 border-l-3 border-yellow-400 p-3 mt-3">
                  <div className="text-xs font-bold text-yellow-800 uppercase tracking-wide mb-1">
                    ⚠️ Let Op
                  </div>
                  <div className="text-sm text-yellow-900">
                    Deze order is nog niet betaald. Verzend alleen als betaling is ontvangen.
                  </div>
                </div>
              )}

              {/* Stripe Dashboard Link */}
              {order.stripe_payment_intent_id && (
                <div className="pt-2">
                  <a
                    href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors"
                  >
                    <span>Bekijk in Stripe Dashboard</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full flex items-center justify-between text-xl font-bold mb-4"
            >
              <span>Order Tijdlijn</span>
              {showTimeline ? <ChevronUp /> : <ChevronDown />}
            </button>
            
            {showTimeline && (
              <div className="space-y-4">
                {statusHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">Nog geen statuswijzigingen</p>
                ) : (
                  statusHistory.map((history, index) => (
                    <div key={history.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {getStatusIcon(history.new_status)}
                        </div>
                        {index < statusHistory.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="font-semibold">
                          {history.old_status && `${getStatusLabel(history.old_status)} → `}
                          {getStatusLabel(history.new_status)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(history.changed_at).toLocaleString('nl-NL')}
                        </div>
                        {history.email_sent && (
                          <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            Email verzonden
                          </div>
                        )}
                        {history.notes && (
                          <div className="text-sm text-gray-500 mt-1 italic">{history.notes}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order Management */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Status Bijwerken</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Nieuwe Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors"
                >
                  <option value="pending">In afwachting</option>
                  <option value="paid">Betaald</option>
                  <option value="processing">In behandeling</option>
                  <option value="shipped">Verzonden</option>
                  <option value="delivered">Afgeleverd</option>
                  <option value="cancelled">Geannuleerd</option>
                  <option value="return_requested">Retour aangevraagd</option>
                  <option value="returned">Geretourneerd</option>
                  <option value="refunded">Terugbetaald</option>
                </select>
              </div>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sendEmailOnStatusChange}
                  onChange={(e) => setSendEmailOnStatusChange(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>Email klant automatisch versturen</span>
              </label>

              <button
                onClick={handleUpdateStatus}
                disabled={updating || newStatus === order.status}
                className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Bijwerken...' : 'Status Bijwerken'}
              </button>
            </div>
          </div>

          {/* Verzending - Stapsgewijze Flow */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">📦 Verzending</h2>
            {order.delivery_method === 'pickup' ? (
              <div className="bg-green-50 border-2 border-green-300 p-4 rounded text-sm text-green-900">
                Deze order is gekozen als afhalen in Groningen. Verzendlabel en track & trace zijn niet nodig.
              </div>
            ) : (
              <>
            {/* Als er nog geen tracking is */}
            {!order.tracking_code ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  Kies hoe je het pakket wilt verzenden:
                </p>

                {/* Optie 1: Automatisch via Sendcloud (AANBEVOLEN) */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-400 p-4 rounded-lg relative">
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 uppercase rounded">
                    Aanbevolen
                  </div>
                  
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-blue-500 text-white rounded">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Automatisch Label (Sendcloud + DHL)</h3>
                      <p className="text-xs text-gray-700 mt-1">
                        Eén klik = label, tracking, en email automatisch geregeld
                      </p>
                    </div>
                  </div>

                  {labelSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-800 px-3 py-2 rounded mb-3 flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <div className="flex-1">
                        Label aangemaakt! {trackingCode}
                      </div>
                      {labelUrl && (
                        <a
                          href={labelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 text-xs font-bold uppercase transition-colors rounded"
                        >
                          <Printer size={14} />
                          Print
                        </a>
                      )}
                    </div>
                  )}

                  <ul className="text-xs text-gray-700 space-y-1 mb-3 ml-11">
                    <li>✅ Label direct printen (PDF)</li>
                    <li>✅ Tracking automatisch toegevoegd</li>
                    <li>✅ Klant krijgt verzend-email</li>
                    <li>💰 €4,50 • 1-2 werkdagen levering</li>
                  </ul>

                  <button
                    onClick={handleCreateLabel}
                    disabled={creatingLabel}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creatingLabel ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Bezig...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5" />
                        Maak DHL Label
                      </>
                    )}
                  </button>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Of</span>
                  </div>
                </div>

                {/* Optie 2: Handmatig Invoeren */}
                <details className="bg-gray-50 border border-gray-300 p-4 rounded-lg">
                  <summary className="font-bold text-sm cursor-pointer flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Handmatig Tracking Invoeren
                    <span className="text-xs text-gray-500 font-normal ml-auto">
                      (Voor andere vervoerders)
                    </span>
                  </summary>
                  
                  <div className="mt-4 space-y-3">
                    <p className="text-xs text-gray-600">
                      Gebruik dit als je het label via een andere manier hebt aangemaakt (bijv. PostNL website, eigen account).
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        Vervoerder
                      </label>
                      <select
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                      >
                        <option value="">Selecteer...</option>
                        {carrierOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        Tracking Code
                      </label>
                      <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-mono text-sm"
                        placeholder="3SMOSE123456789"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        Tracking URL
                      </label>
                      <input
                        type="url"
                        value={trackingUrl}
                        onChange={(e) => setTrackingUrl(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                        placeholder="https://..."
                      />
                      <button
                        onClick={handleAutoGenerateUrl}
                        disabled={!carrier || !trackingCode}
                        className="mt-1 text-xs text-brand-primary hover:underline disabled:text-gray-400 disabled:no-underline"
                      >
                        ✨ Auto-genereer URL
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-200">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={autoUpdateToShipped}
                          onChange={(e) => setAutoUpdateToShipped(e.target.checked)}
                          className="w-3 h-3"
                        />
                        <span>Status naar "Verzonden"</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={sendEmailOnStatusChange}
                          onChange={(e) => setSendEmailOnStatusChange(e.target.checked)}
                          className="w-3 h-3"
                        />
                        <span>Verzend-email versturen</span>
                      </label>
                    </div>

                    <button
                      onClick={handleUpdateTracking}
                      disabled={updating || !trackingCode}
                      className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {updating ? 'Opslaan...' : 'Tracking Opslaan'}
                    </button>
                  </div>
                </details>
              </div>
            ) : (
              /* Als tracking al bestaat - Toon info + opties */
              <div className="space-y-4">
                <div className="bg-green-50 border-2 border-green-400 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-green-900">Verzending Actief</div>
                      <div className="text-sm text-green-800 mt-1 space-y-1">
                        <div><strong>Vervoerder:</strong> {carrier || 'Niet ingesteld'}</div>
                        <div><strong>Tracking:</strong> <code className="bg-green-100 px-2 py-0.5 rounded text-xs">{trackingCode}</code></div>
                        {trackingUrl && (
                          <div>
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                            >
                              <Truck size={14} />
                              Track pakket →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Opties als tracking al bestaat */}
                <details className="bg-gray-50 border border-gray-300 p-3 rounded text-sm">
                  <summary className="font-bold cursor-pointer text-xs uppercase text-gray-700">
                    Tracking Aanpassen
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                        Tracking Code
                      </label>
                      <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 focus:border-brand-primary focus:outline-none transition-colors font-mono text-sm"
                      />
                    </div>
                    <button
                      onClick={handleUpdateTracking}
                      disabled={updating}
                      className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 uppercase tracking-wider transition-colors disabled:opacity-50 text-xs"
                    >
                      {updating ? 'Opslaan...' : 'Bijwerken'}
                    </button>
                  </div>
                </details>

                {/* Print Label knop als label beschikbaar is */}
                {order.label_url && (
                  <a
                    href={`/api/get-label-pdf?order_id=${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 uppercase tracking-wider transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Printer size={18} />
                    Print Verzendlabel
                  </a>
                )}

                {/* Helper message als label ontbreekt maar tracking wel bestaat */}
                {!order.label_url && trackingCode && (
                  <div className="bg-yellow-50 border border-yellow-300 p-3 rounded text-xs">
                    <p className="font-bold text-yellow-800 mb-1">💡 Label printen niet beschikbaar</p>
                    <p className="text-yellow-700">
                      Dit label is aangemaakt voor de print functie bestond. 
                      Verwijder de tracking code en maak een nieuw label aan om de print functie te gebruiken.
                    </p>
                  </div>
                )}

                {/* Handmatig email versturen als nodig */}
                {trackingCode && order.status === 'shipped' && (
                  <button
                    onClick={handleSendShippingEmail}
                    disabled={sendingEmail}
                    className="w-full bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-4 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                  >
                    <Mail size={16} />
                    {sendingEmail ? 'Verzenden...' : 'Verzend Email (Opnieuw) Versturen'}
                  </button>
                )}
              </div>
            )}
              </>
            )}
          </div>

          {/* Admin Notes */}
          <div className="bg-white border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Admin Notities</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">
                  Interne Notities
                </label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-primary focus:outline-none transition-colors text-sm"
                  rows={4}
                  placeholder="Voeg interne notities toe (niet zichtbaar voor klant)..."
                />
              </div>
              <button
                onClick={handleUpdateNotes}
                disabled={updating}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Opslaan...' : 'Notities Opslaan'}
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-gray-100 border-2 border-gray-200 p-4 md:p-6">
            <h2 className="text-xl font-bold mb-4">Samenvatting</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <code className="text-xs bg-white px-2 py-1 rounded">{order.id.slice(0, 12)}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aangemaakt:</span>
                <span className="font-semibold">{new Date(order.created_at).toLocaleDateString('nl-NL')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Laatst bijgewerkt:</span>
                <span className="font-semibold">{new Date(order.updated_at).toLocaleDateString('nl-NL')}</span>
              </div>
              {order.estimated_delivery_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Verwachte levering:</span>
                  <span className="font-semibold text-brand-primary">
                    {new Date(order.estimated_delivery_date).toLocaleDateString('nl-NL')}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-300">
                <span className="text-gray-600">Totaal bedrag:</span>
                <span className="font-bold text-brand-primary">€{Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
