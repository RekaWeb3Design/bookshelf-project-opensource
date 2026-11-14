import {useEffect, useMemo} from 'react'
import {BoxGeometry, CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace} from 'three'

const TILE_M = 0.7 // one texture tile covers this much wood, on every board
const TILE_PX = 1024

// Procedural wood, seamless in both directions: soft tonal bands plus many fine, slightly wavy grain lines along u.
// Kept low-contrast so repeats don't show on large panels.
const makeWoodTexture = (color: string) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TILE_PX
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, TILE_PX, TILE_PX)

  // A wavy line drawn three times (y - tile, y, y + tile) wraps vertically; whole sine periods wrap horizontally.
  const grainLine = (y: number, width: number, style: string) => {
    const waves = 1 + Math.floor(Math.random() * 3)
    const amp = 2 + Math.random() * 7
    const phase = Math.random() * Math.PI * 2
    ctx.strokeStyle = style
    ctx.lineWidth = width
    for (const offset of [-TILE_PX, 0, TILE_PX]) {
      ctx.beginPath()
      for (let x = 0; x <= TILE_PX; x += 16) {
        ctx.lineTo(x, y + offset + Math.sin((x / TILE_PX) * Math.PI * 2 * waves + phase) * amp)
      }
      ctx.stroke()
    }
  }
  for (let i = 0; i < 14; i++) {
    grainLine(Math.random() * TILE_PX, 30 + Math.random() * 70, `rgba(${Math.random() > 0.5 ? '0,0,0' : '255,235,200'},0.035)`)
  }
  for (let i = 0; i < 420; i++) {
    const dark = Math.random() > 0.4
    grainLine(Math.random() * TILE_PX, 0.6 + Math.random() * 1.6, `rgba(${dark ? '25,14,6' : '255,225,185'},${0.03 + Math.random() * 0.09})`)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 8
  return texture
}

export const useWoodMaterial = (color: string) => {
  const material = useMemo(() => new MeshStandardMaterial({map: makeWoodTexture(color), roughness: 0.92}), [color])
  useEffect(() => () => {
    material.map?.dispose()
    material.dispose()
  }, [material])
  return material
}

// A box whose UVs are in real-world scale, so the grain is the same size on every board instead of stretching
// to fit each face. The grain follows the longer side of each face; `shift` keeps boards from looking identical.
export const woodBoxGeometry = (w: number, h: number, d: number, shift = 0) => {
  const geometry = new BoxGeometry(w, h, d)
  const uv = geometry.attributes.uv
  // Face order: +x, -x, +y, -y, +z, -z — four vertices each; [size along u, size along v].
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]
  faces.forEach(([sizeU, sizeV], face) => {
    for (let i = face * 4; i < face * 4 + 4; i++) {
      const u = (uv.getX(i) * sizeU) / TILE_M + shift + face * 0.37
      const v = (uv.getY(i) * sizeV) / TILE_M + shift * 0.61 + face * 0.21
      if (sizeV > sizeU) uv.setXY(i, v, u)
      else uv.setXY(i, u, v)
    }
  })
  return geometry
}
