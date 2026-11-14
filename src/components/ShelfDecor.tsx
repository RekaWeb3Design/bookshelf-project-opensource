import {useRef} from 'react'
import {useFrame} from '@react-three/fiber'
import {Color, MeshBasicMaterial, MeshStandardMaterial, type Mesh, type PointLight} from 'three'
import {BOOK, BOOKEND, type BookSize, type Slot} from './layout'

// Decor is scenery: it has no pointer handlers, so it can't be hovered or opened.
const metal = new MeshStandardMaterial({color: '#b8975a', metalness: 0.25, roughness: 0.45}) // brushed brass
// Wax glows a little on its own, standing in for the light that passes through it.
const wax = new MeshStandardMaterial({color: '#e4d6b8', roughness: 0.6, emissive: '#ff8a3a', emissiveIntensity: 0.05})
const pool = new MeshStandardMaterial({color: '#f0e2c2', roughness: 0.25, emissive: '#ff9a48', emissiveIntensity: 0.35})
const wick = new MeshStandardMaterial({color: '#1c1612', roughness: 1})
const flame = new MeshBasicMaterial({color: new Color(7, 3.6, 1), toneMapped: false}) // HDR: past the bloom threshold
const FLAME_SIZE: [number, number, number] = [0.0042, 0.0105, 0.0042]
const GLOW = 0.03 // candela of the flame's point light
const FOOT_T = BOOKEND.plateT

// L-shaped brass bookend: the upright stands at x (its left face), the foot points away from the books.
export const Bookend = ({x, y, z}: {x: number, y: number, z: number}) => (
  <group position={[x, y, z]}>
    <mesh position={[BOOKEND.plateT / 2, BOOKEND.height / 2, 0]} material={metal} castShadow receiveShadow>
      <boxGeometry args={[BOOKEND.plateT, BOOKEND.height, BOOKEND.depth]} />
    </mesh>
    <mesh position={[BOOKEND.width / 2, FOOT_T / 2, 0]} material={metal} receiveShadow>
      <boxGeometry args={[BOOKEND.width, FOOT_T, BOOKEND.depth]} />
    </mesh>
  </group>
)

// What a face-out book leans back on: an upright plate that meets the book's back at the plate's top edge.
export const BookStand = ({slot, size}: {slot: Slot, size: BookSize}) => {
  const lean = slot.lean ?? 0
  const width = BOOK.depth * 0.6
  const height = size.height * 0.62
  const backEdgeZ = slot.z - (size.thickness / 2) * Math.cos(lean) // the edge the book stands on
  const plateZ = backEdgeZ - height * Math.tan(lean) - 0.001
  return (
    <group position={[slot.x + BOOK.depth / 2, slot.y, plateZ]}>
      <mesh position={[0, height / 2, -BOOKEND.plateT / 2]} material={metal} castShadow receiveShadow>
        <boxGeometry args={[width, height, BOOKEND.plateT]} />
      </mesh>
      <mesh position={[0, FOOT_T / 2, -0.03]} material={metal} receiveShadow>
        <boxGeometry args={[width, FOOT_T, 0.06]} />
      </mesh>
    </group>
  )
}

export const CANDLE_RADIUS = 0.038 // its dish, the widest part
const CANDLE_HEIGHT = 0.075
const DISH_T = 0.004

// A lit pillar candle on a small brass dish. The flame is brighter than white, so it is the one 3D thing that blooms.
export const Candle = ({position, flicker}: {position: [number, number, number], flicker: boolean}) => {
  const flameRef = useRef<Mesh>(null)
  const lightRef = useRef<PointLight>(null)
  const top = DISH_T + CANDLE_HEIGHT

  useFrame(() => {
    if (!flicker || !flameRef.current || !lightRef.current) return
    const t = performance.now() / 1000
    const wobble = Math.sin(t * 11) * 0.06 + Math.sin(t * 23.7) * 0.04
    flameRef.current.scale.y = FLAME_SIZE[1] * (1 + wobble)
    lightRef.current.intensity = GLOW * (1 + wobble)
  })

  return (
    <group position={position}>
      <mesh position={[0, DISH_T / 2, 0]} material={metal} castShadow receiveShadow>
        <cylinderGeometry args={[CANDLE_RADIUS, CANDLE_RADIUS * 0.9, DISH_T, 32]} />
      </mesh>
      <mesh position={[0, DISH_T + CANDLE_HEIGHT / 2, 0]} material={wax} castShadow receiveShadow>
        <cylinderGeometry args={[0.025, 0.025, CANDLE_HEIGHT, 32]} />
      </mesh>
      {/* Melted pool around the wick */}
      <mesh position={[0, top + 0.0003, 0]} rotation={[-Math.PI / 2, 0, 0]} material={pool}>
        <circleGeometry args={[0.019, 24]} />
      </mesh>
      <mesh position={[0, top + 0.004, 0]} material={wick}>
        <cylinderGeometry args={[0.0011, 0.0011, 0.008, 6]} />
      </mesh>
      <mesh ref={flameRef} position={[0, top + 0.017, 0]} scale={FLAME_SIZE} material={flame}>
        <sphereGeometry args={[1, 12, 12]} />
      </mesh>
      {/* What the flame lights up around it; no shadows, so it costs little */}
      <pointLight ref={lightRef} position={[0, top + 0.02, 0]} color="#ffae5c" intensity={GLOW} distance={0.45} decay={2} />
    </group>
  )
}
