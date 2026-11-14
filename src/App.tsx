import {Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent} from 'react'
import {Canvas} from '@react-three/fiber'
import {htmlLayer} from './components/htmlLayer'
import {BOOK} from './components/layout'
import {LoadingScreen} from './components/LoadingScreen'
import {PAGE_CSS_PX_PER_M, READ_FILL, type OpenMode} from './components/openAnimation'
import {frameView, isSmallScreen, place} from './components/placement'
import {ProjectCard} from './components/ProjectCard'
import {Scene} from './components/Scene'
import {VibeChooser} from './components/VibeChooser'
import {projects} from './data/projects'
import type {Vibe} from './data/vibes'
import {useFontsReady} from './useFontsReady'
import {useSelectedId} from './useSelectedId'
import {usePrefersReducedMotion, useViewportSize} from './useViewport'
import {useVibe} from './useVibe'
import {MAX_ZOOM, resetZoom, useViewZoom, zoomBy} from './viewZoom'

// Dev-only slot calibration (press C). The dynamic import keeps it out of the production bundle entirely.
const Calibrator = import.meta.env.DEV ? lazy(() => import('./components/Calibrator')) : null

// The page in the 3D book is laid out with 14px text; below this scale (≈12px on screen) a 2D card is used instead.
const MIN_PAGE_SCALE = 0.86
const DRAGGED_KEY = 'shelf.dragged' // once someone has dragged or pinched the view, the touch hint isn't shown again
const ZOOM_STEP = 1.4
const touchScreen = window.matchMedia('(pointer: coarse)').matches

const readDragged = () => {
  try {
    return window.localStorage.getItem(DRAGGED_KEY) === '1'
  } catch {
    return false
  }
}

const App = () => {
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [selectedId, select] = useSelectedId()
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const liveRef = useRef<HTMLParagraphElement>(null)
  const lastOpenId = useRef<string | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null) // what had focus before a book opened

  const [chosenVibe, chooseVibe] = useVibe()
  const [choosing, setChoosing] = useState(false)
  const [readyVibeId, setReadyVibeId] = useState<string | null>(null) // the vibe whose scene has finished loading
  const fontsReady = useFontsReady()
  // Calibrator edits live here; they apply only to the vibe they were made on.
  const [calibrated, setCalibrated] = useState<Vibe | null>(null)
  const [calibrating, setCalibrating] = useState(false)
  const vibe = calibrated && calibrated.id === chosenVibe?.id ? calibrated : chosenVibe
  const vibeId = vibe?.id
  const onReady = useCallback(() => setReadyVibeId(vibeId ?? null), [vibeId])
  const chooserOpen = !vibe || choosing

  const size = useViewportSize()
  const calm = usePrefersReducedMotion()
  const placement = useMemo(() => (vibe ? place(vibe) : null), [vibe])
  // Small screens that can't fit the whole shelf at a readable size look at one row at a time.
  const rowCount = vibe?.rows ?? 1
  const [row, setRow] = useState(0)
  const stepRow = useCallback((step: number) => setRow((r) => Math.min(rowCount - 1, Math.max(0, r + step))), [rowCount])
  const framing = vibe && placement ? frameView(vibe, placement, size) : null
  const paged = !!framing?.paged
  const [dragged, setDragged] = useState(readDragged)
  const {zoom} = useViewZoom()
  const onPanned = useCallback(() => {
    setDragged(true)
    try {
      window.localStorage.setItem(DRAGGED_KEY, '1')
    } catch {
      // not remembered; the hint may show again next visit
    }
  }, [])

  // How big the open book's page gets on this screen decides how a project is shown.
  const pagePxPerM = READ_FILL * Math.min(size.width / (BOOK.depth * 2 + BOOK.thickness), size.height / BOOK.height)
  const openMode: OpenMode = calm ? 'still' : pagePxPerM < PAGE_CSS_PX_PER_M * MIN_PAGE_SCALE ? 'card' : '3d'
  const selected = projects.find((p) => p.id === selectedId)

  // Opening and closing: tell screen readers, and hand focus back to where it was when the book closes.
  // (Focus moves *into* the page by itself: the card is a modal dialog, the 3D page focuses its back button.)
  useEffect(() => {
    const title = (id: string | null) => projects.find((p) => p.id === id)?.title
    if (selectedId) {
      if (!lastOpenId.current) {
        const active = document.activeElement
        returnFocus.current = active instanceof HTMLElement && active !== document.body ? active : null
      }
      lastOpenId.current = selectedId
      if (liveRef.current) liveRef.current.textContent = `${title(selectedId)} opened.`
    } else if (lastOpenId.current) {
      if (liveRef.current) liveRef.current.textContent = `${title(lastOpenId.current)} closed. Back on the shelf.`
      if (returnFocus.current?.isConnected) returnFocus.current.focus()
      lastOpenId.current = null
    }
  }, [selectedId])

  // Esc closes the open book (while the vibe chooser is up, Esc belongs to it).
  useEffect(() => {
    if (!selectedId || chooserOpen) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, chooserOpen, select])

  // Arrow keys move focus between books, same order as on the shelf.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const step = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[e.key]
    if (!step) return
    e.preventDefault()
    const current = projects.findIndex((p) => p.id === focusedId)
    const next = (current + step + projects.length) % projects.length
    buttonsRef.current[next]?.focus()
  }

  return (
    <>
      {vibe && placement && fontsReady && (
        <Canvas
          shadows="percentage"
          dpr={[1, 2]}
          gl={{toneMappingExposure: vibe.exposure}} // read by the ACES pass in Effects; the photo cancels it out
          camera={{manual: true, near: 0.05, far: 30}}
          onCreated={({gl}) => {
            gl.shadowMap.autoUpdate = false // updated on request only, see shadowUpdates.ts
          }}
          onPointerMissed={() => select(null)}
          aria-hidden
        >
          <Suspense fallback={null}>
            <Scene
              key={vibe.id}
              vibe={vibe}
              placement={placement}
              focusedId={focusedId}
              selectedId={selectedId}
              openMode={openMode}
              row={row}
              still={calibrating}
              calm={calm}
              light={isSmallScreen(size)}
              onSelect={select}
              onRowStep={stepRow}
              onPanned={onPanned}
              onReady={onReady}
            />
          </Suspense>
        </Canvas>
      )}
      <div ref={htmlLayer} className="html-layer" />

      {vibe && <LoadingScreen done={fontsReady && readyVibeId === vibe.id} />}

      {/* The shelf for keyboards and screen readers: the same books as a list. Off-screen until it has focus. */}
      <nav className="project-nav" aria-label="Projects on the shelf">
        <ul onKeyDown={onKeyDown}>
          {projects.map((p, i) => (
            <li key={p.id}>
              <button
                ref={(el) => {
                  buttonsRef.current[i] = el
                }}
                onFocus={() => setFocusedId(p.id)}
                onBlur={() => setFocusedId(null)}
                onClick={() => select(p.id)}
              >
                <strong>{p.title}</strong>
                <span>{p.tagline}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <p ref={liveRef} className="sr-only" aria-live="polite" />

      {paged && !selectedId && !chooserOpen && (
        <div className="row-pager" role="group" aria-label={`Shelf row ${row + 1} of ${rowCount}`}>
          <button onClick={() => stepRow(-1)} disabled={row === 0} aria-label="Row above">↑</button>
          <button onClick={() => stepRow(1)} disabled={row === rowCount - 1} aria-label="Row below">↓</button>
        </div>
      )}

      {touchScreen && !dragged && !selectedId && !chooserOpen && readyVibeId === vibe?.id && (
        <p className="drag-hint" aria-hidden>
          {framing?.panRange
            ? <><span>‹</span>Drag to see more · pinch to zoom<span>›</span></>
            : 'Pinch or double-tap to zoom'}
        </p>
      )}

      {vibe && (
        <div className="corner">
          <button className="vibe-button" onClick={() => setChoosing(true)}>Change vibe</button>
          {!selectedId && !chooserOpen && (
            <div className="zoom-controls" role="group" aria-label="Zoom">
              <button onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={zoom <= 1} aria-label="Zoom out">−</button>
              <button onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">+</button>
              <button onClick={resetZoom} disabled={zoom <= 1} aria-label="Reset zoom">Reset</button>
            </div>
          )}
        </div>
      )}

      {selected && openMode !== '3d' && !chooserOpen && (
        <ProjectCard key={selected.id} project={selected} delayed={openMode === 'card'} onClose={() => select(null)} />
      )}
      {chooserOpen && (
        <VibeChooser
          currentId={vibe?.id}
          onChoose={(id) => {
            chooseVibe(id)
            setChoosing(false)
            setRow(0)
            resetZoom()
          }}
          onClose={vibe ? () => setChoosing(false) : undefined}
        />
      )}

      {Calibrator && vibe && (
        <Suspense fallback={null}>
          <Calibrator vibe={vibe} onChange={setCalibrated} onToggle={setCalibrating} />
        </Suspense>
      )}
    </>
  )
}

export default App
