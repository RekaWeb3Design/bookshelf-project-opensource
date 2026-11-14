import {CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Material} from 'three'

export const SERIF = "'Fraunces Variable', Georgia, serif" // the one typeface: spines, covers, pages, DOM
export const PAPER_URL = '/textures/paper.webp'
export const LINEN_URL = '/textures/linen.webp'

// The whole frame is ACES tone-mapped in postprocessing. Photos and page art are already "display" colors,
// so their materials apply the exact inverse here and come out of the tone mapper unchanged.
const INVERSE_ACES = /* glsl */`
  {
    // Inverse of three's ACESFilmicToneMapping: its two matrices inverted ahead of time, RRTAndODTFit solved for its input.
    const mat3 ACESInputMatInv = mat3(1.764741, -0.147028, -0.036337, -0.675778, 1.160252, -0.162436, -0.088963, -0.013224, 1.198773);
    const mat3 ACESOutputMatInv = mat3(0.643038, 0.059269, 0.005962, 0.311187, 0.931436, 0.063929, 0.045775, 0.009295, 0.930118);
    vec3 y = clamp(ACESOutputMatInv * gl_FragColor.rgb, 0.0, 1.0);
    vec3 a = 1.0 - 0.983729 * y;
    vec3 b = 0.0245786 - 0.4329510 * y;
    vec3 c = -0.000090537 - 0.238081 * y;
    vec3 v = (-b + sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a);
    gl_FragColor.rgb = ACESInputMatInv * v * 0.6 / toneMappingExposure;
  }
`

export const displayReferred = <T extends Material>(material: T) => {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform float toneMappingExposure;\nvoid main() {') // set by the renderer
      .replace('#include <tonemapping_fragment>', INVERSE_ACES)
  }
  return material
}

const PAGE = '#e9d5aa' // matches paper.webp under the lamp

// Fine lines across the thickness, so a page block reads as a stack of sheets.
const makePageEdgeTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 4
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = PAGE
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let x = 0; x < canvas.width; x++) {
    const tone = Math.random()
    ctx.fillStyle = tone < 0.3 ? `rgba(70,45,15,${0.1 + tone})` : `rgba(255,250,235,${(tone - 0.3) * 0.5})`
    ctx.fillRect(x, 0, 1, canvas.height)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  return texture
}

// Shared by every book — fewer GPU state changes.
export const pageMaterial = new MeshStandardMaterial({color: PAGE, roughness: 0.95})
const pageEdgeMaterial = new MeshStandardMaterial({map: makePageEdgeTexture(), roughness: 0.95})
// For a twoToneBox: plain paper on the big faces, the sheet edges on top, bottom and fore-edge.
export const pageBlockMaterials = [pageMaterial, pageEdgeMaterial]
