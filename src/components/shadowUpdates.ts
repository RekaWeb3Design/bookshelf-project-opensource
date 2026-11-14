import {useFrame} from '@react-three/fiber'

// The shadow map is not re-rendered every frame (it is the main per-frame cost): anything that moves asks for
// a few more frames of updates, and ShadowUpdater hands them out.
let pending = 0

export const requestShadowUpdate = (frames = 2) => {
  pending = Math.max(pending, frames)
}

export const ShadowUpdater = () => {
  useFrame(({gl}) => {
    if (pending > 0) {
      gl.shadowMap.needsUpdate = true
      pending--
    }
  })
  return null
}
