import {useEffect, useMemo, useRef, useState} from 'react'
import {useFrame, type ThreeEvent} from '@react-three/fiber'
import {useCursor} from '@react-three/drei'
import {easing} from 'maath'
import {Vector3, type Group} from 'three'
import type {Project} from '../data/projects'
import {BOOK, type BookSize, type Slot} from './layout'
import {pageBlockMaterials} from './materials'
import {COVER_OPEN, OPEN, PULL_OUT, READ_FILL, stage, type OpenMode} from './openAnimation'
import {twoToneBox} from './bookGeometry'
import {useBookMaterials} from './BookMaterials'
import {BookPages} from './BookPages'
import {inGesture} from '../viewZoom'
import {requestShadowUpdate} from './shadowUpdates'

const HOVER = {slide: 0.02, tilt: 0.09, glow: 0.22, straighten: 0.35}
const TAP_SLOP = 10 // px a pointer may travel and still count as a click/tap rather than a drag

// Scratch vector for the per-frame reading-position math.
const readPos = new Vector3()

type BookProps = {
  project?: Project // missing = a blank "coming soon" book
  color: string
  size: BookSize
  slot: Slot
  focused?: boolean
  selected?: boolean
  locked?: boolean // some book is open: no hover, a click closes it
  openMode: OpenMode
  onSelect?: (id: string | null) => void
  onOutChange?: (out: boolean) => void // left its slot / is fully back in it
}

// Local frame: origin at the bottom-front (spine) edge; the book extends toward -z.
export const Book = ({project, color, size, slot, focused, selected = false, locked = false, openMode, onSelect, onOutChange}: BookProps) => {
  const {height: h, thickness: t} = size
  const {depth: d, coverT, spineT, pageInset} = BOOK
  const boardDepth = d - spineT
  const soon = !project

  const [hovered, setHovered] = useState(false)
  const [pagesMounted, setPagesMounted] = useState(false)
  const active = !soon && !locked && (hovered || !!focused)
  useCursor(active && hovered)

  const slotRef = useRef<Group>(null)
  const motionRef = useRef<Group>(null)
  const coverPivotRef = useRef<Group>(null) // front-cover hinge
  const hover = useRef(0) // 0..1, damped
  const clock = useRef(0) // seconds along the OPEN timeline; runs backwards to close
  const out = useRef(false)

  const {spine, cover, spineMaterials, frontMaterials} = useBookMaterials(project, color, size)
  const geometry = useMemo(() => ({
    spine: twoToneBox(t, h, spineT, [4]), // spine art on +z
    front: twoToneBox(coverT, h, boardDepth, [0]), // cover art on +x
    pages: twoToneBox(t - coverT * 2, h - pageInset * 2, boardDepth - pageInset, [2, 3, 5]), // sheet edges: top, bottom, fore-edge
  }), [t, h, spineT, coverT, boardDepth, pageInset])
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry])

  useFrame(({camera}, delta) => {
    const g = motionRef.current
    const slotGroup = slotRef.current
    const pivot = coverPivotRef.current
    if (!g || !slotGroup || !pivot) return
    const dt = Math.min(delta, 0.05)

    const hoverTarget = active ? 1 : 0
    // In 'still' mode (reduced motion) the book stays on the shelf; the project card fades in over it instead.
    const opening = selected && openMode !== 'still'
    const before = clock.current
    clock.current = Math.min(OPEN.total, Math.max(0, clock.current + (opening ? dt : -dt)))
    const time = clock.current
    // Shadows are only re-rendered while something moves.
    if (time !== before || Math.abs(hover.current - hoverTarget) > 0.002) requestShadowUpdate()

    easing.damp(hover, 'current', hoverTarget, 0.13, dt)
    easing.damp(spine, 'emissiveIntensity', active ? HOVER.glow : 0, 0.15, dt)

    if (out.current !== time > 0) {
      out.current = time > 0
      setPagesMounted(out.current)
      onOutChange?.(out.current)
    }

    const pull = stage(time, OPEN.pull)
    const fly = stage(time, OPEN.fly)

    // In the slot: hover slide, then the straight pull-out.
    g.position.set(0, 0, hover.current * HOVER.slide + pull * PULL_OUT)
    if (slot.faceOut) {
      // Already faces the camera, leaning back on its stand; hovering straightens it a little, flying fully.
      const lean = (slot.lean ?? 0) * (1 - hover.current * HOVER.straighten) * (1 - fly)
      g.rotation.set(-lean, -Math.PI / 2, 0)
      g.position.y = (t / 2) * Math.sin(lean) // keeps the bottom-back edge it stands on at plank height
    } else {
      g.rotation.set(hover.current * HOVER.tilt * (1 - pull), fly * -Math.PI / 2, 0)
    }

    // Fly: spine centered in the viewport, front cover (+x) toward the camera, at the distance where the
    // open book (two boards wide) fills READ_FILL of the view — whatever the viewport or the camera's crop.
    if (fly > 0) {
      const e = camera.projectionMatrix.elements
      const dist = Math.max((d * 2 + t) * e[0], h * e[5]) / 2 / READ_FILL
      // e[8], e[9]: the frustum is off-center (see CameraRig), so the viewport's center isn't straight ahead.
      readPos.set((e[8] * dist) / e[0], (e[9] * dist) / e[5] - h / 2, -dist).applyMatrix4(camera.matrixWorld)
      g.position.lerp(slotGroup.worldToLocal(readPos), fly)
    }

    pivot.rotation.y = stage(time, OPEN.cover) * COVER_OPEN
  })

  // Blank books take pointer events too (and do nothing), so a hover or click can't fall through to the book behind.
  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      // A finger has no hover: a touch never gets a matching "out", so the book would stay slid out.
      if (e.pointerType !== 'touch') setHovered(true)
    },
    onPointerOut: () => setHovered(false),
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (e.delta > TAP_SLOP || inGesture()) return // the end of a drag or pinch, not a tap
      if (locked) {
        if (!selected) onSelect?.(null)
      } else if (project) {
        setHovered(false) // it flies away from under the pointer; don't come back still "hovered"
        onSelect?.(project.id)
      }
    },
  }

  return (
    <group ref={slotRef} position={[slot.x, slot.y, slot.z]} {...handlers}>
      <group ref={motionRef}>
        {/* Spine */}
        <mesh position={[0, h / 2, -spineT / 2]} geometry={geometry.spine} material={spineMaterials} castShadow receiveShadow />

        {/* Back cover */}
        <mesh position={[-t / 2 + coverT / 2, h / 2, -spineT - boardDepth / 2]} material={cover} castShadow receiveShadow>
          <boxGeometry args={[coverT, h, boardDepth]} />
        </mesh>

        {/* Page block: slightly inset from top, bottom and fore-edge */}
        <mesh
          position={[0, h / 2, -spineT - (boardDepth - pageInset) / 2]}
          geometry={geometry.pages}
          material={pageBlockMaterials}
          castShadow
          receiveShadow
        />

        {/* Front cover on a hinge at the spine edge — pivot.y goes negative to open (COVER_OPEN) */}
        <group ref={coverPivotRef} position={[t / 2 - coverT / 2, 0, -spineT]}>
          <mesh position={[0, h / 2, -boardDepth / 2]} geometry={geometry.front} material={frontMaterials} castShadow receiveShadow />
        </group>

        {project && pagesMounted && (
          <BookPages project={project} size={size} clock={clock} html={openMode === '3d'} onClose={() => onSelect?.(null)} />
        )}
      </group>
    </group>
  )
}
