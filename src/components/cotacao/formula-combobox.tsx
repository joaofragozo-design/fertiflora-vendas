'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface FormulaComboboxProps {
  formulas: { nome: string }[]
  value: string
  onChange: (nome: string) => void
}

/**
 * Substitui o `<input list>` + `<datalist>` nativo -- o widget nativo do navegador renderiza
 * de forma inconsistente entre desktop e mobile (e em alguns navegadores mobile o filtro nem
 * respeita o texto digitado, mostrando opções soltas). Sendo 100% renderizado pelo app, fica
 * idêntico em qualquer dispositivo e o filtro é sempre um `includes` exato sobre o que foi digitado.
 */
export function FormulaCombobox({ formulas, value, onChange }: FormulaComboboxProps) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  const termo = value.trim().toLowerCase()
  const filtradas = termo ? formulas.filter((f) => f.nome.toLowerCase().includes(termo)) : formulas

  function selecionar(nome: string) {
    onChange(nome)
    setAberto(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        placeholder="Buscar fórmula…"
        autoComplete="off"
        className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3.5 pr-11 text-[15px] font-medium text-white outline-none placeholder:text-white/45 focus:border-brand-400 focus:bg-brand-500/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => selecionar('')}
          aria-label="Limpar fórmula selecionada"
          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {aberto && filtradas.length > 0 && (
        <div className="glass absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 p-1.5">
          {filtradas.slice(0, 50).map((f) => (
            <button
              key={f.nome}
              type="button"
              onClick={() => selecionar(f.nome)}
              className="w-full rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-white/85 transition-colors hover:bg-white/10"
            >
              {f.nome}
            </button>
          ))}
        </div>
      )}

      {aberto && termo && filtradas.length === 0 && (
        <div className="glass absolute z-20 mt-1.5 w-full rounded-2xl border border-white/10 p-3 text-center text-[12.5px] text-white/45">
          Nenhuma fórmula encontrada
        </div>
      )}
    </div>
  )
}
