import {useCallback, useState} from 'react'
import {findVibe} from './data/vibes'

const KEY = 'shelf.vibe'

// ?vibe=<id> wins over the remembered choice; null means "not chosen yet".
const readVibeId = () => {
  const fromUrl = findVibe(new URLSearchParams(window.location.search).get('vibe'))
  if (fromUrl) return fromUrl.id
  try {
    return findVibe(window.localStorage.getItem(KEY))?.id ?? null
  } catch {
    return null // storage blocked (private mode, embedded): just ask again next time
  }
}

export const useVibe = () => {
  const [vibeId, setVibeId] = useState(readVibeId)

  const choose = useCallback((id: string) => {
    try {
      window.localStorage.setItem(KEY, id)
    } catch {
      // not remembered, still chosen for this visit
    }
    // Keep a ?vibe= link truthful; the #<book> hash and our history state stay as they are.
    const url = new URL(window.location.href)
    if (url.searchParams.has('vibe')) {
      url.searchParams.set('vibe', id)
      window.history.replaceState(window.history.state, '', url)
    }
    setVibeId(id)
  }, [])

  return [findVibe(vibeId), choose] as const
}
