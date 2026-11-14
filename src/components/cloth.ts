const TILE_PX = 256
export const CLOTH_TILE_M = 0.045 // one tile of weave covers this much book

const cache = new Map<string, HTMLCanvasElement>()

// Book cloth: the book's color with the linen weave worked into it (overlay keeps the color's brightness).
// Spines, covers and cover art all start from this tile, so they match where they meet.
export const clothTile = (color: string, linen: CanvasImageSource) => {
  const cached = cache.get(color)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TILE_PX
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, TILE_PX, TILE_PX)
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = 0.75
  ctx.drawImage(linen, 0, 0, TILE_PX, TILE_PX)
  cache.set(color, canvas)
  return canvas
}

// Fills a canvas drawn at pxPerM with the cloth, at the same weave size everywhere.
export const fillCloth = (ctx: CanvasRenderingContext2D, color: string, linen: CanvasImageSource, pxPerM: number) => {
  const pattern = ctx.createPattern(clothTile(color, linen), 'repeat')!
  const scale = (CLOTH_TILE_M * pxPerM) / TILE_PX
  pattern.setTransform(new DOMMatrix().scale(scale))
  ctx.fillStyle = pattern
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}
