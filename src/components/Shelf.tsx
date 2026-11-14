import {useEffect, useMemo} from 'react'
import {useTexture} from '@react-three/drei'
import type {Material} from 'three'
import {comingSoon, projects} from '../data/projects'
import {Book} from './Book'
import {BOOKEND, bookSize, computeRows, shelfHeight, type ShelfDims} from './layout'
import {LINEN_URL, PAPER_URL} from './materials'
import type {OpenMode} from './openAnimation'
import {BookStand, Bookend, CANDLE_RADIUS, Candle} from './ShelfDecor'
import {useWoodMaterial, woodBoxGeometry} from './wood'

type ShelfItem =
  | {kind: 'project', data: (typeof projects)[number]}
  | {kind: 'soon', data: (typeof comingSoon)[number]}

const items: ShelfItem[] = [
  ...projects.map((data) => ({kind: 'project' as const, data})),
  ...comingSoon.map((data) => ({kind: 'soon' as const, data})),
]
const isFaceOut = (item: ShelfItem) => item.kind === 'project' && !!item.data.faceOut

// Split books into rows ("coming soon" books end up last); a face-out book goes to the end of its row,
// past the bookend.
const layOut = (dims: ShelfDims) => {
  const perRow = Math.ceil(items.length / dims.rows)
  const rows = Array.from({length: dims.rows}, (_, r) => {
    const row = items.slice(r * perRow, (r + 1) * perRow)
    return [...row.filter((item) => !isFaceOut(item)), ...row.filter(isFaceOut)]
  })
  const packed = computeRows(dims, rows.map((row) => row.map((item) => ({...bookSize(item.data), faceOut: isFaceOut(item)}))))
  return {rows, packed}
}

type BoardProps = {
  size: [number, number, number]
  position: [number, number, number]
  material: Material
  shift: number // moves the grain, so no two boards match
}

const Board = ({size: [w, h, d], position, material, shift}: BoardProps) => {
  const geometry = useMemo(() => woodBoxGeometry(w, h, d, shift), [w, h, d, shift])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh position={position} geometry={geometry} material={material} castShadow receiveShadow />
}

type ShelfProps = {
  dims: ShelfDims
  wood: string
  focusedId: string | null
  selectedId: string | null
  openMode: OpenMode
  calm: boolean // prefers-reduced-motion
  onSelect: (id: string | null) => void
  onOutChange: (out: boolean) => void
}

export const Shelf = ({dims, wood: woodColor, focusedId, selectedId, openMode, calm, onSelect, onOutChange}: ShelfProps) => {
  useTexture([LINEN_URL, PAPER_URL]) // loaded with the scene, so opening a book never waits on them
  const wood = useWoodMaterial(woodColor)
  const {rows, packed} = useMemo(() => layOut(dims), [dims])
  const {innerWidth: w, depth: d, plankT, sideT, rowGap, rows: rowCount, boxed, plinth} = dims
  const totalH = shelfHeight(dims)
  // Boxed: bottom, between rows, top. Otherwise only the planks between rows — the photo provides the rest.
  const planks = Array.from({length: rowCount + 1}, (_, i) => i).filter((i) => boxed || (i > 0 && i < rowCount))

  // One candle toward the right end of the bottom row, clear of that row's books and bookend.
  const bottom = packed[rowCount - 1]
  const candleX = w / 2 - CANDLE_RADIUS - 0.07
  if (import.meta.env.DEV && bottom.endX > candleX - CANDLE_RADIUS) console.warn('The candle overlaps the bottom row')

  return (
    <group>
      {planks.map((i) => (
        <Board key={i} size={[w, plankT, d]} position={[0, plinth + i * rowGap + plankT / 2, 0]} material={wood} shift={i * 0.43} />
      ))}

      {boxed && (
        <>
          {/* Side panels, down to the floor */}
          {[-1, 1].map((side) => (
            <Board
              key={side}
              size={[sideT, totalH, d]}
              position={[side * (w / 2 + sideT / 2), totalH / 2, 0]}
              material={wood}
              shift={side * 0.29}
            />
          ))}
          {/* Back panel */}
          <Board size={[w, totalH - plinth, 0.008]} position={[0, plinth + (totalH - plinth) / 2, -d / 2 + 0.004]} material={wood} shift={0.17} />
          {/* Kick board, set back from the front */}
          <Board size={[w, plinth, 0.016]} position={[0, plinth / 2, d / 2 - 0.03]} material={wood} shift={0.71} />
        </>
      )}

      {rows.map((row, r) =>
        row.map((item, i) => {
          const slot = packed[r].slots[i]
          const size = bookSize(item.data)
          return (
            <group key={item.data.id}>
              <Book
                project={item.kind === 'project' ? item.data : undefined}
                color={item.data.color}
                size={size}
                slot={slot}
                focused={focusedId === item.data.id}
                selected={selectedId === item.data.id}
                locked={selectedId !== null}
                openMode={openMode}
                onSelect={onSelect}
                onOutChange={onOutChange}
              />
              {slot.faceOut && <BookStand slot={slot} size={size} />}
            </group>
          )
        }),
      )}

      {packed.map((row, r) => (
        <Bookend key={r} x={row.bookendX} y={row.y} z={row.spineZ - BOOKEND.depth / 2 - 0.01} />
      ))}
      <Candle position={[candleX, bottom.y, d / 2 - 0.07]} flicker={!calm} />
    </group>
  )
}
