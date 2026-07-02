/**
 * Motor Canvas2D da cena de fundo: poucas raízes finas no terço inferior da
 * tela, um punhado de partículas de nutriente bem executadas, reação sutil
 * ao toque. Deliberadamente contido — o formulário é o foco, a cena é um
 * detalhe ambiente, não um papel de parede animado.
 *
 * Canvas2D (não WebGL) por escolha: o público real são vendedores em campo
 * com celulares Android variados — Canvas2D tem comportamento muito mais
 * previsível nesse universo de hardware do que WebGL.
 */

interface Point {
  x: number
  y: number
}

interface RootBranch {
  points: Point[]
  cumLen: number[]
  width: number
  phase: number
}

type ParticleState = 'wandering' | 'onroot' | 'arriving'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  state: ParticleState
  rootIndex: number
  t: number
  speed: number
  size: number
  captureCooldown: number
}

const MIN_PARTICLES = 12
const MAX_PARTICLES = 26
const CAPTURE_RADIUS = 16
const POINTER_INFLUENCE = 90

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

export class GrowthEngine {
  private ctx: CanvasRenderingContext2D
  private width = 0
  private height = 0
  private rootZoneY = 0 // a partir daqui (terço inferior) vivem raízes e a maior parte das partículas

  private roots: RootBranch[] = []
  private particles: Particle[] = []
  private ripples: { x: number; y: number; start: number }[] = []

  private pointer: Point | null = null
  private raf = 0
  private lastTime = 0
  private frameTimes: number[] = []
  private targetCount: number

  // nutriente que acompanha o mouse com atraso — só em dispositivos com ponteiro fino (mouse/trackpad)
  private cursorFollow: { x: number; y: number; alpha: number; wobble: number } = { x: 0, y: 0, alpha: 0, wobble: 0 }
  private fineCursor: boolean

  private surgeUntil = 0
  private reducedMotion: boolean

  constructor(private canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean; fineCursor?: boolean } = {}) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D não suportado')
    this.ctx = ctx
    this.reducedMotion = !!opts.reducedMotion
    this.fineCursor = !!opts.fineCursor

    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
    this.targetCount = cores <= 4 ? 16 : 22
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width
    this.height = height
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.rootZoneY = height * 0.7

    this.roots = this.generateRoots()
    if (this.particles.length === 0) {
      this.particles = Array.from({ length: this.targetCount }, () => this.spawnParticle())
    }
    if (this.reducedMotion) this.drawFrame(0)
  }

  /** Duas raízes finas, deslocadas do centro, com no máximo uma bifurcação — discretas, não um diagrama. */
  private generateRoots(): RootBranch[] {
    const branches: RootBranch[] = []

    const grow = (x: number, y: number, angle: number, len: number, width: number, depth: number) => {
      if (depth > 2 || len < 22) return
      const points: Point[] = [{ x, y }]
      const segments = 6
      let cx = x
      let cy = y
      let cAngle = angle
      for (let i = 0; i < segments; i++) {
        cAngle += (Math.random() - 0.5) * 0.35
        const segLen = len / segments
        cx += Math.cos(cAngle) * segLen
        cy += Math.sin(cAngle) * segLen
        points.push({ x: cx, y: cy })
      }

      const cumLen: number[] = [0]
      for (let i = 1; i < points.length; i++) {
        cumLen.push(cumLen[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
      }

      branches.push({ points, cumLen, width, phase: Math.random() * Math.PI * 2 })

      if (depth === 1) return
      const last = points[points.length - 1]
      if (Math.random() < 0.85) {
        grow(last.x, last.y, cAngle + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.3), len * 0.6, width * 0.6, depth + 1)
      }
    }

    grow(this.width * 0.22, this.rootZoneY, Math.PI / 2 - 0.15, this.height * 0.16, 1.6, 0)
    grow(this.width * 0.78, this.rootZoneY, Math.PI / 2 + 0.15, this.height * 0.13, 1.3, 0)

    return branches
  }

  private spawnParticle(): Particle {
    return {
      x: Math.random() * this.width,
      y: this.rootZoneY + Math.random() * (this.height - this.rootZoneY),
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      state: 'wandering',
      rootIndex: -1,
      t: 0,
      speed: 0.05 + Math.random() * 0.04,
      size: 1.6 + Math.random() * 1.2,
      captureCooldown: Math.random() * 60,
    }
  }

  private pointAlongRoot(root: RootBranch, t: number): Point {
    const targetLen = t * root.cumLen[root.cumLen.length - 1]
    for (let i = 1; i < root.cumLen.length; i++) {
      if (targetLen <= root.cumLen[i]) {
        const segT = (targetLen - root.cumLen[i - 1]) / (root.cumLen[i] - root.cumLen[i - 1] || 1)
        return {
          x: lerp(root.points[i - 1].x, root.points[i].x, segT),
          y: lerp(root.points[i - 1].y, root.points[i].y, segT),
        }
      }
    }
    return root.points[root.points.length - 1]
  }

  handlePointerMove(x: number, y: number) {
    this.pointer = { x, y }
    if (this.cursorFollow.alpha === 0) {
      // reaparece já perto do ponteiro, sem "voar" a partir do canto
      this.cursorFollow.x = x
      this.cursorFollow.y = y
    }
  }

  handlePointerLeave() {
    this.pointer = null
  }

  handlePointerDown(x: number, y: number) {
    this.ripples.push({ x, y, start: performance.now() })
    for (const p of this.particles) {
      if (p.state !== 'wandering') continue
      const d2 = dist2(p.x, p.y, x, y)
      if (d2 < 140 * 140) {
        const d = Math.sqrt(d2) || 1
        const force = (1 - d / 140) * 3
        p.vx += ((p.x - x) / d) * force
        p.vy += ((p.y - y) / d) * force
      }
    }
  }

  surge() {
    this.surgeUntil = performance.now() + 1400
  }

  start() {
    this.lastTime = performance.now()
    if (this.reducedMotion) return
    const loop = (now: number) => {
      const dt = Math.min(48, now - this.lastTime)
      this.lastTime = now
      this.trackPerformance(dt)
      this.update(dt, now)
      this.drawFrame(now)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf)
  }

  destroy() {
    this.stop()
  }

  private trackPerformance(dt: number) {
    this.frameTimes.push(dt)
    if (this.frameTimes.length < 90) return
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    this.frameTimes = []

    if (avg > 22 && this.targetCount > MIN_PARTICLES) {
      this.targetCount = Math.max(MIN_PARTICLES, this.targetCount - 2)
    } else if (avg < 14 && this.targetCount < MAX_PARTICLES) {
      this.targetCount = Math.min(MAX_PARTICLES, this.targetCount + 1)
    }

    while (this.particles.length < this.targetCount) this.particles.push(this.spawnParticle())
    while (this.particles.length > this.targetCount) this.particles.pop()
  }

  private update(dt: number, now: number) {
    const t = dt / 16.7
    const surging = now < this.surgeUntil
    const speedMul = surging ? 3 : 1

    for (const p of this.particles) {
      if (p.state === 'wandering') {
        p.captureCooldown -= t
        p.vx += (Math.random() - 0.5) * 0.25
        p.vy += (Math.random() - 0.5) * 0.25

        if (this.pointer) {
          const d2 = dist2(p.x, p.y, this.pointer.x, this.pointer.y)
          if (d2 < POINTER_INFLUENCE * POINTER_INFLUENCE) {
            const d = Math.sqrt(d2) || 1
            const force = (1 - d / POINTER_INFLUENCE) * 1.1
            p.vx += ((p.x - this.pointer.x) / d) * force
            p.vy += ((p.y - this.pointer.y) / d) * force
          }
        }

        p.vx *= 0.95
        p.vy *= 0.95
        p.x += p.vx * t
        p.y += p.vy * t

        if (p.y < this.rootZoneY + 4) { p.y = this.rootZoneY + 4; p.vy *= -0.4 }
        if (p.y > this.height - 4) { p.y = this.height - 4; p.vy *= -0.4 }
        if (p.x < 4) { p.x = 4; p.vx *= -0.4 }
        if (p.x > this.width - 4) { p.x = this.width - 4; p.vx *= -0.4 }

        if (p.captureCooldown <= 0) {
          for (let ri = 0; ri < this.roots.length; ri++) {
            const root = this.roots[ri]
            for (let i = 0; i < root.points.length; i += 2) {
              if (dist2(p.x, p.y, root.points[i].x, root.points[i].y) < CAPTURE_RADIUS * CAPTURE_RADIUS) {
                p.state = 'onroot'
                p.rootIndex = ri
                p.t = 1 - i / (root.points.length - 1)
                break
              }
            }
            if (p.state === 'onroot') break
          }
          p.captureCooldown = 90 + Math.random() * 90
        }
      } else if (p.state === 'onroot') {
        p.t += p.speed * speedMul * t * 0.045
        const root = this.roots[p.rootIndex]
        const pos = this.pointAlongRoot(root, Math.min(1, p.t))
        p.x = pos.x
        p.y = pos.y
        if (p.t >= 1) p.state = 'arriving'
      } else {
        p.t += t * 0.06
        if (p.t >= 1.8) Object.assign(p, this.spawnParticle())
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (now - this.ripples[i].start > 900) this.ripples.splice(i, 1)
    }

    if (this.fineCursor) {
      const cf = this.cursorFollow
      cf.wobble += t * 0.05
      if (this.pointer) {
        cf.alpha = lerp(cf.alpha, 0.85, 0.06 * t)
        const wobbleX = Math.sin(cf.wobble) * 3
        const wobbleY = Math.cos(cf.wobble * 1.3) * 3
        cf.x = lerp(cf.x, this.pointer.x + wobbleX, 0.1 * t)
        cf.y = lerp(cf.y, this.pointer.y + wobbleY, 0.1 * t)
      } else {
        cf.alpha = lerp(cf.alpha, 0, 0.08 * t)
      }
    }
  }

  private drawFrame(now: number) {
    const { ctx, width, height } = this
    const surging = now < this.surgeUntil
    const surgeT = surging ? 1 - Math.max(0, this.surgeUntil - now) / 1400 : 0

    ctx.clearRect(0, 0, width, height)

    // um único degradê contínuo — sem quebra "céu/solo", sem retângulo de terra
    const bg = ctx.createLinearGradient(0, 0, 0, height)
    bg.addColorStop(0, '#0a1712')
    bg.addColorStop(0.62, '#0d1e15')
    bg.addColorStop(1, '#12211a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // tonalidade terrosa muito sutil só no canto onde as raízes vivem
    const earthGlow = ctx.createRadialGradient(width * 0.5, height, height * 0.15, width * 0.5, height, height * 0.6)
    earthGlow.addColorStop(0, 'rgba(62,44,28,0.28)')
    earthGlow.addColorStop(1, 'rgba(62,44,28,0)')
    ctx.fillStyle = earthGlow
    ctx.fillRect(0, this.rootZoneY - 40, width, height - this.rootZoneY + 40)

    // raízes finas, respirando de forma quase imperceptível
    for (const root of this.roots) {
      const breathe = 0.9 + 0.1 * Math.sin(now * 0.0007 + root.phase)
      const glow = surging ? surgeT : 0
      ctx.beginPath()
      ctx.moveTo(root.points[0].x, root.points[0].y)
      for (let i = 1; i < root.points.length; i++) {
        const mx = (root.points[i - 1].x + root.points[i].x) / 2
        const my = (root.points[i - 1].y + root.points[i].y) / 2
        ctx.quadraticCurveTo(root.points[i - 1].x, root.points[i - 1].y, mx, my)
      }
      ctx.strokeStyle = `rgba(${lerp(122, 47, glow)},${lerp(100, 189, glow)},${lerp(74, 106, glow)},${(0.35 + glow * 0.5) * breathe})`
      ctx.lineWidth = root.width * breathe
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // partículas — poucas, grandes, brilho aditivo bem suave
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.particles) {
      const alpha = p.state === 'wandering' ? 0.3 : 0.5 + 0.4 * p.t
      const size = p.size * (p.state === 'onroot' ? 1.3 : 1) * (surging ? 1.5 : 1)

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3.2)
      grad.addColorStop(0, `rgba(159,214,164,${alpha})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, size * 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    // nutriente que acompanha o cursor — um só, brilho suave, levemente atrasado
    if (this.fineCursor && this.cursorFollow.alpha > 0.01) {
      const cf = this.cursorFollow
      const grad = ctx.createRadialGradient(cf.x, cf.y, 0, cf.x, cf.y, 13)
      grad.addColorStop(0, `rgba(197,232,201,${cf.alpha})`)
      grad.addColorStop(0.5, `rgba(159,214,164,${cf.alpha * 0.5})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cf.x, cf.y, 13, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'source-over'

    // ondas de toque — finas
    for (const r of this.ripples) {
      const age = (now - r.start) / 900
      ctx.beginPath()
      ctx.arc(r.x, r.y, age * 70, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(159,214,164,${0.35 * (1 - age)})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
}
