import {useCallback, useEffect, useState} from 'react'
import {projects} from './data/projects'

const readHash = () => {
  const id = decodeURIComponent(window.location.hash.slice(1))
  return projects.some((p) => p.id === id) ? id : null
}

// Marks history entries we pushed ourselves, so closing knows whether there is one to go back to.
const OPENED = {shelfOpened: true}
let leaving = false // a history.back() is in flight; ignore further calls until it lands

// The URL hash is the source of truth for the open book: /#<id> opens it, no hash closes it.
export const useSelectedId = () => {
  const [selectedId, setSelectedId] = useState(readHash)

  useEffect(() => {
    const sync = () => {
      leaving = false
      setSelectedId(readHash())
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  const select = useCallback((id: string | null) => {
    const current = readHash()
    if (id === current || leaving) return
    if (id) {
      // Opening pushes one entry; switching books while one is open reuses it.
      if (current) window.history.replaceState(window.history.state, '', `#${id}`)
      else window.history.pushState(OPENED, '', `#${id}`)
      setSelectedId(id)
    } else if (window.history.state?.shelfOpened) {
      // Opened by us in this session: step back onto the shelf entry (popstate syncs the state).
      leaving = true
      window.history.back()
    } else {
      // Deep link: nothing of ours to go back to, so just clear the hash in place.
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setSelectedId(null)
    }
  }, [])

  return [selectedId, select] as const
}
