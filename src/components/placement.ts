import type {Rect, Vibe} from '../data/vibes'
import {BOOK, STANDING, rowY, shelfHeight, type ShelfDims} from './layout'

// Maps a vibe's image-space rects to the 3D world, so the shelf lands in its slot in the photo.
//
// World frame (meters): the shelf's bottom center is the origin, +z toward the camera.
// The camera never rotates: it looks straight down -z, like the photo's own camera, and the backplate is a
// plane behind the shelf that fills the photo's full frustum. Cropping/zooming is done with an off-center
// frustum (see viewRect/frustum), so the perspective of the shelf always matches the photo.

export const IMAGE_ASPECT = 2400 / 1340
const FOV = 50 // assumed horizontal field of view of the photos, degrees
const FOCAL = 1 / (2 * Math.tan((FOV * Math.PI) / 360)) // focal length in image widths
const ALCOVE_ROW_GAP = 0.335 // alcoves are scaled so their rows come out this tall
const PLATE_GAP = 0.01 // the backplate sits this far behind the shelf's back

export type Placement = {
  dims: ShelfDims
  camera: [number, number, number]
  vanish: [number, number] // principal point, image fractions
  plate: {position: [number, number, number], width: number, height: number}
  metersPerWidth: number // meters per image width, at the shelf's front plane
  shelfRect: Rect // the shelf's front face in the image, fractions
  rowCenters: number[] // image y (fraction) of the middle of each row's books, top row first
}

const frac = (r: Rect) => ({x0: r.x0 / 100, x1: r.x1 / 100, y0: r.y0 / 100, y1: r.y1 / 100})

export const place = (vibe: Vibe): Placement => {
  const slot = frac(vibe.slot)
  const slotW = slot.x1 - slot.x0
  const slotCx = (slot.x0 + slot.x1) / 2
  let dims: ShelfDims
  let vanish: [number, number]
  let k: number // meters per image width, at the shelf's front plane
  let floorDist: number // camera distance to where the floor line (slot.y1) is

  if (vibe.mode === 'alcove') {
    // The back wall looks smaller than the opening by s; that ratio fixes the vanishing point and the depth.
    const back = frac(vibe.back)
    const s = (back.x1 - back.x0) / slotW
    vanish = [
      ((back.x0 + back.x1) / 2 - s * slotCx) / (1 - s),
      ((back.y0 + back.y1) / 2 - s * (slot.y0 + slot.y1) / 2) / (1 - s),
    ]
    const height = vibe.rows * ALCOVE_ROW_GAP
    k = (height * IMAGE_ASPECT) / (slot.y1 - slot.y0)
    dims = {
      innerWidth: k * slotW,
      depth: k * FOCAL * (1 / s - 1),
      plankT: 0.02,
      sideT: 0,
      rowGap: ALCOVE_ROW_GAP,
      rows: vibe.rows,
      boxed: false,
      plinth: 0,
    }
    floorDist = k * FOCAL // the slot's bottom is the floor's front edge
  } else {
    // Largest shelf whose front face stays inside the slot, standing on the wall/floor line.
    vanish = [vibe.vanish[0] / 100, vibe.vanish[1] / 100]
    dims = {...STANDING, rows: vibe.rows}
    const width = dims.innerWidth + dims.sideT * 2
    const height = shelfHeight(dims)
    k = Math.max(
      width / slotW,
      (height * IMAGE_ASPECT - (slot.y1 - vanish[1]) * dims.depth / FOCAL) / (slot.y1 - slot.y0),
    )
    floorDist = k * FOCAL + dims.depth // the slot's bottom is where the wall behind the shelf meets the floor
  }

  const cameraZ = dims.depth / 2 + k * FOCAL
  const camera: [number, number, number] = [
    (vanish[0] - slotCx) * k,
    (slot.y1 - vanish[1]) * floorDist / FOCAL / IMAGE_ASPECT,
    cameraZ,
  ]
  // Where the front face lands in the image (an alcove's is its slot; a standing case's front is nearer than its wall line).
  const frontBottom = vanish[1] + (slot.y1 - vanish[1]) * floorDist / (k * FOCAL)
  const perMeter = IMAGE_ASPECT / k // image height fraction per meter, at the front plane
  const halfWidth = (dims.innerWidth / 2 + dims.sideT) / k
  const shelfRect = {x0: slotCx - halfWidth, x1: slotCx + halfWidth, y0: frontBottom - shelfHeight(dims) * perMeter, y1: frontBottom}
  const rowCenters = Array.from({length: dims.rows}, (_, r) => frontBottom - (rowY(dims, r) + BOOK.height / 2) * perMeter)

  const plateZ = -dims.depth / 2 - PLATE_GAP
  const width = (cameraZ - plateZ) / FOCAL
  const height = width / IMAGE_ASPECT
  return {
    dims,
    camera,
    vanish,
    plate: {
      position: [camera[0] + (0.5 - vanish[0]) * width, camera[1] + (vanish[1] - 0.5) * height, plateZ],
      width,
      height,
    },
    metersPerWidth: k,
    shelfRect,
    rowCenters,
  }
}

// The part of the image the viewport shows: cover-fit, then zoomed in toward the vibe's focus (default: the slot center).
// Image fractions. This is the large-screen framing; see frameView for small screens.
export const viewRect = (vibe: Vibe, viewportAspect: number): Rect => {
  const slot = frac(vibe.slot)
  const coverW = Math.min(1, viewportAspect / IMAGE_ASPECT)
  const coverH = Math.min(1, IMAGE_ASPECT / viewportAspect)
  // Never zoom so far that the slot itself gets cropped.
  const zoom = Math.max(1, Math.min(vibe.zoom, coverW / ((slot.x1 - slot.x0) * 1.08), coverH / ((slot.y1 - slot.y0) * 1.08)))
  const w = coverW / zoom
  const h = coverH / zoom
  const [focusX, focusY] = vibe.focus ? [vibe.focus[0] / 100, vibe.focus[1] / 100] : [(slot.x0 + slot.x1) / 2, (slot.y0 + slot.y1) / 2]
  const x0 = Math.min(1 - w, Math.max(0, focusX - w / 2))
  const y0 = Math.min(1 - h, Math.max(0, focusY - h / 2))
  return {x0, x1: x0 + w, y0, y1: y0 + h}
}

export type Viewport = {width: number, height: number}
// Where a small screen is looking: which row (when they don't all fit) and how far along the shelf (0 = left end, 1 = right end).
export type Nav = {row: number, pan: number}

// Phones and small tablets, portrait or landscape.
export const isSmallScreen = ({width, height}: Viewport) => width < 768 || height < 500

const SMALL_SCREEN_BOOK_PX = 150 // a standard book is at least this tall on a small screen, so spine titles stay readable
const EDGE = 0.012 // margin kept around the shelf when framing it tightly, image widths

// What the viewport shows. Large screens: viewRect. Small screens: zoomed in until the books are readable;
// if the shelf then no longer fits, it can be panned sideways (`panRange`) and/or is shown one row at a time (`paged`).
export const frameView = (vibe: Vibe, placement: Placement, viewport: Viewport, nav: Nav = {row: 0, pan: 0}) => {
  const aspect = viewport.width / viewport.height
  const wide = viewRect(vibe, aspect)
  if (!isSmallScreen(viewport)) return {view: wide, panRange: 0, paged: false}

  const {shelfRect: shelf, rowCenters, metersPerWidth} = placement
  const bookHeight = (BOOK.height * IMAGE_ASPECT) / metersPerWidth // fraction of the image height
  const h = Math.min(wide.y1 - wide.y0, (bookHeight * viewport.height) / SMALL_SCREEN_BOOK_PX)
  const w = (h * aspect) / IMAGE_ASPECT

  // How far the view can slide along the shelf, image widths (0: the whole shelf fits).
  const panRange = shelf.x1 - shelf.x0 > w ? shelf.x1 - shelf.x0 + EDGE * 2 - w : 0
  const x = panRange ? shelf.x0 - EDGE + panRange * nav.pan : (shelf.x0 + shelf.x1) / 2 - w / 2

  const paged = (shelf.y1 - shelf.y0) * 1.02 > h
  const edgeY = EDGE * IMAGE_ASPECT
  const row = rowCenters[Math.min(nav.row, rowCenters.length - 1)]
  const y = paged
    ? Math.min(shelf.y1 + edgeY - h, Math.max(shelf.y0 - edgeY, row - h / 2))
    : (shelf.y0 + shelf.y1) / 2 - h / 2

  const x0 = Math.min(1 - w, Math.max(0, x))
  const y0 = Math.min(1 - h, Math.max(0, y))
  return {view: {x0, x1: x0 + w, y0, y1: y0 + h}, panRange, paged}
}

// Off-center frustum (at the near plane) that shows exactly `view` of the image.
export const frustum = (view: Rect, vanish: [number, number], near: number) => ({
  left: (view.x0 - vanish[0]) / FOCAL * near,
  right: (view.x1 - vanish[0]) / FOCAL * near,
  top: (vanish[1] - view.y0) / FOCAL / IMAGE_ASPECT * near,
  bottom: (vanish[1] - view.y1) / FOCAL / IMAGE_ASPECT * near,
})
