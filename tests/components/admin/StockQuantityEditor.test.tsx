import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
const mocks = vi.hoisted(() => ({ adjust: vi.fn() }))
vi.mock('@/lib/admin/inventory-api', async importOriginal => ({ ...await importOriginal<object>(), postInventoryAdjust: mocks.adjust }))
import StockQuantityEditor from '@/components/admin/inventory/StockQuantityEditor'
import ProductStockPanel from '@/components/admin/inventory/ProductStockPanel'
import { InventoryAdjustError } from '@/lib/admin/inventory-api'
afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())
const id = 'f1f0e991-f7c8-45f3-b2fe-99092a7a3d6e'
function Editor() {
  const [quantity, setQuantity] = useState(0)
  return <StockQuantityEditor variantId={id} quantity={quantity} label="Groen XL" onSaved={setQuantity} />
}
const input = () => screen.getByRole('spinbutton', { name: 'Voorraad Groen XL' })
const save = () => screen.getByRole('button', { name: 'Sla voorraad Groen XL op' })
describe('stock correction workflow', () => {
  it('saves an explicit absolute count via the audited route, not a variant update', async () => {
    mocks.adjust.mockResolvedValue({ result: { new_stock: 1, shopify_pending: true } })
    render(<Editor />)
    fireEvent.change(input(), { target: { value: '1' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    await screen.findByText('1 opgeslagen · Shopify wordt bijgewerkt')
    expect(mocks.adjust).toHaveBeenCalledWith(expect.objectContaining({ variantId: id, expectedStock: 0, delta: 1, field: 'regular' }))
    expect(input()).toHaveValue(1)
    expect(screen.queryByText(/nog niet opgeslagen/)).not.toBeInTheDocument()
  })
  it('does not submit blank, fractional or negative quantities', () => {
    render(<Editor />)
    for (const value of ['', '-1', '1.5']) {
      fireEvent.change(input(), { target: { value } })
      fireEvent.keyDown(input(), { key: 'Enter' })
      expect(save()).toBeDisabled()
    }
    expect(mocks.adjust).not.toHaveBeenCalled()
  })
  it('blocks duplicate submissions while a request is in flight', async () => {
    let resolve!: (value: unknown) => void
    mocks.adjust.mockImplementation(() => new Promise(r => { resolve = r }))
    render(<Editor />)
    fireEvent.change(input(), { target: { value: '1' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(mocks.adjust).toHaveBeenCalledTimes(1)
    expect(input()).toBeDisabled()
    await act(async () => resolve({ result: { new_stock: 1 } }))
    expect(await screen.findByText('1 opgeslagen')).toBeInTheDocument()
  })
  it('retains the same intent after an uncertain failure for safe retry', async () => {
    mocks.adjust.mockRejectedValueOnce(new Error('Nog niet bevestigd')).mockResolvedValueOnce({ result: { new_stock: 1 } })
    render(<Editor />)
    fireEvent.change(input(), { target: { value: '1' } })
    fireEvent.click(save())
    await screen.findByRole('alert')
    expect(input()).toHaveValue(1)
    fireEvent.click(save())
    await screen.findByText('1 opgeslagen')
    expect(mocks.adjust.mock.calls[0][0]).toEqual(mocks.adjust.mock.calls[1][0])
  })
  it('requires an explicit conflict review before overwriting a changed count', async () => {
    mocks.adjust.mockRejectedValueOnce(new InventoryAdjustError('Voorraad gewijzigd', 2)).mockResolvedValueOnce({ result: { new_stock: 1 } })
    render(<Editor />)
    fireEvent.change(input(), { target: { value: '1' } })
    fireEvent.click(save())
    await screen.findByText('Voorraad gewijzigd')
    expect(save()).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /Actuele voorraad/ }))
    expect(screen.getByText('2 → 1 · nog niet opgeslagen')).toBeInTheDocument()
    fireEvent.click(save())
    await screen.findByText('1 opgeslagen')
    expect(mocks.adjust.mock.calls[1][0]).toMatchObject({ expectedStock: 2, delta: -1 })
  })
  it('keeps unsaved counts when filtering the product overview', async () => {
    render(<ProductStockPanel variants={[{ id, color: 'Groen', size: 'XL', color_hex: '#123456', sku: 'GROEN-XL', stock_quantity: 0 }]} onSaved={vi.fn()} />)
    fireEvent.change(input(), { target: { value: '3' } })
    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'Bruin' } })
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: '' } })
    await waitFor(() => expect(input()).toHaveValue(3))
  })
})
