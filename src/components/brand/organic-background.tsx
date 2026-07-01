const SPORES = [
  { left: '8%', bottom: '4%', size: 3, delay: '0s' },
  { left: '17%', bottom: '18%', size: 4, delay: '.35s' },
  { left: '26%', bottom: '9%', size: 3, delay: '.7s' },
  { left: '34%', bottom: '28%', size: 5, delay: '1.05s' },
  { left: '44%', bottom: '6%', size: 3, delay: '1.4s' },
  { left: '52%', bottom: '22%', size: 4, delay: '1.75s' },
  { left: '61%', bottom: '11%', size: 3, delay: '2.1s' },
  { left: '69%', bottom: '31%', size: 5, delay: '2.45s' },
  { left: '78%', bottom: '7%', size: 3, delay: '2.8s' },
  { left: '86%', bottom: '20%', size: 4, delay: '3.15s' },
  { left: '14%', bottom: '35%', size: 3, delay: '.2s' },
  { left: '58%', bottom: '37%', size: 3, delay: '1.2s' },
]

/** Fundo atmosférico compartilhado (céu -> campo -> corte de solo) usado no splash e no login. */
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
      {SPORES.map((s, i) => (
        <span
          key={i}
          className="spore"
          style={{
            left: s.left,
            bottom: s.bottom,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
          }}
        />
      ))}
      <div className="world-grain" />
    </div>
  )
}
