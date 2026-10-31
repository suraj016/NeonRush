import * as THREE from 'three'

function canvas(size: number): CanvasRenderingContext2D {
  const el = document.createElement('canvas')
  el.width = size
  el.height = size
  return el.getContext('2d') as CanvasRenderingContext2D
}

function tex(ctx: CanvasRenderingContext2D): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(ctx.canvas)
  map.wrapS = THREE.RepeatWrapping
  map.wrapT = THREE.RepeatWrapping
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 4
  return map
}

export function makeSandTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  ctx.fillStyle = '#d7c08a'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1400; i += 1) {
    const tone = i % 4
    ctx.fillStyle = tone === 0 ? '#c9a86a' : tone === 1 ? '#e6d2a4' : tone === 2 ? '#b89460' : '#dcc896'
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    ctx.ellipse((i * 47) % 256, (i * 89) % 256, 1 + (i % 5), 0.6 + (i % 3) * 0.4, (i % 8) * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  return tex(ctx)
}

export function makeCanyonTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  ctx.fillStyle = '#a87a4c'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1100; i += 1) {
    const tone = i % 4
    ctx.fillStyle = tone === 0 ? '#c6a06a' : tone === 1 ? '#8c5a36' : tone === 2 ? '#b88854' : '#6f4630'
    ctx.globalAlpha = 0.16
    ctx.beginPath()
    ctx.ellipse((i * 53) % 256, (i * 97) % 256, 8 + (i % 14), 3 + (i % 6), (i % 5) * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 0.12
  for (let y = 18; y < 256; y += 28 + (y % 9)) {
    ctx.fillStyle = '#d4b888'
    ctx.fillRect(0, y + ((y * 3) % 5), 256, 2)
  }
  ctx.globalAlpha = 1
  const map = tex(ctx)
  map.repeat.set(1.4, 2)
  return map
}

export function makeSandstoneTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  ctx.fillStyle = '#c09a64'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 800; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? '#a87848' : i % 3 === 1 ? '#d4b27a' : '#8c5e38'
    ctx.globalAlpha = 0.14
    ctx.fillRect((i * 29) % 256, (i * 73) % 256, 6 + (i % 10), 2)
  }
  ctx.globalAlpha = 0.18
  ctx.strokeStyle = '#6b4128'
  for (let i = 0; i < 18; i += 1) {
    ctx.beginPath()
    ctx.moveTo((i * 41) % 256, 0)
    ctx.lineTo((i * 53 + 40) % 256, 256)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  return tex(ctx)
}

export function makeStoneRoadTexture(): THREE.CanvasTexture {
  const ctx = canvas(512)
  ctx.fillStyle = '#cbb07a'
  ctx.fillRect(0, 0, 512, 512)
  const slabs = [
    '#b48a58',
    '#c9a06a',
    '#a87a4a',
    '#d2b080',
    '#9a6c40',
    '#c09460',
  ]
  for (let i = 0; i < 70; i += 1) {
    const x = (i * 73 + (i % 5) * 17) % 500
    const y = (i * 47 + (i % 7) * 13) % 500
    const w = 38 + (i % 9) * 8
    const h = 22 + (i % 6) * 6
    ctx.fillStyle = slabs[i % slabs.length]
    ctx.globalAlpha = 0.92
    ctx.beginPath()
    ctx.moveTo(x + 2, y + 4)
    ctx.lineTo(x + w, y + (i % 3))
    ctx.lineTo(x + w - 3, y + h)
    ctx.lineTo(x + (i % 5), y + h - 2)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#7a5332'
    ctx.globalAlpha = 0.35
    ctx.stroke()
  }
  ctx.globalAlpha = 0.28
  ctx.strokeStyle = '#5c3a24'
  ctx.lineWidth = 1
  for (let i = 0; i < 24; i += 1) {
    ctx.beginPath()
    ctx.moveTo((i * 51) % 512, (i * 19) % 512)
    ctx.lineTo((i * 51 + 18 + (i % 11)) % 512, (i * 19 + 40) % 512)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.4
  for (let i = 0; i < 80; i += 1) {
    ctx.fillStyle = i % 2 ? '#8a6240' : '#d8c090'
    ctx.fillRect((i * 67) % 512, (i * 91) % 512, 2, 2)
  }
  ctx.globalAlpha = 1
  const map = tex(ctx)
  map.repeat.set(1, 2)
  return map
}

export function makeSnowTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  ctx.fillStyle = '#edf3f5'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1100; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#c7d9e2' : '#e4eef2'
    ctx.globalAlpha = 0.2
    ctx.beginPath()
    ctx.ellipse((i * 53) % 256, (i * 97) % 256, 2 + (i % 5), 1 + (i % 3), (i % 6) * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  return tex(ctx)
}

export function makePackedSnowTexture(): THREE.CanvasTexture {
  const ctx = canvas(512)
  ctx.fillStyle = '#8ea8b6'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 64; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? '#7a94a4' : i % 3 === 1 ? '#a8c0cc' : '#6d8796'
    ctx.globalAlpha = 0.55
    const x = (i * 71 + (i % 4) * 13) % 500
    const y = (i * 53 + (i % 5) * 11) % 500
    ctx.beginPath()
    ctx.moveTo(x, y + 3)
    ctx.lineTo(x + 46 + (i % 8) * 4, y)
    ctx.lineTo(x + 42, y + 18 + (i % 5))
    ctx.lineTo(x + 2, y + 16)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalAlpha = 0.35
  ctx.strokeStyle = '#5c7382'
  ctx.lineWidth = 1
  for (let i = 0; i < 28; i += 1) {
    ctx.beginPath()
    ctx.moveTo((i * 47) % 512, (i * 23) % 512)
    ctx.lineTo((i * 47 + 22) % 512, (i * 23 + 36) % 512)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#edf3f5'
  for (let i = 0; i < 50; i += 1) ctx.fillRect((i * 61) % 512, (i * 89) % 512, 10, 3)
  ctx.globalAlpha = 1
  const map = tex(ctx)
  map.repeat.set(1, 2)
  return map
}

export function makeAlpineRockTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  ctx.fillStyle = '#526e83'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 700; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? '#344b60' : i % 3 === 1 ? '#6a8496' : '#42586a'
    ctx.globalAlpha = 0.18
    ctx.fillRect((i * 41) % 256, (i * 73) % 256, 5 + (i % 8), 2)
  }
  ctx.globalAlpha = 0.2
  ctx.fillStyle = '#edf3f5'
  for (let i = 0; i < 80; i += 1) ctx.fillRect((i * 29) % 256, (i * 17) % 40, 8, 2)
  ctx.globalAlpha = 1
  return tex(ctx)
}

export function makeIceTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  ctx.fillStyle = '#b9ddeb'
  ctx.fillRect(0, 0, 256, 256)
  ctx.strokeStyle = '#79b9d0'
  ctx.globalAlpha = 0.45
  for (let i = 0; i < 26; i += 1) {
    ctx.beginPath()
    ctx.moveTo((i * 37) % 256, (i * 19) % 256)
    ctx.lineTo((i * 37 + 30) % 256, (i * 19 + 48) % 256)
    ctx.stroke()
  }
  ctx.fillStyle = '#edf3f5'
  ctx.globalAlpha = 0.18
  for (let i = 0; i < 40; i += 1) ctx.fillRect((i * 51) % 256, (i * 67) % 256, 14, 2)
  ctx.globalAlpha = 1
  return tex(ctx)
}

export function makeWoodTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  ctx.fillStyle = '#79563b'
  ctx.fillRect(0, 0, 256, 256)
  for (let x = 0; x < 256; x += 18) {
    ctx.fillStyle = x % 36 === 0 ? '#6a4a32' : '#8a6644'
    ctx.globalAlpha = 0.35
    ctx.fillRect(x, 0, 14, 256)
  }
  ctx.globalAlpha = 0.2
  ctx.strokeStyle = '#4a3224'
  for (let i = 0; i < 16; i += 1) {
    ctx.beginPath()
    ctx.moveTo(0, (i * 31) % 256)
    ctx.lineTo(256, (i * 31 + 8) % 256)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  return tex(ctx)
}

export function makeDesertSkyTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#c9d7e6')
  grad.addColorStop(0.32, '#e7d3b0')
  grad.addColorStop(0.62, '#efd2a4')
  grad.addColorStop(1, '#d7b888')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#fff3cc'
  ctx.beginPath()
  ctx.arc(196, 78, 22, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 244, 210, 0.28)'
  ctx.beginPath()
  ctx.arc(196, 78, 40, 0, Math.PI * 2)
  ctx.fill()
  const map = tex(ctx)
  map.repeat.set(1, 1)
  return map
}

export function makeFrozenSkyTexture(): THREE.CanvasTexture {
  const ctx = canvas(256)
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#dce7ef')
  grad.addColorStop(0.4, '#e8eef2')
  grad.addColorStop(0.72, '#cfdce4')
  grad.addColorStop(1, '#b7c6d0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#fff8ee'
  ctx.beginPath()
  ctx.arc(72, 86, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 248, 238, 0.22)'
  ctx.beginPath()
  ctx.arc(72, 86, 32, 0, Math.PI * 2)
  ctx.fill()
  const map = tex(ctx)
  map.repeat.set(1, 1)
  return map
}
