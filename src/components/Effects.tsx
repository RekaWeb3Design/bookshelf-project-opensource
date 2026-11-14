import {Bloom, EffectComposer, Noise, ToneMapping, Vignette} from '@react-three/postprocessing'
import {BlendFunction, ToneMappingMode} from 'postprocessing'

// Kept light: the photo's lamps are the only things bright enough to bloom (the backplate is HDR-expanded,
// see displayReferred), then ACES for the whole frame, a vignette and a little grain to tie photo and 3D together.
// The Fragment stands in for a switched-off Bloom: the composer's children must stay elements.
export const Effects = ({multisampling, bloom}: {multisampling: number, bloom: boolean}) => (
  <EffectComposer multisampling={multisampling}>
    {bloom ? <Bloom mipmapBlur luminanceThreshold={3} luminanceSmoothing={0.4} intensity={0.12} radius={0.75} /> : <></>}
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    <Vignette offset={0.45} darkness={0.45} />
    <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.14} />
  </EffectComposer>
)
