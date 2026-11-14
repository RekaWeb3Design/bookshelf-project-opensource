import {easing} from 'maath'

type Stage = {start: number, duration: number}

// How an opened book is shown:
//   '3d'    it flies out and the project page is real DOM on its right-hand page
//   'card'  it flies out, but the page would be too small to read, so a 2D project card sits on top
//   'still' it stays on the shelf and the card fades in (prefers-reduced-motion)
export type OpenMode = '3d' | 'card' | 'still'

// One timeline (seconds) drives the whole open animation; closing plays it backwards.
export const OPEN = {
  pull: {start: 0, duration: 0.5}, // slide out of the slot
  fly: {start: 0.5, duration: 0.8}, // move to the reading position and turn to face the camera
  cover: {start: 1.2, duration: 0.7}, // front cover swings open
  sheets: {start: 1.4, duration: 0.6, stagger: 0.12}, // page sheets fan after the cover
  content: {start: 1.75, duration: 0.4}, // page text fades in
  total: 2.3,
}

export const PAGE_CSS_PX_PER_M = 2400 // layout density of the DOM page; at this many screen px per meter its 14px text is life-size
export const READ_FILL = 0.78 // the open book takes at most this much of the viewport's width and height
export const PULL_OUT = 0.21 // a bit more than the book depth, so it clears its neighbours
// Nearly flat, so the title sheet resting on it lies at ~5°.
export const COVER_OPEN = (-176 * Math.PI) / 180

// Eased 0..1 progress of a stage at timeline time t.
export const stage = (t: number, {start, duration}: Stage) =>
  easing.cubic.inOut(Math.min(1, Math.max(0, (t - start) / duration)))
