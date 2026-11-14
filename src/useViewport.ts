import {useEffect, useState, useSyncExternalStore} from 'react'

export const useViewportSize = () => {
  const [size, setSize] = useState({width: window.innerWidth, height: window.innerHeight})
  useEffect(() => {
    const onResize = () => setSize({width: window.innerWidth, height: window.innerHeight})
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const subscribe = (onChange: () => void) => {
  reducedMotion.addEventListener('change', onChange)
  return () => reducedMotion.removeEventListener('change', onChange)
}

export const usePrefersReducedMotion = () => useSyncExternalStore(subscribe, () => reducedMotion.matches)
