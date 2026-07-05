import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  tone?: 'dark' | 'light'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, tone = 'light', className, id, ...props }, ref) => {
    const inputId = id ?? props.name

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-[11px] font-bold uppercase tracking-wide',
              tone === 'light' ? 'text-slate-800/65' : 'text-white/50'
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'rounded-2xl border px-4 py-3.5 text-[16px] font-medium outline-none transition-colors',
            tone === 'light'
              ? 'border-slate-800/15 bg-white/50 text-slate-800 placeholder:text-slate-800/35 focus:border-brand-500 focus:bg-white/70'
              : 'border-white/15 bg-white/[0.06] text-white placeholder:text-white/45 focus:border-brand-400 focus:bg-brand-500/10',
            error && 'border-danger-500/70 focus:border-danger-500',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs font-medium text-danger-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
