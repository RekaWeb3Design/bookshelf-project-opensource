import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useFrame, useThree} from '@react-three/fiber'
import {ContactShadows, PerformanceMonitor} from '@react-three/drei'
import {easing} from 'maath'
import {CanvasTexture, type PointLight} from 'three'
import type {Vibe} from '../data/vibes'
import {Backplate} from './Backplate'
import {CameraRig} from './CameraRig'
import {Effects} from './Effects'
import type {OpenMode} from './openAnimation'
import type {Placement} from './placement'
import {ShadowUpdater, requestShadowUpdate} from './shadowUpdates'
import {Shelf} from './Shelf'

// The room lights only graze a book held up to the camera, so a small light near the camera fades in while one is out.
// Always mounted (intensity 0 when idle): changing the light count would recompile every material.
const ReadingLight = ({on, color}: {on: boolean, color: string}) => {
  const ref = useRef<PointLight>(null)
  useFrame(({camera}, delta) => {
    if (!ref.current) return
    ref.current.position.set(camera.position.x - 0.15, camera.position.y + 0.2, camera.position.z - 0.1)
    easing.damp(ref.current, 'intensity', on ? 0.9 : 0, 0.3, delta)
  })
  return <pointLight ref={ref} color={color} intensity={0} distance={2} decay={2} />
}

// Invisible surfaces where the photo has real ones, so the shelf and books cast shadows onto the image.
const ShadowCatchers = ({dims, opacity}: {dims: Placement['dims'], opacity: number}) => {
  const {innerWidth: w, depth: d, rows, rowGap, boxed} = dims
  const h = rows * rowGap
  const material = <shadowMaterial transparent opacity={opacity} />
  return boxed
    ? (
        <>
          {/* Wall behind the shelf and the floor it stands on */}
          <mesh position={[0, 1.5, -d / 2 - 0.003]} receiveShadow>
            <planeGeometry args={[5, 3]} />
            {material}
          </mesh>
          <mesh position={[0, 0, 1 - d / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[5, 2]} />
            {material}
          </mesh>
        </>
      )
    : (
        <>
          {/* The alcove: back wall, floor, left and right walls */}
          <mesh position={[0, h / 2, -d / 2 + 0.002]} receiveShadow>
            <planeGeometry args={[w, h]} />
            {material}
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[w, d]} />
            {material}
          </mesh>
          <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[d, h]} />
            {material}
          </mesh>
          <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
            <planeGeometry args={[d, h]} />
            {material}
          </mesh>
        </>
      )
}

// Where a standing case meets the floor: a soft shadow hugging its footprint, darkest right at the base.
// Painted once to a canvas — nothing moves down there.
const BaseShadow = ({dims, opacity}: {dims: Placement['dims'], opacity: number}) => {
  // How far the shadow reaches past the footprint, meters. The floor is seen at a grazing angle, so it has to
  // reach much further toward the camera than sideways to read at all.
  const SIDE = 0.14
  const FRONT = 0.5
  const width = dims.innerWidth + dims.sideT * 2
  const texture = useMemo(() => {
    const pxPerM = 256
    const canvas = document.createElement('canvas')
    canvas.width = Math.round((width + SIDE * 2) * pxPerM)
    canvas.height = Math.round((dims.depth + FRONT * 2) * pxPerM)
    const ctx = canvas.getContext('2d')!
    // Stacked, ever larger faint rounded rects around the footprint: they all overlap at the base and thin out with distance.
    const STEPS = 24
    ctx.fillStyle = 'rgba(0,0,0,0.075)'
    for (let i = 1; i <= STEPS; i++) {
      const t = (i / STEPS) ** 2
      const x = SIDE * t * pxPerM
      const z = FRONT * t * pxPerM
      ctx.beginPath()
      ctx.roundRect(SIDE * pxPerM - x, FRONT * pxPerM - z, width * pxPerM + x * 2, dims.depth * pxPerM + z * 2, x)
      ctx.fill()
    }
    return new CanvasTexture(canvas)
  }, [width, dims.depth])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width + SIDE * 2, dims.depth + FRONT * 2]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// Dev only: per-frame renderer counters on window.__shelf, for checking draw calls and frame rate.
const DevStats = () => {
  const frames = useRef({count: 0, since: 0, fps: 0})
  useFrame(({gl}) => {
    const f = frames.current
    f.count++
    const now = performance.now()
    if (now - f.since >= 1000) {
      f.fps = Math.round((f.count * 1000) / (now - f.since))
      f.count = 0
      f.since = now
    }
    // The composer renders several passes per frame; count them all, then start over.
    gl.info.autoReset = false
    Object.assign(window, {__shelf: {calls: gl.info.render.calls, triangles: gl.info.render.triangles, fps: f.fps}})
    gl.info.reset()
  }, -2)
  return null
}

type SceneProps = {
  vibe: Vibe
  placement: Placement
  focusedId: string | null
  selectedId: string | null
  openMode: OpenMode
  row: number
  still: boolean // calibrating: hold the view steady
  calm: boolean // prefers-reduced-motion
  light: boolean // small screen: start without the antialiasing pass
  onSelect: (id: string | null) => void
  onRowStep: (step: number) => void
  onPanned: () => void
  onReady: () => void
}

export const Scene = ({vibe, placement, focusedId, selectedId, openMode, row, still, calm, light, onSelect, onRowStep, onPanned, onReady}: SceneProps) => {
  const {dims} = placement
  const {ambient, warm, cool} = vibe.lights

  // Quality steps down — never back up — while the frame rate stays under target (60 desktop, 30 small screens):
  // 3 everything, 2 no MSAA, 1 no bloom either, 0 also render at 1 device pixel per CSS pixel.
  const [quality, setQuality] = useState(light ? 2 : 3)
  const setDpr = useThree((state) => state.setDpr)
  useEffect(() => {
    if (quality === 0) setDpr(1)
    if (import.meta.env.DEV) Object.assign(window, {__quality: quality})
  }, [quality, setDpr])

  // Mounting means every texture has loaded (the parent Suspense held us back until then).
  useEffect(onReady, [onReady])
  // The shadow map only updates on request (see shadowUpdates); a new shelf needs a first pass.
  useEffect(() => requestShadowUpdate(10), [placement])

  // Books that are out of their slot (a closing one may overlap an opening one): the reading light waits for all of them.
  const [booksOut, setBooksOut] = useState(0)
  const onOutChange = useCallback((out: boolean) => setBooksOut((n) => n + (out ? 1 : -1)), [])

  return (
    <>
      <CameraRig
        vibe={vibe}
        placement={placement}
        row={row}
        still={still || selectedId !== null}
        reading={selectedId !== null || booksOut > 0}
        calm={calm}
        onRowStep={onRowStep}
        onPanned={onPanned}
      />
      <ShadowUpdater />
      {import.meta.env.DEV && <DevStats />}
      <Backplate image={vibe.image} plate={placement.plate} />

      <hemisphereLight args={[ambient.sky, ambient.ground, ambient.intensity]} />
      {/* Warm lamp, as in the photo: key light, casts the shadows */}
      <spotLight
        position={warm.position}
        color={warm.color}
        intensity={warm.intensity}
        angle={0.65}
        penumbra={1}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={7}
        shadow-intensity={vibe.keyShadow}
        shadow-camera-near={0.5}
        shadow-camera-far={8}
      />
      {/* Cool window light, as in the photo: rim light */}
      <directionalLight position={cool.position} color={cool.color} intensity={cool.intensity} />
      <ReadingLight on={selectedId !== null || booksOut > 0} color={warm.color} />

      <ShadowCatchers dims={dims} opacity={vibe.shadow} />
      {/* Soft contact shadow: a baked one around a standing case's base, a live one under an alcove's bottom row */}
      {dims.boxed
        ? <BaseShadow dims={dims} opacity={Math.min(1, vibe.shadow * 1.25)} />
        : (
            <ContactShadows
              position={[0, 0.002, 0]}
              scale={[dims.innerWidth + 0.5, dims.depth + 0.5]}
              far={0.35}
              blur={1.6}
              opacity={Math.min(1, vibe.shadow * 1.8)}
              resolution={256}
              frames={1}
            />
          )}

      <Shelf
        dims={dims}
        wood={vibe.wood}
        focusedId={focusedId}
        selectedId={selectedId}
        openMode={openMode}
        calm={calm}
        onSelect={onSelect}
        onOutChange={onOutChange}
      />

      <PerformanceMonitor
        bounds={() => [light ? 28 : 52, Infinity]} // fixed: drei's "refresh rate" is just the best fps it has seen
        onDecline={() => setQuality((q) => Math.max(0, q - 1))}
      />
      <Effects multisampling={quality === 3 ? 4 : 0} bloom={quality >= 2} />
    </>
  )
}
