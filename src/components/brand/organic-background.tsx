import type { CSSProperties } from 'react'

const GRANULES = [
  { left: '4%', duration: '9s', delay: '0s', drift: '14px', size: 5, tone: 'tan' },
  { left: '13%', duration: '11s', delay: '1.4s', drift: '-10px', size: 4, tone: 'brand' },
  { left: '22%', duration: '8.5s', delay: '3.1s', drift: '8px', size: 6, tone: 'tan' },
  { left: '31%', duration: '10.5s', delay: '.6s', drift: '-14px', size: 4, tone: 'brand' },
  { left: '40%', duration: '9.5s', delay: '4.2s', drift: '10px', size: 5, tone: 'tan' },
  { left: '49%', duration: '12s', delay: '2s', drift: '-8px', size: 4, tone: 'brand' },
  { left: '58%', duration: '8.8s', delay: '5.1s', drift: '12px', size: 6, tone: 'tan' },
  { left: '67%', duration: '10s', delay: '.2s', drift: '-12px', size: 4, tone: 'brand' },
  { left: '76%', duration: '11.5s', delay: '3.7s', drift: '9px', size: 5, tone: 'tan' },
  { left: '85%', duration: '9.2s', delay: '1.9s', drift: '-9px', size: 4, tone: 'brand' },
  { left: '94%', duration: '10.8s', delay: '4.8s', drift: '11px', size: 5, tone: 'tan' },
]

const SPROUTS = [
  { left: '10%', delay: '0s', duration: '13s', scale: 0.85 },
  { left: '27%', delay: '3.2s', duration: '14s', scale: 1.05 },
  { left: '45%', delay: '6.4s', duration: '12.5s', scale: 0.9 },
  { left: '63%', delay: '1.6s', duration: '13.5s', scale: 1 },
  { left: '80%', delay: '4.8s', duration: '14.5s', scale: 0.95 },
  { left: '91%', delay: '8s', duration: '13s', scale: 0.8 },
]

/** Fundo atmosférico compartilhado: céu -> campo -> solo, com fertilizante caindo e brotos florescendo. */
export function OrganicBackground() {
  return (
    <div className="world" aria-hidden="true">
      <div className="world-sun" />
      <div className="world-field" />

      <svg
        className="pointer-events-none absolute bottom-0 left-0 h-[44%] w-full opacity-50"
        viewBox="0 0 400 300"
        preserveAspectRatio="none"
      >
        <path d="M60,0 C40,60 90,90 70,150 C55,195 90,220 80,280" stroke="#6b5637" strokeWidth="2" fill="none" opacity="0.6" />
        <path d="M180,0 C200,50 150,100 175,160 C195,205 160,230 170,290" stroke="#6b5637" strokeWidth="2" fill="none" opacity="0.55" />
        <path d="M320,0 C345,55 300,95 315,150 C330,200 300,225 310,280" stroke="#6b5637" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M250,0 C265,40 235,70 250,110" stroke="#6b5637" strokeWidth="1.5" fill="none" opacity="0.4" />
        <path d="M120,0 C105,35 130,60 115,100" stroke="#6b5637" strokeWidth="1.5" fill="none" opacity="0.4" />
      </svg>

      {GRANULES.map((g, i) => (
        <span
          key={i}
          className={`granule granule--${g.tone}`}
          style={{
            left: g.left,
            width: g.size,
            height: g.size,
            animationDuration: g.duration,
            animationDelay: g.delay,
            '--drift': g.drift,
          } as CSSProperties}
        />
      ))}

      {SPROUTS.map((s, i) => (
        <div
          key={i}
          className="sprout"
          style={{
            left: s.left,
            animationDuration: s.duration,
            animationDelay: s.delay,
            transform: `scale(${s.scale})`,
          }}
        >
          <span className="sprout-ring" style={{ animationDuration: s.duration, animationDelay: s.delay }} />
          <span className="sprout-stem" style={{ animationDuration: s.duration, animationDelay: s.delay }} />
          <span
            className="sprout-leaf sprout-leaf--l"
            style={{ animationDuration: s.duration, animationDelay: s.delay, '--rot-from': '-70deg', '--rot-to': '-28deg' } as CSSProperties}
          />
          <span
            className="sprout-leaf sprout-leaf--r"
            style={{ animationDuration: s.duration, animationDelay: s.delay, '--rot-from': '70deg', '--rot-to': '28deg' } as CSSProperties}
          />
          <span className="sprout-bloom" style={{ animationDuration: s.duration, animationDelay: s.delay }} />
        </div>
      ))}

      <div className="world-grain" />
    </div>
  )
}
