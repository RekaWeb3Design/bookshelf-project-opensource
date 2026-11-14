import {useEffect, useState} from 'react'

// Every face the canvas textures draw with. Canvas text silently falls back if a font isn't loaded yet.
const FACES = ["400 16px 'Fraunces Variable'", "600 16px 'Fraunces Variable'", "italic 400 16px 'Fraunces Variable'"]
const GIVE_UP_MS = 4000 // a missing font shouldn't keep the shelf hidden forever

export const useFontsReady = () => {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const done = () => setReady(true)
    const timer = window.setTimeout(done, GIVE_UP_MS)
    Promise.all(FACES.map((face) => document.fonts.load(face))).then(done, done)
    return () => window.clearTimeout(timer)
  }, [])
  return ready
}
