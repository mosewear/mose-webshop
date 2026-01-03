'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import { X, Minus, Plus, Trash2, Truck, Lock, RotateCcw, ShoppingBag, Ticket, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { getSiteSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/client'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount, addItem } = useCart()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [shippingCost, setShippingCost] = useState(0)
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(50)
  const [promoCodeExpanded, setPromoCodeExpanded] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [upsellProducts, setUpsellProducts] = useState<any[]>([])
  const [addingProduct, setAddingProduct] = useState<string | null>(null)

  const subtotal = getTotal()
  const subtotalAfterDiscount = subtotal - promoDiscount
  const shipping = subtotalAfterDiscount >= freeShippingThreshold ? 0 : shippingCost
  
  // BTW berekening (21% is al inbegrepen in de prijzen)
  const vatRate = 0.21
  const subtotalExclBtw = subtotalAfterDiscount / (1 + vatRate)
  const btwAmount = subtotalAfterDiscount - subtotalExclBtw
  const totalBtw = btwAmount + (shipping / (1 + vatRate) * vatRate)
  
  const total = subtotalAfterDiscount + shipping

  useEffect(() => {
    getSiteSettings().then((settings) => {
      setShippingCost(settings.shipping_cost)
      setFreeShippingThreshold(settings.free_shipping_threshold)
    })
  }, [])

  // Fetch upsell products
  useEffect(() => {
    if (!isOpen || items.length === 0) {
      setUpsellProducts([])
      return
    }

    const fetchUpsellProducts = async () => {
      const supabase = createClient()
      
      // Get product IDs already in cart
      const cartProductIds = items.map(item => item.productId)
      
      // Fetch 3 random products not in cart
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          slug,
          base_price,
          product_images!inner(url, is_primary),
          product_variants!inner(id, sku, stock_quantity)
        `)
        .not('id', 'in', `(${cartProductIds.join(',')})`)
        .gt('product_variants.stock_quantity', 0)
        .eq('product_images.is_primary', true)
        .limit(3)

      if (!error && data) {
        setUpsellProducts(data)
      }
    }

    fetchUpsellProducts()
  }, [isOpen, items])

  // Disable body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Handle promo code
  const handleApplyPromo = async () => {
    setPromoError('')
    
    try {
      const response = await fetch('/api/validate-promo-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode.toUpperCase(),
          orderTotal: subtotal,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        setPromoDiscount(data.discountAmount)
        setPromoCodeExpanded(false)
      } else {
        setPromoError(data.error || 'Code ongeldig')
        setPromoDiscount(0)
      }
    } catch (error) {
      console.error('Error validating promo code:', error)
      setPromoError('Kon code niet valideren')
      setPromoDiscount(0)
    }
  }

  const handleRemovePromo = () => {
    setPromoCode('')
    setPromoDiscount(0)
    setPromoError('')
  }

  // Handle quick add from upsell
  const handleQuickAdd = async (product: any) => {
    setAddingProduct(product.id)
    
    // Get first available variant
    const variant = product.product_variants[0]
    
    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      size: variant.size || 'M',
      color: variant.color || 'Zwart',
      colorHex: variant.color_hex || '#000000',
      price: product.base_price,
      quantity: 1,
      image: product.product_images[0]?.url || '/placeholder.png',
      sku: variant.sku,
      stock: variant.stock_quantity,
    })

    // Remove from upsell list
    setUpsellProducts(prev => prev.filter(p => p.id !== product.id))
    
    setTimeout(() => setAddingProduct(null), 1000)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full md:w-[520px] bg-white border-l-4 border-black z-50 flex flex-col animate-slideInRight"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b-2 border-black bg-white sticky top-0 z-10">
          <div>
            <h2 id="cart-drawer-title" className="font-display text-2xl md:text-3xl uppercase">
              Winkelwagen
            </h2>
            <p className="text-sm text-gray-600 uppercase tracking-wider mt-1">
              {getItemCount()} {getItemCount() === 1 ? 'Item' : 'Items'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
            aria-label="Sluit winkelwagen"
          >
            <X size={24} />
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 border-4 border-gray-300 flex items-center justify-center mb-6">
              <ShoppingBag size={40} className="text-gray-300" />
            </div>
            <h3 className="font-display text-2xl uppercase mb-2">Leeg</h3>
            <p className="text-gray-600 mb-6">Je winkelwagen is leeg</p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
            >
              Verder shoppen
            </button>
          </div>
        ) : (
          <>
            {/* Items Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pb-[280px] md:pb-[160px]">
              <div className="p-4 md:p-6 space-y-0">
                {items.map((item, index) => (
                  <div key={item.variantId}>
                    {index > 0 && <div className="border-t-2 border-gray-200" />}
                    
                    <div className="py-4 md:py-6 group">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link
                          href={`/product/${item.productId}`}
                          onClick={onClose}
                          className="relative w-20 h-26 md:w-[100px] md:h-[130px] bg-gray-100 flex-shrink-0 overflow-hidden"
                        >
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="100px"
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          {/* Top Section */}
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Link
                                href={`/product/${item.productId}`}
                                onClick={onClose}
                                className="font-display text-lg md:text-xl uppercase hover:text-brand-primary transition-colors leading-tight"
                              >
                                {item.name}
                              </Link>
                              <button
                                onClick={() => removeItem(item.variantId)}
                                className="flex-shrink-0 w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label="Verwijder item"
                              >
                                <X size={16} />
                              </button>
                            </div>
                            <div className="text-gray-600 text-sm space-x-2">
                              <span>{item.color}</span>
                              <span>•</span>
                              <span>Maat {item.size}</span>
                            </div>
                          </div>

                          {/* Bottom Section - Quantity & Price */}
                          <div className="flex items-center justify-between mt-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center border border-black">
                              <button
                                onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                                className="w-11 h-11 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label="Verlaag aantal"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="w-11 text-center font-bold">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                className="w-11 h-11 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                                aria-label="Verhoog aantal"
                              >
                                <Plus size={16} />
                              </button>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                              <div className="font-bold text-lg">€{(item.price * item.quantity).toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upsell Products - "Maak je Look Compleet" */}
              {upsellProducts.length > 0 && (
                <div className="px-4 md:px-6 pb-4 border-t-2 border-gray-200 pt-4">
                  <h3 className="font-display text-base uppercase mb-3 tracking-wide">
                    Maak je look compleet
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:-mx-6 md:px-6">
                    {upsellProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex-shrink-0 w-[280px] md:w-[320px] flex items-center gap-3 border-2 border-gray-200 hover:border-black transition-all p-2 group"
                      >
                        {/* Image */}
                        <Link
                          href={`/product/${product.slug}`}
                          onClick={onClose}
                          className="relative w-[60px] h-[80px] bg-gray-100 flex-shrink-0 overflow-hidden"
                        >
                          <Image
                            src={product.product_images[0]?.url || '/placeholder.png'}
                            alt={product.name}
                            fill
                            sizes="60px"
                            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/product/${product.slug}`}
                            onClick={onClose}
                            className="block text-xs font-semibold uppercase leading-tight mb-1 hover:text-brand-primary transition-colors line-clamp-2"
                          >
                            {product.name}
                          </Link>
                          <div className="text-[10px] text-gray-600">
                            {product.product_variants[0]?.size && (
                              <span>Maat {product.product_variants[0].size}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Price & Button */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-brand-primary font-bold text-sm">
                            €{product.base_price.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleQuickAdd(product)}
                            disabled={addingProduct === product.id}
                            className="w-8 h-8 bg-black text-white hover:bg-brand-primary transition-colors flex items-center justify-center disabled:bg-brand-primary"
                            title="Voeg toe"
                          >
                            {addingProduct === product.id ? (
                              <span className="text-xs">✓</span>
                            ) : (
                              <Plus size={16} strokeWidth={3} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Cart Button - Desktop Only */}
              <div className="hidden md:block px-4 md:px-6 pb-4">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-sm uppercase tracking-wider font-semibold"
                >
                  <Trash2 size={16} />
                  <span>Leeg winkelwagen</span>
                </button>
              </div>
            </div>

            {/* Summary - Sticky Bottom (Desktop) / Fixed Bottom (Mobile) */}
            <div className="flex-shrink-0 border-t-2 border-black bg-gray-50 sticky bottom-0">
              {/* Desktop Summary */}
              <div className="hidden md:block p-4 space-y-2">
                {/* Price Breakdown - Better Hierarchy */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotaal</span>
                    <span className="font-semibold text-gray-900">€{subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Promo Discount */}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-primary flex items-center gap-1">
                        <Ticket size={14} />
                        Korting
                      </span>
                      <span className="font-semibold text-brand-primary">-€{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">BTW 21%</span>
                    <span className="text-gray-500">€{btwAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Verzending</span>
                    <span className="font-semibold text-gray-900">
                      {shipping === 0 ? (
                        <span className="text-brand-primary">GRATIS</span>
                      ) : (
                        `€${shipping.toFixed(2)}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Progress to Free Shipping - Compact */}
                {subtotalAfterDiscount < freeShippingThreshold && (
                  <div className="bg-white border-l-2 border-brand-primary px-2 py-1.5">
                    <p className="text-xs text-gray-600">
                      Nog <span className="font-bold text-black">€{(freeShippingThreshold - subtotalAfterDiscount).toFixed(2)}</span> tot gratis verzending
                    </p>
                  </div>
                )}

                {/* Promo Code Section */}
                <div className="border-t border-gray-300 pt-2">
                  {!promoCodeExpanded && promoDiscount === 0 ? (
                    <button
                      onClick={() => setPromoCodeExpanded(true)}
                      className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700 hover:text-black transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Ticket size={16} />
                        <span>Kortingscode?</span>
                      </div>
                      <ChevronDown size={16} />
                    </button>
                  ) : promoDiscount === 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Ticket size={16} />
                          <span>Kortingscode</span>
                        </div>
                        <button
                          onClick={() => {
                            setPromoCodeExpanded(false)
                            setPromoError('')
                            setPromoCode('')
                          }}
                          className="p-1 hover:bg-gray-200 transition-colors"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase())
                            setPromoError('')
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                          placeholder="CODE"
                          className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm uppercase tracking-wider"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={!promoCode}
                          className="px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Toepassen
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-xs text-red-600 font-semibold">{promoError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 text-sm bg-brand-primary/10 px-2">
                      <div className="flex items-center gap-2 text-brand-primary font-semibold">
                        <Ticket size={16} />
                        <span>{promoCode}</span>
                      </div>
                      <button
                        onClick={handleRemovePromo}
                        className="text-xs text-gray-600 hover:text-black font-semibold uppercase"
                      >
                        Verwijder
                      </button>
                    </div>
                  )}
                </div>

                {/* Divider & Total - PROMINENT! */}
                <div className="border-t-2 border-black pt-3 mt-3">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-display text-lg uppercase tracking-wide">Totaal</span>
                    <span className="font-display text-3xl font-bold">€{total.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-600 text-right">
                    Incl. €{totalBtw.toFixed(2)} BTW
                  </p>
                </div>

                {/* CTA Button - GREEN! */}
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="block w-full py-3 bg-brand-primary text-white text-center font-bold text-sm uppercase tracking-wider hover:bg-brand-primary-hover transition-colors mt-3 border-2 border-brand-primary"
                >
                  Afrekenen
                </Link>

                {/* Trust Badges - Single Line Icons Only */}
                <div className="pt-2 flex items-center justify-center gap-4 text-gray-600">
                  <div className="cursor-help" title="Gratis verzending vanaf €50">
                    <Truck size={16} className="hover:text-black transition-colors" />
                  </div>
                  <div className="cursor-help" title="Veilig betalen via Stripe">
                    <Lock size={16} className="hover:text-black transition-colors" />
                  </div>
                  <div className="cursor-help" title="14 dagen bedenktijd">
                    <RotateCcw size={16} className="hover:text-black transition-colors" />
                  </div>
                </div>
              </div>

              {/* Mobile Fixed Bottom Bar */}
              <div className="md:hidden bg-white border-t-2 border-black">
                {/* Promo Code Section - Mobile */}
                <div className="p-3 border-b border-gray-200">
                  {!promoCodeExpanded && promoDiscount === 0 ? (
                    <button
                      onClick={() => setPromoCodeExpanded(true)}
                      className="w-full flex items-center justify-between py-2 text-sm font-semibold text-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <Ticket size={16} />
                        <span>Kortingscode?</span>
                      </div>
                      <ChevronDown size={16} />
                    </button>
                  ) : promoDiscount === 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Ticket size={16} />
                          <span>Kortingscode</span>
                        </div>
                        <button
                          onClick={() => {
                            setPromoCodeExpanded(false)
                            setPromoError('')
                            setPromoCode('')
                          }}
                          className="p-1 hover:bg-gray-200 transition-colors"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase())
                            setPromoError('')
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                          placeholder="CODE"
                          className="flex-1 px-3 py-2 border-2 border-gray-300 focus:border-brand-primary focus:outline-none text-sm uppercase tracking-wider"
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={!promoCode}
                          className="px-4 py-2 bg-black text-white font-bold text-xs uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          OK
                        </button>
                      </div>
                      {promoError && (
                        <p className="text-xs text-red-600 font-semibold">{promoError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 text-sm bg-brand-primary/10 px-2 rounded">
                      <div className="flex items-center gap-2 text-brand-primary font-semibold">
                        <Ticket size={16} />
                        <span>{promoCode}</span>
                        <span className="text-xs">(-€{promoDiscount.toFixed(2)})</span>
                      </div>
                      <button
                        onClick={handleRemovePromo}
                        className="text-xs text-gray-600 hover:text-black font-semibold uppercase"
                      >
                        Verwijder
                      </button>
                    </div>
                  )}
                </div>

                {/* Total & Checkout - Mobile */}
                <div className="p-4 bg-black text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Totaal</div>
                      <div className="font-display text-3xl font-bold">€{total.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">
                        Incl. €{totalBtw.toFixed(2)} BTW
                      </div>
                    </div>
                    <Link
                      href="/checkout"
                      onClick={onClose}
                      className="px-6 py-3 bg-brand-primary text-white font-bold text-sm uppercase tracking-wider hover:bg-brand-primary-hover transition-colors"
                    >
                      Afrekenen
                    </Link>
                  </div>
                  {subtotalAfterDiscount < freeShippingThreshold && (
                    <p className="text-xs text-gray-400 text-center border-t border-gray-700 pt-2">
                      Nog €{(freeShippingThreshold - subtotalAfterDiscount).toFixed(2)} tot gratis verzending
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black p-6 md:p-8 max-w-md w-full">
            <h3 className="font-display text-2xl md:text-3xl mb-4 uppercase">Winkelwagen legen?</h3>
            <p className="text-gray-600 mb-6">
              Weet je zeker dat je alle items wilt verwijderen?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 border-2 border-black font-bold uppercase tracking-wider hover:bg-gray-100 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={() => {
                  clearCart()
                  setShowClearConfirm(false)
                }}
                className="flex-1 py-3 bg-black text-white font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
              >
                Legen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

