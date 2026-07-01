import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? props.name

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[11px] font-bold uppercase tracking-wide text-white/40">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-3 text-[15px] font-medium text-white outline-none placeholder:text-white/35',
            'focus:border-brand-400 focus:bg-brand-500/10',
            error && 'border-danger-500/70 focus:border-danger-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-danger-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
