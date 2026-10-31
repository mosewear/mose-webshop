import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * De enige bron voor knopstijlen in de funnel (PDP, winkelwagen, lade,
 * checkout). Daarvoor stonden er 34 losse uppercase-knopklassen in die vier
 * bestanden, met onder andere drie verschillende paddings voor dezelfde
 * handeling en een "afrekenen" die groen was in de lade en zwart op de
 * winkelwagenpagina.
 *
 * De regel: `primary` (merkgroen) is de doorzetactie en komt per scherm
 * hooguit één keer voor. `secondary` (zwart) is navigeren. `outline` is
 * tertiair. `danger` is destructief.
 *
 * `min-h-[44px]` staat bewust op de basis: het is de ondergrens voor een
 * tapdoel, en de funnel wordt overwegend op een telefoon doorlopen.
 *
 * Exporteer `buttonVariants` zodat een <Link> exact dezelfde stijl krijgt als
 * een <button>; een deel van de funnel-CTA's zijn links.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 min-h-[44px] font-bold uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-primary text-white border-2 border-brand-primary hover:bg-brand-primary-hover hover:border-brand-primary-hover',
        secondary: 'bg-black text-white border-2 border-black hover:bg-gray-800 hover:border-gray-800',
        outline: 'border-2 border-black bg-transparent text-black hover:bg-black hover:text-white',
        ghost: 'bg-transparent text-black border-2 border-transparent hover:bg-gray-100',
        danger: 'bg-white text-red-700 border-2 border-red-600 hover:bg-red-600 hover:text-white',
      },
      size: {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  /** Tekst tijdens laden. Stond hardgecodeerd op "Loading..." en verscheen
   *  daarmee ook op de Nederlandse checkout. */
  loadingLabel?: string
}

export function Button({
  className,
  variant,
  size,
  fullWidth,
  isLoading,
  loadingLabel,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

