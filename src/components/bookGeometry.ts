import {BoxGeometry} from 'three'

// A box drawn with two materials — [0] everywhere, [1] on the `special` faces (BoxGeometry order: +x, -x, +y, -y, +z, -z).
// One draw call per material instead of one per face.
export const twoToneBox = (w: number, h: number, d: number, special: number[]) => {
  const geometry = new BoxGeometry(w, h, d)
  const index = Array.from(geometry.index!.array)
  const face = (f: number) => index.slice(f * 6, f * 6 + 6)
  const plain = [0, 1, 2, 3, 4, 5].filter((f) => !special.includes(f))
  geometry.setIndex([...plain.flatMap(face), ...special.flatMap(face)])
  geometry.clearGroups()
  geometry.addGroup(0, plain.length * 6, 0)
  geometry.addGroup(plain.length * 6, special.length * 6, 1)
  return geometry
}
