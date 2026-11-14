// A vibe = one photographic backplate plus everything needed to make the shelf sit in it.
// Rects are in % of the full image, origin top-left (press "C" in dev to nudge them live).
export type Rect = {x0: number, x1: number, y0: number, y1: number}

export type Light = {color: string, intensity: number, position: [number, number, number]}

type VibeBase = {
  id: string
  label: string
  image: string // full-size backplate, loaded only when selected
  thumb: string
  zoom: number // crop-in toward the focus
  focus?: [number, number] // what the zoom centers on, % of the image; defaults to the slot center
  rows: number
  wood: string // plank base color, matched to the photo
  exposure: number // tone-mapping exposure for the 3D objects (the photo itself is unaffected)
  // Light positions are in meters from the shelf's bottom center: +x right, +y up, +z toward the camera.
  lights: {
    ambient: {sky: string, ground: string, intensity: number}
    warm: Light // key light from the photo's lamp; casts the shadows
    cool: Light // rim light from the photo's window
  }
  shadow: number // 0..1 darkness of the shadows cast onto the photo
  keyShadow: number // 0..1 how dark the key light's shadows are (lower = softer shadows inside the shelf)
}

// "alcove": the photo's recess is the bookcase — only planks + books are rendered.
//   slot = the front opening (y1 = floor/ledge front edge), back = the inner back wall.
//   The two rects together give the photo's vanishing point and the recess depth.
// "standing": our freestanding shelf stands against a wall.
//   slot = the area the shelf front must stay inside (the largest shelf that fits is used), y1 = the wall/floor line.
export type Vibe =
  | VibeBase & {mode: 'alcove', slot: Rect, back: Rect}
  | VibeBase & {mode: 'standing', slot: Rect, vanish: [number, number]}

export const vibes: Vibe[] = [
  {
    id: 'observatory',
    label: 'Observatory',
    image: '/vibes/observatory.webp',
    thumb: '/vibes/observatory-thumb.webp',
    mode: 'alcove',
    slot: {x0: 36.6, x1: 63.2, y0: 28.3, y1: 85.7},
    back: {x0: 38.6, x1: 61.2, y0: 31.7, y1: 80},
    zoom: 1.25,
    rows: 2,
    wood: '#6b5747',
    exposure: 1,
    lights: {
      ambient: {sky: '#5a6488', ground: '#4a3020', intensity: 0.8},
      warm: {color: '#ffc48a', intensity: 9, position: [-1.1, 0.9, 1.8]},
      cool: {color: '#9db4ff', intensity: 0.8, position: [1.8, 1.2, 1.2]},
    },
    shadow: 0.5,
    keyShadow: 1,
  },
  {
    id: 'space',
    label: 'Space station',
    image: '/vibes/space.webp',
    thumb: '/vibes/space-thumb.webp',
    mode: 'alcove',
    slot: {x0: 37.4, x1: 62, y0: 28.3, y1: 72.2},
    back: {x0: 38, x1: 60, y0: 30, y1: 70.9},
    zoom: 1.35,
    rows: 2,
    wood: '#6b5650',
    exposure: 1,
    lights: {
      ambient: {sky: '#7a70b0', ground: '#4a3028', intensity: 0.9},
      warm: {color: '#ffc890', intensity: 9, position: [-1.2, 0.8, 1.7]},
      cool: {color: '#a9a4ff', intensity: 1.2, position: [1.8, 0.8, 1.2]},
    },
    shadow: 0.45,
    keyShadow: 1,
  },
  {
    id: 'nerdy',
    label: 'Nerdy study',
    image: '/vibes/nerdy.webp',
    thumb: '/vibes/nerdy-thumb.webp',
    mode: 'standing',
    slot: {x0: 32, x1: 67.5, y0: 59.5, y1: 89.5},
    vanish: [50, 55],
    zoom: 1.45,
    focus: [49.75, 59],
    rows: 2,
    wood: '#5a4636',
    exposure: 1,
    lights: {
      ambient: {sky: '#5a6a84', ground: '#3a2a1c', intensity: 1.5},
      warm: {color: '#ffc488', intensity: 9, position: [-1.3, 1.1, 2]},
      cool: {color: '#7f9fe0', intensity: 1.0, position: [1.9, 1.3, 1.0]},
    },
    shadow: 0.75,
    keyShadow: 0.55,
  },
  {
    id: 'lofi',
    label: 'Lofi attic',
    image: '/vibes/lofi.webp',
    thumb: '/vibes/lofi-thumb.webp',
    mode: 'standing',
    slot: {x0: 36, x1: 66, y0: 43, y1: 75},
    vanish: [50, 52],
    zoom: 1.45,
    focus: [51, 50],
    rows: 2,
    wood: '#aa8f68',
    exposure: 1,
    lights: {
      ambient: {sky: '#b08a80', ground: '#5a3a26', intensity: 1.3},
      warm: {color: '#ffd2a4', intensity: 8.5, position: [-1.2, 1.1, 2]},
      cool: {color: '#c58cff', intensity: 1.0, position: [1.9, 1.0, 1.0]},
    },
    shadow: 0.7,
    keyShadow: 0.55,
  },
]

export const findVibe = (id: string | null) => vibes.find((v) => v.id === id) ?? null
