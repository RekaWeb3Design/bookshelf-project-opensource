// All units in meters.
export const BOOK = {
  height: 0.26,
  thickness: 0.045,
  depth: 0.18,
  coverT: 0.003, // cover board thickness
  spineT: 0.004, // spine board thickness
  pageInset: 0.004, // pages sit inside the covers
}

// Shelf geometry. "standing" vibes use STANDING as is; "alcove" vibes derive theirs from the photo (placement.ts).
export type ShelfDims = {
  innerWidth: number
  depth: number
  plankT: number
  sideT: number
  rowGap: number // distance between plank tops
  rows: number // book rows
  boxed: boolean // true: full bookcase (bottom + top plank, sides, back); false: only the planks between rows
  plinth: number // height of the kick board under a boxed case
}

export const STANDING: Omit<ShelfDims, 'rows'> = {
  boxed: true,
  innerWidth: 0.82,
  depth: 0.24,
  plankT: 0.022,
  sideT: 0.028,
  rowGap: 0.325,
  plinth: 0.045,
}

// Floor to top surface.
export const shelfHeight = (dims: ShelfDims) => dims.plinth + dims.rows * dims.rowGap + dims.plankT

const GAP = 0.003 // air between books so they never touch
const MARGIN = 0.02 // distance from the side panel
const SPINE_RECESS = 0.024 // spines sit this far behind the plank's front edge, so a 2 cm hover slide stays on it
export const FACE_OUT_LEAN = 0.21 // radians (~12°) a face-out book leans back onto its stand
export const BOOKEND = {width: 0.055, height: 0.13, depth: 0.1, plateT: 0.005} // L-shaped: upright plate + foot
const FACE_OUT_GAP = 0.018 // air between the bookend and a face-out book

export type BookSize = {height: number, thickness: number}
// x is the book's center; for a face-out book (cover toward the camera, leaning back) it is its spine edge.
export type Slot = {x: number, y: number, z: number, faceOut?: boolean, lean?: number}
// One packed row: its books, where its bookend's upright stands, and where the row ends.
export type RowLayout = {slots: Slot[], y: number, spineZ: number, bookendX: number, endX: number}

export const bookSize = (item: {height?: number, thickness?: number}): BookSize => ({
  height: BOOK.height * (item.height ?? 1),
  thickness: BOOK.thickness * (item.thickness ?? 1),
})

// Surface y a book row stands on (row 0 = top row). Unboxed, the bottom row stands on the floor itself.
export const rowY = (dims: ShelfDims, row: number) => {
  const level = dims.rows - 1 - row
  return dims.plinth + level * dims.rowGap + (level === 0 && !dims.boxed ? 0 : dims.plankT)
}

// Packs each row left to right: spine-out books, a bookend, then (if the row has one) the face-out book.
// Warns in dev if a row overflows, so overlaps can't sneak in.
export const computeRows = (dims: ShelfDims, rows: (BookSize & {faceOut?: boolean})[][]): RowLayout[] =>
  rows.map((row, r) => {
    const y = rowY(dims, r)
    const spineZ = dims.depth / 2 - SPINE_RECESS
    let cursor = -dims.innerWidth / 2 + MARGIN
    let bookendX: number | null = null
    const placeBookend = () => {
      bookendX = cursor
      cursor += BOOKEND.width + GAP
    }
    const slots = row.map((size): Slot => {
      if (size.faceOut) {
        if (bookendX === null) placeBookend()
        const x = cursor + FACE_OUT_GAP
        cursor = x + BOOK.depth + GAP
        // Its cover's bottom edge lines up with the other books' spines.
        return {x, y, z: spineZ - size.thickness / 2, faceOut: true, lean: FACE_OUT_LEAN}
      }
      const slot = {x: cursor + size.thickness / 2, y, z: spineZ}
      cursor += size.thickness + GAP
      return slot
    })
    if (bookendX === null) placeBookend()
    if (import.meta.env.DEV && cursor > dims.innerWidth / 2) {
      console.warn(`Shelf row ${r} overflows by ${(cursor - dims.innerWidth / 2).toFixed(3)} m`)
    }
    return {slots, y, spineZ, bookendX: bookendX!, endX: cursor}
  })
