import {useEffect, useMemo} from 'react'
import {useTexture} from '@react-three/drei'
import {CanvasTexture, Color, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, type Texture} from 'three'
import type {Project} from '../data/projects'
import {drawCover} from './BookCoverTexture'
import {drawSpine} from './BookSpineTexture'
import {CLOTH_TILE_M, clothTile} from './cloth'
import {BOOK, type BookSize} from './layout'
import {LINEN_URL} from './materials'

const canvasTexture = (canvas: HTMLCanvasElement) => {
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

const tiled = (texture: Texture, widthM: number, heightM: number) => {
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.repeat.set(widthM / CLOTH_TILE_M, heightM / CLOTH_TILE_M)
  texture.needsUpdate = true // a clone starts at version 0 and would never upload
  return texture
}

// Everything a book is bound in: tinted linen boards, a spine with its title, and (for projects) generated cover art.
export const useBookMaterials = (project: Project | undefined, color: string, size: BookSize) => {
  const linen = useTexture(LINEN_URL)
  const {height: h, thickness: t} = size

  const bound = useMemo(() => {
    const image = linen.image as HTMLImageElement
    // Blank "coming soon" books are muted.
    const tone = project ? color : `#${new Color(color).multiplyScalar(0.7).getHexString()}`
    const textures = [
      tiled(canvasTexture(clothTile(tone, image)), BOOK.depth, h),
      tiled(linen.clone(), BOOK.depth, h), // weave relief; clones share the image upload
      canvasTexture(drawSpine(
        {title: project?.title, year: project?.year, status: project?.status, color: tone, accent: project?.accent, soon: !project},
        image,
        t,
        h,
      )),
      tiled(linen.clone(), t, h),
    ]
    const [cloth, clothBump, spineArt, spineBump] = textures

    const cover = new MeshStandardMaterial({map: cloth, bumpMap: clothBump, bumpScale: 0.6, roughness: 0.85})
    const spine = new MeshStandardMaterial({
      map: spineArt,
      bumpMap: spineBump,
      bumpScale: 0.6,
      emissiveMap: spineArt,
      emissive: new Color('#ffffff'),
      emissiveIntensity: 0,
      roughness: 0.8,
    })
    const materials = [cover, spine]
    let front = cover
    if (project) {
      const art = canvasTexture(drawCover(project, image, BOOK.depth - BOOK.spineT, h))
      front = new MeshStandardMaterial({map: art, bumpMap: clothBump, bumpScale: 0.6, roughness: 0.85})
      textures.push(art)
      materials.push(front)
    }

    return {
      cover,
      spine,
      // For twoToneBox: [everywhere else, the face with the art].
      spineMaterials: [cover, spine],
      frontMaterials: [cover, front],
      dispose: () => [...textures, ...materials].forEach((item) => item.dispose()),
    }
  }, [project, color, linen, h, t])

  useEffect(() => bound.dispose, [bound])
  return bound
}
