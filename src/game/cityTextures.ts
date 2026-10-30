import * as THREE from 'three'

function canvas2d(width: number, height: number): {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D | null
} {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d') }
}

function toTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  tex.repeat.set(repeatX, repeatY)
  tex.needsUpdate = true
  return tex
}

const FACADE_BASES = ['#1b3535', '#123b32', '#294746', '#1e3f3a']
const WINDOW_PALETTES = [
  ['#00f5a0', '#18b8c9', '#e9fff6', '#00c987'],
  ['#18b8c9', '#7fe0ea', '#e9fff6', '#00f5a0'],
  ['#a6ff4d', '#00c987', '#e9fff6', '#18b8c9'],
  ['#e9fff6', '#00f5a0', '#527d72', '#18b8c9'],
]

export function makeFacadeAlbedo(seed = 0): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(512, 1024)
  if (!ctx) return toTexture(canvas)
  const style = seed % 4
  const palette = WINDOW_PALETTES[style]
  ctx.fillStyle = FACADE_BASES[style]
  ctx.fillRect(0, 0, 512, 1024)
  paintFacade(ctx, style, palette, seed, false)
  return toTexture(canvas)
}

export function makeFacadeEmissive(seed = 0): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(512, 1024)
  if (!ctx) return toTexture(canvas)
  const style = seed % 4
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 512, 1024)
  paintFacade(ctx, style, WINDOW_PALETTES[style], seed, true)
  return toTexture(canvas)
}

function paintFacade(
  ctx: CanvasRenderingContext2D,
  style: number,
  palette: string[],
  seed: number,
  emissiveOnly: boolean,
): void {
  if (!emissiveOnly) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    for (let y = 0; y < 1024; y += style === 1 ? 140 : 110) ctx.fillRect(0, y, 512, 10)
    ctx.strokeStyle = 'rgba(0, 245, 160, 0.08)'
    ctx.lineWidth = 2
    const step = style === 1 ? 96 : 160
    for (let x = 0; x <= 512; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 1024)
      ctx.stroke()
    }
  }

  if (style === 0) {
    for (let y = 28; y < 990; y += 108) {
      if (hash(seed, 2, y) < 0.18) continue
      for (let x = 28; x < 480; x += 92) {
        drawWindow(ctx, x, y, 54, 28, palette, seed, 0.42, emissiveOnly)
      }
    }
  } else if (style === 1) {
    for (let x = 36; x < 480; x += 120) {
      for (let y = 24; y < 990; y += 70) {
        drawWindow(ctx, x, y, 28, 46, palette, seed, 0.38, emissiveOnly)
      }
    }
  } else if (style === 2) {
    for (let y = 36; y < 980; y += 150) {
      for (let x = 40; x < 470; x += 140) {
        if (hash(seed, x, y) < 0.35) continue
        drawWindow(ctx, x, y, 64, 70, palette, seed, 0.55, emissiveOnly)
      }
    }
  } else {
    for (let y = 40; y < 980; y += 180) {
      if (!emissiveOnly) {
        ctx.fillStyle = 'rgba(0, 201, 135, 0.12)'
        ctx.fillRect(0, y + 24, 512, 8)
      }
      for (let x = 48; x < 460; x += 160) {
        drawWindow(ctx, x, y, 72, 36, palette, seed, 0.48, emissiveOnly)
      }
    }
  }
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  palette: string[],
  seed: number,
  litChance: number,
  emissiveOnly: boolean,
): void {
  const lit = hash(seed, x, y) > 1 - litChance
  if (emissiveOnly && !lit) return
  if (!lit && emissiveOnly) return
  ctx.globalAlpha = lit ? 0.92 : 1
  ctx.fillStyle = lit ? palette[Math.floor(hash(seed + 4, x, y) * palette.length)] : '#0e1c1a'
  if (!emissiveOnly || lit) ctx.fillRect(x, y, w, h)
  if (lit && !emissiveOnly) {
    ctx.fillStyle = 'rgba(233, 255, 246, 0.16)'
    ctx.fillRect(x, y, w, Math.max(6, h * 0.22))
  }
  ctx.globalAlpha = 1
}

export function makeRoadAlbedo(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(256, 512)
  if (!ctx) return toTexture(canvas, 1, 4)
  ctx.fillStyle = '#142e2a'
  ctx.fillRect(0, 0, 256, 512)
  ctx.strokeStyle = 'rgba(24, 184, 201, 0.12)'
  ctx.lineWidth = 1
  for (let y = 0; y < 512; y += 22) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(256, y)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(0, 245, 160, 0.08)'
  ctx.fillRect(0, 0, 7, 512)
  ctx.fillRect(249, 0, 7, 512)
  return toTexture(canvas, 1, 4)
}

export function makeCityGrid(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(256, 256)
  if (!ctx) return toTexture(canvas, 18, 18)
  ctx.fillStyle = '#102923'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = 'rgba(0, 245, 160, 0.18)'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, 252, 252)
  ctx.strokeStyle = 'rgba(24, 184, 201, 0.12)'
  ctx.beginPath()
  ctx.moveTo(128, 0)
  ctx.lineTo(128, 256)
  ctx.moveTo(0, 128)
  ctx.lineTo(256, 128)
  ctx.stroke()
  return toTexture(canvas, 14, 18)
}

export function makeSkyTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(4, 256)
  if (!ctx) return toTexture(canvas)
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#081612')
  grad.addColorStop(0.4, '#102923')
  grad.addColorStop(0.62, '#123b32')
  grad.addColorStop(0.78, '#0f4a44')
  grad.addColorStop(0.9, '#186056')
  grad.addColorStop(1, '#123b32')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 4, 256)
  const tex = toTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.repeat.set(1, 1)
  return tex
}

export function makeHoloTexture(title: string, accent: string, sub: string): THREE.CanvasTexture {
  const { canvas, ctx } = canvas2d(512, 256)
  if (!ctx) return toTexture(canvas)
  ctx.fillStyle = '#102923'
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.16
  ctx.fillRect(0, 0, 512, 256)
  ctx.globalAlpha = 1
  ctx.strokeStyle = accent
  ctx.lineWidth = 8
  ctx.strokeRect(12, 12, 488, 232)
  ctx.fillStyle = accent
  ctx.font = 'bold 54px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, 256, 118)
  ctx.font = '28px sans-serif'
  ctx.fillStyle = '#e9fff6'
  ctx.fillText(sub, 256, 168)
  ctx.fillStyle = 'rgba(233,255,246,0.18)'
  for (let y = 20; y < 236; y += 8) {
    ctx.fillRect(18, y, 476, 1)
  }
  return toTexture(canvas)
}

function hash(seed: number, x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 45.164) * 43758.5453
  return n - Math.floor(n)
}
