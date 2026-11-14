import {useEffect, useMemo} from 'react'
import {useTexture} from '@react-three/drei'
import {MeshBasicMaterial, SRGBColorSpace} from 'three'
import {displayReferred} from './materials'
import type {Placement} from './placement'

// The vibe's photo on a plane behind the shelf, filling the photo camera's whole frustum.
export const Backplate = ({image, plate}: {image: string, plate: Placement['plate']}) => {
  const texture = useTexture(image, (loaded) => {
    loaded.colorSpace = SRGBColorSpace
  })
  const material = useMemo(() => displayReferred(new MeshBasicMaterial({map: texture, toneMapped: false})), [texture])
  // Frees the GPU copy when the vibe changes (three re-uploads it if this vibe is picked again).
  useEffect(() => () => {
    material.dispose()
    texture.dispose()
  }, [material, texture])

  return (
    <mesh position={plate.position} material={material}>
      <planeGeometry args={[plate.width, plate.height]} />
    </mesh>
  )
}
