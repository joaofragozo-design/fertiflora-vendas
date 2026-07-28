'use client'

import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Portal } from '@/components/ui/portal'

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  closeOnBackdrop?: boolean
  className?: string
}

/**
 * Modal acessível: trava o foco dentro do card, fecha no Esc, restaura o foco
 * de origem ao fechar e trava o scroll do fundo. Substitui o padrão
 * "Portal + <div fixed> + onClick stopPropagation" repetido em cada modal.
 */
export function Dialog({ open, onClose, title, children, closeOnBackdrop = true, className }: DialogProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const focoAnteriorRef = useRef<HTMLElement | null>(null)
  const tituloId = useId()

  useEffect(() => {
    if (!open) return

    focoAnteriorRef.current = document.activeElement as HTMLElement | null
    const card = cardRef.current
    const primeiroFocavel = card?.querySelector<HTMLElement>(SELETOR_FOCAVEL)
    ;(primeiroFocavel ?? card)?.focus()

    const overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !card) return

      const focaveis = Array.from(card.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL))
      if (focaveis.length === 0) return
      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflowOriginal
      focoAnteriorRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
        onClick={closeOnBackdrop ? onClose : undefined}
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? tituloId : undefined}
          tabIndex={-1}
          className={cn(
            'glass flex w-full max-w-md flex-col gap-4 rounded-t-[28px] p-6 outline-none sm:rounded-[28px]',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className="flex items-center justify-between">
              <h2 id={tituloId} className="font-display text-sm font-bold">
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white/60 transition-colors hover:bg-white/15 hover:text-white active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </Portal>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
}

/**
 * Substitui window.confirm em ações destrutivas/irreversíveis: mostra o
 * estado atual relevante em `description` e exige um clique explícito no
 * card com a identidade visual do app, em vez de um confirm() nativo do navegador.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="text-sm text-white/70">{description}</div>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-2xl border border-white/15 px-4 py-3.5 text-sm font-bold text-white/70 transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            'flex-1 rounded-2xl px-4 py-3.5 text-sm font-bold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
            variant === 'primary' && 'bg-gradient-to-br from-brand-300 to-brand-500 text-ink-950 shadow-glow-brand',
            variant === 'danger' && 'bg-gradient-to-br from-danger-400 to-danger-600 text-white shadow-glow-danger'
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
