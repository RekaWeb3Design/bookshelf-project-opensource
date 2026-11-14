import {fillCloth} from './cloth'
import {SERIF} from './materials'

export const SPINE_PX_PER_M = 4096 // texture density: ~4 px per mm keeps titles crisp up close

export type SpineInput = {
  title?: string
  year?: number
  status?: string
  color: string
  accent?: string
  soon?: boolean
}

// Draws the spine face to a canvas: cloth, foil strips, rotated title, year/status mark.
export const drawSpine = (input: SpineInput, linen: CanvasImageSource, widthM: number, heightM: number) => {
  const canvas = document.createElement('canvas')
  const w = Math.max(64, Math.round(widthM * SPINE_PX_PER_M))
  const h = Math.round(heightM * SPINE_PX_PER_M)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Cloth + soft shading toward the edges, where the spine rounds into the covers
  fillCloth(ctx, input.color, linen, SPINE_PX_PER_M)
  const shade = ctx.createLinearGradient(0, 0, w, 0)
  shade.addColorStop(0, 'rgba(0,0,0,0.3)')
  shade.addColorStop(0.18, 'rgba(0,0,0,0)')
  shade.addColorStop(0.82, 'rgba(0,0,0,0)')
  shade.addColorStop(1, 'rgba(0,0,0,0.3)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, w, h)

  const accent = input.accent ?? '#d8c08a'

  if (input.soon) {
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.rotate(Math.PI / 2)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = `italic ${Math.round(w * 0.32)}px ${SERIF}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('soon', 0, 0)
    ctx.restore()
    return canvas
  }

  // Foil strips top and bottom
  ctx.fillStyle = accent
  const strip = Math.round(h * 0.012)
  ctx.fillRect(0, h * 0.06, w, strip)
  ctx.fillRect(0, h * 0.06 + strip * 2, w, strip / 2)
  ctx.fillRect(0, h * 0.86, w, strip / 2)
  ctx.fillRect(0, h * 0.86 + strip, w, strip)

  // Title, rotated to read top-to-bottom; shrink to fit the available length
  const title = input.title ?? ''
  const maxLen = h * 0.66
  let size = Math.round(w * 0.42)
  ctx.font = `600 ${size}px ${SERIF}`
  while (ctx.measureText(title).width > maxLen && size > 10) {
    size -= 2
    ctx.font = `600 ${size}px ${SERIF}`
  }
  ctx.save()
  ctx.translate(w / 2, h * 0.47)
  ctx.rotate(Math.PI / 2)
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, 0, 0)
  ctx.restore()

  // Year + status dot near the bottom
  ctx.fillStyle = accent
  ctx.font = `${Math.round(w * 0.2)}px ${SERIF}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (input.year) ctx.fillText(String(input.year).slice(2), w / 2, h * 0.93)
  const dot = {live: '#7fd18b', wip: '#f0c35a', idea: '#9bb7ff'}[input.status ?? ''] ?? accent
  ctx.fillStyle = dot
  ctx.beginPath()
  ctx.arc(w / 2, h * 0.965, w * 0.06, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}
