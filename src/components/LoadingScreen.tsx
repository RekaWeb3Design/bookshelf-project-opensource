import {useProgress} from '@react-three/drei'

// Covers the canvas until the vibe's textures and the font are in; fades out when done.
export const LoadingScreen = ({done}: {done: boolean}) => {
  const progress = useProgress((state) => state.progress)
  const shown = done ? 100 : Math.round(progress)
  return (
    <div className={done ? 'loading loading--done' : 'loading'} role="status" aria-hidden={done}>
      <p className="loading__title">The Shelf</p>
      <div className="loading__bar">
        <span style={{transform: `scaleX(${shown / 100})`}} />
      </div>
      <p className="loading__note">Dusting off the spines… {shown}%</p>
    </div>
  )
}
