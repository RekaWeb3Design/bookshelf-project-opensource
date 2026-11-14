import {useSyncExternalStore} from 'react'

// The visitor's own zoom on top of the default framing: 1 = default, up to MAX_ZOOM.
// `center` is the point of the photo (image fractions) the zoomed view is centered on; null follows the default framing.
export const MAX_ZOOM = 2.5
export type ViewZoom = {zoom: number, center: [number, number] | null}

let state: ViewZoom = {zoom: 1, center: null}
const listeners = new Set<() => void>()

export const getViewZoom = () => state

export const setViewZoom = (next: ViewZoom) => {
  const zoom = Math.min(MAX_ZOOM, Math.max(1, next.zoom))
  state = zoom <= 1.001 ? {zoom: 1, center: null} : {zoom, center: next.center}
  listeners.forEach((listener) => listener())
}

// Buttons: zoom about the middle of the current view.
export const zoomBy = (factor: number) => setViewZoom({...state, zoom: state.zoom * factor})
export const resetZoom = () => setViewZoom({zoom: 1, center: null})

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

export const useViewZoom = () => useSyncExternalStore(subscribe, getViewZoom)

// Set while a pinch or drag is going on (and a moment after): a finger lifted at the end of one must not open a book.
let gestureUntil = 0
export const markGesture = () => {
  gestureUntil = performance.now() + 250
}
export const inGesture = () => performance.now() < gestureUntil
