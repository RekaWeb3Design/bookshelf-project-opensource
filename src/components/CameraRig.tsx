import {useEffect, useLayoutEffect, useRef} from 'react'
import {useFrame, useThree} from '@react-three/fiber'
import {easing} from 'maath'
import type {Rect, Vibe} from '../data/vibes'
import {MAX_ZOOM, getViewZoom, markGesture, setViewZoom} from '../viewZoom'
import {htmlLayer} from './htmlLayer'
import {frameView, frustum, type Placement} from './placement'

const DRIFT = 0.004 // how far the view follows the pointer, in image widths — backplate and shelf move as one
const SWIPE_PX = 40 // a vertical swipe at least this long turns to the next/previous row
const DRAG_PX = 8 // movement before a press counts as a drag rather than a tap/click
const DOUBLE_TAP_MS = 320
const DOUBLE_ZOOM = 2 // what a double-click/double-tap zooms to

type CameraRigProps = {
  vibe: Vibe
  placement: Placement
  row: number // which row a small screen is looking at
  still: boolean // a book is open, or calibrating: no drift, no gestures
  reading: boolean // a book is out of its slot: show the default framing (the zoom comes back once it's home)
  calm: boolean // prefers-reduced-motion: no drift, and view changes snap instead of easing
  onRowStep: (step: number) => void
  onPanned: () => void // the user dragged or pinched the view
}

// The visitor's zoom applied to the default framing: a smaller window onto the same photo, kept inside it.
const zoomedView = (base: Rect, zoom: number, center: [number, number] | null): Rect => {
  const w = (base.x1 - base.x0) / zoom
  const h = (base.y1 - base.y0) / zoom
  const [cx, cy] = center ?? [(base.x0 + base.x1) / 2, (base.y0 + base.y1) / 2]
  const x0 = Math.min(1 - w, Math.max(0, cx - w / 2))
  const y0 = Math.min(1 - h, Math.max(0, cy - h / 2))
  return {x0, x1: x0 + w, y0, y1: y0 + h}
}

// The camera stands where the photo's camera stood and never moves or turns. Everything the viewport shows of the
// image — cover-fit, framing, zoom, pan, pointer drift — is an off-center frustum, so the shelf's perspective can't
// slide against the photo.
export const CameraRig = ({vibe, placement, row, still, reading, calm, onRowStep, onPanned}: CameraRigProps) => {
  const camera = useThree((state) => state.camera)
  const canvas = useThree((state) => state.gl.domElement)
  const drift = useRef({x: 0, y: 0})
  const pan = useRef(0) // 0..1 along the shelf, small screens at the default zoom
  const shown = useRef<{x: number, y: number, w: number, h: number} | null>(null) // the view on screen, eased toward its target
  const framing = useRef({paged: false, panPerPx: 0, base: {x0: 0, x1: 1, y0: 0, y1: 1} as Rect, view: {x0: 0, x1: 1, y0: 0, y1: 1} as Rect})
  const stillRef = useRef(still)
  useEffect(() => {
    stillRef.current = still
  }, [still])

  useLayoutEffect(() => {
    camera.position.set(...placement.camera)
    camera.rotation.set(0, 0, 0)
    camera.updateMatrixWorld()
  }, [camera, placement])

  useEffect(() => {
    // Screen point → image point, through the current (target) view.
    const toImage = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect()
      const {view} = framing.current
      const sx = (clientX - r.left) / r.width
      const sy = (clientY - r.top) / r.height
      return {sx, sy, x: view.x0 + sx * (view.x1 - view.x0), y: view.y0 + sy * (view.y1 - view.y0)}
    }
    // Zoom so the image point under the screen point stays where it is.
    const zoomAt = (zoom: number, clientX: number, clientY: number) => {
      const {base} = framing.current
      const p = toImage(clientX, clientY)
      const next = Math.min(MAX_ZOOM, Math.max(1, zoom))
      const w = (base.x1 - base.x0) / next
      const h = (base.y1 - base.y0) / next
      setViewZoom({zoom: next, center: [p.x - p.sx * w + w / 2, p.y - p.sy * h + h / 2]})
    }
    // Move the zoomed view by a screen distance (clamped to the photo when it is next computed).
    const panBy = (dxPx: number, dyPx: number) => {
      const {zoom} = getViewZoom()
      const r = canvas.getBoundingClientRect()
      const {view} = framing.current
      const w = view.x1 - view.x0
      const h = view.y1 - view.y0
      const cx = view.x0 + w / 2 - (dxPx / r.width) * w
      const cy = view.y0 + h / 2 - (dyPx / r.height) * h
      setViewZoom({zoom, center: [Math.min(1 - w / 2, Math.max(w / 2, cx)), Math.min(1 - h / 2, Math.max(h / 2, cy))]})
    }

    const pointers = new Map<number, {x: number, y: number}>()
    let drag: {x: number, y: number, last: {x: number, y: number}, basePan: number, moved: boolean, touch: boolean} | null = null
    let pinch: {distance: number, zoom: number} | null = null
    let lastTap = {time: 0, x: 0, y: 0}

    const pinchState = () => {
      const [a, b] = [...pointers.values()]
      return {distance: Math.hypot(a.x - b.x, a.y - b.y), mid: {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}}
    }

    const onDown = (e: PointerEvent) => {
      if (stillRef.current || (e.pointerType === 'mouse' && e.button !== 0)) return
      pointers.set(e.pointerId, {x: e.clientX, y: e.clientY})
      if (pointers.size === 2) {
        pinch = {distance: pinchState().distance, zoom: getViewZoom().zoom}
        drag = null
        markGesture()
      } else if (pointers.size === 1) {
        drag = {x: e.clientX, y: e.clientY, last: {x: e.clientX, y: e.clientY}, basePan: pan.current, moved: false, touch: e.pointerType === 'touch'}
      }
    }

    const onMove = (e: PointerEvent) => {
      const known = pointers.get(e.pointerId)
      if (!known) return
      const previous = {...known}
      pointers.set(e.pointerId, {x: e.clientX, y: e.clientY})

      if (pinch && pointers.size === 2) {
        const {distance, mid} = pinchState()
        zoomAt(pinch.zoom * (distance / pinch.distance), mid.x, mid.y)
        // Both fingers moving together also pans.
        panBy((e.clientX - previous.x) / 2, (e.clientY - previous.y) / 2)
        markGesture()
        onPanned()
        return
      }
      if (!drag) return
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < DRAG_PX) return
      drag.moved = true
      markGesture()
      if (getViewZoom().zoom > 1) {
        panBy(e.clientX - drag.last.x, e.clientY - drag.last.y)
        onPanned()
      } else if (drag.touch && framing.current.panPerPx) {
        // Default zoom on a small screen: slide along the shelf.
        pan.current = Math.min(1, Math.max(0, drag.basePan - (e.clientX - drag.x) * framing.current.panPerPx))
        if (Math.abs(e.clientX - drag.x) > SWIPE_PX) onPanned()
      }
      drag.last = {x: e.clientX, y: e.clientY}
    }

    const onUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      if (pinch) {
        if (pointers.size < 2) pinch = null
        drag = null
        markGesture()
        return
      }
      if (!drag) return
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      // Rows change with a vertical swipe at the default zoom (zoomed in, a drag pans instead).
      if (drag.touch && getViewZoom().zoom === 1 && framing.current.paged && Math.abs(dy) > SWIPE_PX && Math.abs(dy) > Math.abs(dx) * 1.2) {
        onRowStep(dy < 0 ? 1 : -1)
      }
      // Double-tap (touch) toggles the zoom; checked a moment later so a tap that opened a book doesn't also zoom.
      if (drag.touch && !drag.moved) {
        const now = performance.now()
        const double = now - lastTap.time < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 40
        lastTap = double ? {time: 0, x: 0, y: 0} : {time: now, x: e.clientX, y: e.clientY}
        if (double) toggleZoomLater(e.clientX, e.clientY)
      }
      drag = null
    }

    const toggleZoomLater = (clientX: number, clientY: number) => {
      window.setTimeout(() => {
        if (stillRef.current) return
        if (getViewZoom().zoom > 1.4) setViewZoom({zoom: 1, center: null})
        else zoomAt(DOUBLE_ZOOM, clientX, clientY)
        onPanned()
      }, 60)
    }

    const onDoubleClick = (e: MouseEvent) => toggleZoomLater(e.clientX, e.clientY)

    // Wheel and trackpad pinch (which arrives as a ctrl+wheel) zoom toward the cursor.
    const onWheel = (e: WheelEvent) => {
      if (stillRef.current) return
      e.preventDefault()
      const lines = e.deltaMode === 1 ? 16 : 1
      const strength = e.ctrlKey ? 0.01 : 0.0015
      zoomAt(getViewZoom().zoom * Math.exp(-e.deltaY * lines * strength), e.clientX, e.clientY)
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('dblclick', onDoubleClick)
    canvas.addEventListener('wheel', onWheel, {passive: false})
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('dblclick', onDoubleClick)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [canvas, onRowStep, onPanned])

  useFrame(({size, pointer}, delta) => {
    const {view: base, panRange, paged} = frameView(vibe, placement, size, {row, pan: pan.current})
    const {zoom, center} = getViewZoom()
    const view = reading ? base : zoomedView(base, zoom, center)
    const w = view.x1 - view.x0
    const h = view.y1 - view.y0
    // One pixel of drag moves the shelf one pixel: what a pixel covers vs. the pan range (both in image widths).
    framing.current = {paged, panPerPx: panRange ? (base.x1 - base.x0) / size.width / panRange : 0, base, view}

    // Ease toward the target view (zoom, pan, row changes, rotation); snap on the first frame and with reduced motion.
    const now = shown.current
    if (!now || calm) {
      shown.current = {x: view.x0, y: view.y0, w, h}
    } else {
      easing.damp(now, 'x', view.x0, 0.12, delta)
      easing.damp(now, 'y', view.y0, 0.12, delta)
      easing.damp(now, 'w', w, 0.15, delta)
      easing.damp(now, 'h', h, 0.15, delta)
    }
    const {x, y, w: sw, h: sh} = shown.current!

    // The drift is skipped once zoomed in: it would fight the visitor's own panning.
    const follow = still || calm || zoom > 1 ? 0 : DRIFT
    easing.damp(drift.current, 'x', pointer.x * follow, 0.5, delta)
    easing.damp(drift.current, 'y', -pointer.y * follow, 0.5, delta)
    // Drift only as far as the image reaches.
    const dx = Math.min(1 - x - sw, Math.max(-x, drift.current.x))
    const dy = Math.min(1 - y - sh, Math.max(-y, drift.current.y))
    const shifted = {x0: x + dx, x1: x + sw + dx, y0: y + dy, y1: y + sh + dy}

    const {left, right, top, bottom} = frustum(shifted, placement.vanish, camera.near)
    camera.projectionMatrix.makePerspective(left, right, top, bottom, camera.near, camera.far)
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()

    // Drei's Html assumes a centered frustum; shifting its layer by the lens offset makes up the difference.
    const e = camera.projectionMatrix.elements
    if (htmlLayer.current) {
      htmlLayer.current.style.transform = `translate(${(-e[8] * size.width) / 2}px, ${(e[9] * size.height) / 2}px)`
    }
  }, -1)

  return null
}
