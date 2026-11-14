import {useEffect, useState} from 'react'
import type {Rect, Vibe} from '../data/vibes'
import {useViewportSize} from '../useViewport'
import {frameView, place} from './placement'

// Dev-only (never bundled for production): press C to outline the vibe's rects over the photo and nudge them live.
//   1 / 2      pick the slot / the second target (alcove: back wall, standing: vanishing point)
//   arrows     move it · Shift+arrows move its right/bottom edge · Alt+arrows move its left/top edge
//   [ / ]      zoom out / in · hold Ctrl for 5× steps · Enter logs the values to paste into vibes.ts
type CalibratorProps = {
  vibe: Vibe
  onChange: (vibe: Vibe) => void
  onToggle: (open: boolean) => void
}

const round = (n: number) => Math.round(n * 100) / 100

const nudgeRect = (rect: Rect, dx: number, dy: number, edge: 'all' | 'far' | 'near'): Rect => ({
  x0: round(rect.x0 + (edge === 'far' ? 0 : dx)),
  x1: round(rect.x1 + (edge === 'near' ? 0 : dx)),
  y0: round(rect.y0 + (edge === 'far' ? 0 : dy)),
  y1: round(rect.y1 + (edge === 'near' ? 0 : dy)),
})

const Calibrator = ({vibe, onChange, onToggle}: CalibratorProps) => {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<'slot' | 'second'>('slot')
  const size = useViewportSize()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
        setOpen(!open)
        onToggle(!open)
        return
      }
      if (!open) return
      const step = e.ctrlKey ? 0.5 : 0.1
      if (e.key === '1') setTarget('slot')
      else if (e.key === '2') setTarget('second')
      else if (e.key === '[' || e.key === ']') onChange({...vibe, zoom: round(vibe.zoom + (e.key === ']' ? step : -step) / 10)})
      else if (e.key === 'Enter') {
        const {id, zoom, slot} = vibe
        console.log(JSON.stringify(vibe.mode === 'alcove' ? {id, zoom, slot, back: vibe.back} : {id, zoom, slot, vanish: vibe.vanish}))
      } else {
        const move = {ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]}[e.key]
        if (!move) return
        const [dx, dy] = move
        const edge = e.shiftKey ? 'far' : e.altKey ? 'near' : 'all'
        if (target === 'slot') onChange({...vibe, slot: nudgeRect(vibe.slot, dx, dy, edge)})
        else if (vibe.mode === 'alcove') onChange({...vibe, back: nudgeRect(vibe.back, dx, dy, edge)})
        else onChange({...vibe, vanish: [round(vibe.vanish[0] + dx), round(vibe.vanish[1] + dy)]})
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, target, vibe, onChange, onToggle])

  if (!open) return null

  // Image % → viewport px, through the same crop the camera uses.
  const placement = place(vibe)
  const {view} = frameView(vibe, placement, size)
  const px = (x: number) => ((x / 100 - view.x0) / (view.x1 - view.x0)) * size.width
  const py = (y: number) => ((y / 100 - view.y0) / (view.y1 - view.y0)) * size.height
  const box = (rect: Rect, color: string, active: boolean) => (
    <div
      style={{
        position: 'absolute',
        left: px(rect.x0),
        top: py(rect.y0),
        width: px(rect.x1) - px(rect.x0),
        height: py(rect.y1) - py(rect.y0),
        outline: `${active ? 2 : 1}px ${active ? 'solid' : 'dashed'} ${color}`,
      }}
    />
  )
  const {vanish} = placement
  const fmt = (rect: Rect) => `x ${rect.x0}–${rect.x1}, y ${rect.y0}–${rect.y1}`

  return (
    <div style={{position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, font: '12px/1.5 monospace', color: '#fff'}}>
      {box(vibe.slot, '#5cf', target === 'slot')}
      {vibe.mode === 'alcove' && box(vibe.back, '#fc5', target === 'second')}
      <div
        style={{
          position: 'absolute',
          left: px(vanish[0] * 100) - 6,
          top: py(vanish[1] * 100) - 6,
          width: 12,
          height: 12,
          borderRadius: '50%',
          outline: `2px ${vibe.mode === 'standing' && target === 'second' ? 'solid' : 'dashed'} #f6a`,
        }}
      />
      <pre style={{position: 'absolute', left: 12, top: 12, margin: 0, padding: '8px 10px', background: 'rgba(0,0,0,0.75)'}}>
        {[
          `${vibe.id} · ${vibe.mode} · zoom ${vibe.zoom}  ([ ])`,
          `1 slot   ${fmt(vibe.slot)}`,
          vibe.mode === 'alcove' ? `2 back   ${fmt(vibe.back)}` : `2 vanish ${vibe.vanish.join(', ')}`,
          `vanishing point ${round(vanish[0] * 100)}, ${round(vanish[1] * 100)}`,
          `editing: ${target === 'slot' ? 'slot' : vibe.mode === 'alcove' ? 'back' : 'vanish'}`,
          'arrows move · Shift far edge · Alt near edge · Ctrl ×5 · Enter logs',
        ].join('\n')}
      </pre>
    </div>
  )
}

export default Calibrator
