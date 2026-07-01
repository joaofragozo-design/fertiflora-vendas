/**
 * Motor Canvas2D da cena "raízes vivas": camadas de solo, raízes que respiram,
 * partículas de nutriente que viajam do solo até a planta, e reações ao toque.
 *
 * Canvas2D (não WebGL) por escolha deliberada: o público real são vendedores em
 * campo com celulares Android variados — Canvas2D tem comportamento muito mais
 * previsível nesse universo de hardware do que WebGL (sem perda de contexto,
 * sem depender de driver), e ainda sustenta o efeito de brilho aditivo desejado.
 */

interface Point {
  x: number
  y: number
}

interface RootBranch {
  points: Point[]
  cumLen: number[] // comprimento acumulado até cada ponto, para interpolar com velocidade constante
  width: number
  depth: number
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
  t: number // posição ao longo da raiz, 0 = ponta funda, 1 = entrada (perto da superfície)
  speed: number
  size: number
  tone: number // 0..1, mistura entre verde-brand e oliva
  captureCooldown: number
}

const MIN_PARTICLES = 70
const MAX_PARTICLES = 420
const CAPTURE_RADIUS = 20
const POINTER_INFLUENCE = 110

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
  private dpr = 1
  private soilTopY = 0

  private roots: RootBranch[] = []
  private particles: Particle[] = []
  private ripples: { x: number; y: number; start: number }[] = []

  private pointer: Point | null = null
  private raf = 0
  private lastTime = 0
  private startTime = 0
  private frameTimes: number[] = []
  private targetCount: number

  private surgeUntil = 0
  private reducedMotion: boolean
  public onArrive: (() => void) | null = null

  constructor(private canvas: HTMLCanvasElement, opts: { reducedMotion?: boolean } = {}) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D não suportado')
    this.ctx = ctx
    this.reducedMotion = !!opts.reducedMotion

    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4
    this.targetCount = cores <= 4 ? 130 : cores <= 8 ? 240 : 340
  }

  resize(width: number, height: number, dpr: number) {
    this.width = width
    this.height = height
    this.dpr = dpr
    this.canvas.width = Math.round(width * dpr)
    this.canvas.height = Math.round(height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.soilTopY = height * 0.46

    this.roots = this.generateRoots()
    if (this.particles.length === 0) {
      this.particles = Array.from({ length: this.targetCount }, () => this.spawnParticle())
    }
    if (this.reducedMotion) this.drawFrame(0)
  }

  private generateRoots(): RootBranch[] {
    const originX = this.width * 0.5
    const branches: RootBranch[] = []

    const grow = (x: number, y: number, angle: number, len: number, width: number, depth: number) => {
      if (depth > 4 || len < 18) return
      const points: Point[] = [{ x, y }]
      const segments = 5
      let cx = x
      let cy = y
      let cAngle = angle
      for (let i = 0; i < segments; i++) {
        cAngle += (Math.random() - 0.5) * 0.5
        const segLen = len / segments
        cx += Math.cos(cAngle) * segLen
        cy += Math.sin(cAngle) * segLen
        points.push({ x: cx, y: cy })
      }

      const cumLen: number[] = [0]
      for (let i = 1; i < points.length; i++) {
        cumLen.push(cumLen[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
      }

      branches.push({ points, cumLen, width, depth, phase: Math.random() * Math.PI * 2 })

      const last = points[points.length - 1]
      const splits = depth === 0 ? 3 : Math.random() < 0.7 ? 2 : 1
      for (let s = 0; s < splits; s++) {
        const spread = (s - (splits - 1) / 2) * 0.7
        grow(last.x, last.y, cAngle + spread + (Math.random() - 0.5) * 0.3, len * 0.72, width * 0.68, depth + 1)
      }
    }

    grow(originX, this.soilTopY, Math.PI / 2 - 0.3, this.height * 0.26, 5.5, 0)
    grow(originX, this.soilTopY, Math.PI / 2 + 0.3, this.height * 0.24, 5, 0)
    grow(originX, this.soilTopY, Math.PI / 2, this.height * 0.3, 6, 0)

    return branches
  }

  private spawnParticle(): Particle {
    return {
      x: Math.random() * this.width,
      y: this.soilTopY + Math.random() * (this.height - this.soilTopY),
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      state: 'wandering',
      rootIndex: -1,
      t: 0,
      speed: 0.12 + Math.random() * 0.1,
      size: 1.2 + Math.random() * 1.6,
      tone: Math.random(),
      captureCooldown: Math.random() * 30,
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
  }

  handlePointerLeave() {
    this.pointer = null
  }

  handlePointerDown(x: number, y: number) {
    this.ripples.push({ x, y, start: performance.now() })
    for (const p of this.particles) {
      if (p.state !== 'wandering') continue
      const d2 = dist2(p.x, p.y, x, y)
      if (d2 < 160 * 160) {
        const d = Math.sqrt(d2) || 1
        const force = (1 - d / 160) * 6
        p.vx += ((p.x - x) / d) * force
        p.vy += ((p.y - y) / d) * force
      }
    }
  }

  surge() {
    this.surgeUntil = performance.now() + 1400
  }

  start() {
    this.startTime = performance.now()
    this.lastTime = this.startTime
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
      this.targetCount = Math.max(MIN_PARTICLES, Math.round(this.targetCount * 0.85))
    } else if (avg < 14 && this.targetCount < MAX_PARTICLES) {
      this.targetCount = Math.min(MAX_PARTICLES, Math.round(this.targetCount * 1.1))
    }

    while (this.particles.length < this.targetCount) this.particles.push(this.spawnParticle())
    while (this.particles.length > this.targetCount) this.particles.pop()
  }

  private update(dt: number, now: number) {
    const t = dt / 16.7
    const surging = now < this.surgeUntil
    const speedMul = surging ? 3.2 : 1

    for (const p of this.particles) {
      if (p.state === 'wandering') {
        p.captureCooldown -= t
        p.vx += (Math.random() - 0.5) * 0.6
        p.vy += (Math.random() - 0.5) * 0.6

        if (this.pointer) {
          const d2 = dist2(p.x, p.y, this.pointer.x, this.pointer.y)
          if (d2 < POINTER_INFLUENCE * POINTER_INFLUENCE) {
            const d = Math.sqrt(d2) || 1
            const force = (1 - d / POINTER_INFLUENCE) * 1.4
            p.vx += ((p.x - this.pointer.x) / d) * force
            p.vy += ((p.y - this.pointer.y) / d) * force
          }
        }

        p.vx *= 0.94
        p.vy *= 0.94
        p.x += p.vx * t
        p.y += p.vy * t

        if (p.y < this.soilTopY + 4) { p.y = this.soilTopY + 4; p.vy *= -0.4 }
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
          p.captureCooldown = 40 + Math.random() * 40
        }
      } else if (p.state === 'onroot') {
        p.t += p.speed * speedMul * t * 0.045
        const root = this.roots[p.rootIndex]
        const pos = this.pointAlongRoot(root, Math.min(1, p.t))
        p.x = pos.x
        p.y = pos.y
        if (p.t >= 1) {
          p.state = 'arriving'
          this.onArrive?.()
        }
      } else {
        // 'arriving' — breve flash e reciclagem
        p.t += t * 0.08
        if (p.t >= 1.6) {
          const fresh = this.spawnParticle()
          Object.assign(p, fresh)
        }
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (now - this.ripples[i].start > 900) this.ripples.splice(i, 1)
    }
  }

  private drawFrame(now: number) {
    const { ctx, width, height } = this
    const surging = now < this.surgeUntil
    const surgeT = surging ? 1 - Math.max(0, this.surgeUntil - now) / 1400 : 0

    ctx.clearRect(0, 0, width, height)

    // céu
    const sky = ctx.createLinearGradient(0, 0, 0, this.soilTopY)
    sky.addColorStop(0, '#0a1f16')
    sky.addColorStop(1, '#0f2b1c')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, width, this.soilTopY)

    // solo (camadas)
    const soil = ctx.createLinearGradient(0, this.soilTopY, 0, height)
    soil.addColorStop(0, '#3e2c1c')
    soil.addColorStop(0.4, '#332315')
    soil.addColorStop(1, '#1a120b')
    ctx.fillStyle = soil
    ctx.fillRect(0, this.soilTopY, width, height - this.soilTopY)

    // linha sutil entre camadas de solo
    ctx.strokeStyle = 'rgba(169,131,95,0.12)'
    ctx.lineWidth = 1
    for (const frac of [0.15, 0.4, 0.7]) {
      const y = this.soilTopY + (height - this.soilTopY) * frac
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // raízes (respirando)
    for (const root of this.roots) {
      const breathe = 0.82 + 0.18 * Math.sin(now * 0.0009 + root.phase)
      const glow = surging ? 0.5 + 0.5 * surgeT : 0
      ctx.beginPath()
      ctx.moveTo(root.points[0].x, root.points[0].y)
      for (let i = 1; i < root.points.length; i++) {
        const mx = (root.points[i - 1].x + root.points[i].x) / 2
        const my = (root.points[i - 1].y + root.points[i].y) / 2
        ctx.quadraticCurveTo(root.points[i - 1].x, root.points[i - 1].y, mx, my)
      }
      ctx.strokeStyle = `rgba(${lerp(107, 47, glow)},${lerp(79, 189, glow)},${lerp(58, 106, glow)},${0.5 * breathe + glow * 0.4})`
      ctx.lineWidth = root.width * breathe
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // partículas (brilho aditivo)
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.particles) {
      const depthRatio = Math.min(1, (p.y - this.soilTopY) / (this.height - this.soilTopY))
      const alpha = p.state === 'wandering' ? 0.25 + 0.35 * (1 - depthRatio) : 0.55 + 0.45 * p.t
      const r = lerp(24, 165, p.tone)
      const g = lerp(165, 210, p.tone)
      const b = lerp(88, 120, p.tone)
      const size = p.size * (p.state === 'onroot' ? 1.4 : 1) * (surging ? 1.6 : 1)

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3)
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'

    // ondas de toque
    for (const r of this.ripples) {
      const age = (now - r.start) / 900
      ctx.beginPath()
      ctx.arc(r.x, r.y, age * 90, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(95,209,150,${0.5 * (1 - age)})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // vinheta suave nas bordas
    const vignette = ctx.createRadialGradient(width / 2, height * 0.55, height * 0.2, width / 2, height * 0.55, height * 0.75)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, width, height)
  }
}
