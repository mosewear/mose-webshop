import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import messages from '../messages/nl.json'
import DualRangeSlider from '@/components/DualRangeSlider'
it('keeps the original two-handle price slider usable with a keyboard and prevents crossing handles', () => {
  const change = vi.fn()
  render(
    <NextIntlClientProvider locale="nl" messages={messages}>
      <DualRangeSlider
        min={20}
        max={150}
        value={[50, 100]}
        onChange={change}
        step={5}
      />
    </NextIntlClientProvider>,
  )
  const [minimum, maximum] = screen.getAllByRole('slider')
  fireEvent.keyDown(minimum, { key: 'ArrowRight' })
  expect(change).toHaveBeenLastCalledWith([55, 100])
  expect(minimum).toHaveAttribute('aria-valuemax', '100')
  expect(maximum).toHaveAttribute('aria-valuemin', '55')
  fireEvent.keyDown(minimum, { key: 'End' })
  expect(change).toHaveBeenLastCalledWith([100, 100])
  fireEvent.keyDown(maximum, { key: 'Home' })
  expect(change).toHaveBeenLastCalledWith([100, 100])
  fireEvent.keyDown(minimum, { key: 'Home' })
  expect(change).toHaveBeenLastCalledWith([20, 100])
  fireEvent.keyDown(maximum, { key: 'End' })
  expect(change).toHaveBeenLastCalledWith([20, 150])
})

it('keeps externally supplied out-of-range filter bounds within the accessible slider range', () => {
  render(<NextIntlClientProvider locale="nl" messages={messages}><DualRangeSlider min={20} max={150} value={[0, 500]} onChange={vi.fn()} /></NextIntlClientProvider>)
  const [minimum, maximum] = screen.getAllByRole('slider')
  expect(minimum).toHaveAttribute('aria-valuenow', '20')
  expect(maximum).toHaveAttribute('aria-valuenow', '150')
})
