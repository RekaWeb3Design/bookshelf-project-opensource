import {useLayoutEffect, useRef, type CSSProperties} from 'react'
import type {Project} from '../data/projects'
import {ProjectPage} from './ProjectPage'
import {pageBackground} from './TitlePageTexture'

type ProjectCardProps = {
  project: Project
  delayed: boolean // wait for the book to fly up before fading in
  onClose: () => void
}

// The project page as a 2D card, for when the page inside the 3D book would be too small to read (small screens)
// or the book doesn't fly at all (reduced motion). A modal dialog: focus moves in, is trapped, and returns on close.
// While the card is still fading in (after the book's flight, when delayed), a tap on the backdrop is most likely
// the second tap of a double-tap that opened the book — not a request to close it.
const IGNORE_BACKDROP_MS = {delayed: 1500, immediate: 400}

export const ProjectCard = ({project, delayed, onClose}: ProjectCardProps) => {
  const ref = useRef<HTMLDialogElement>(null)
  const openedAt = useRef(0)

  // Layout effect: close() must run while the dialog is still in the DOM, or focus isn't handed back.
  useLayoutEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    openedAt.current = performance.now()
    return () => dialog.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className={delayed ? 'project-card project-card--delayed' : 'project-card'}
      aria-label={project.title}
      style={{'--book': project.color, background: pageBackground('left')} as CSSProperties}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClose={(e) => {
        if (!e.currentTarget.open) onClose() // force-closed by the browser
      }}
      onClick={(e) => {
        const settled = performance.now() - openedAt.current > IGNORE_BACKDROP_MS[delayed ? 'delayed' : 'immediate']
        if (e.target === e.currentTarget && settled) onClose() // the backdrop
      }}
    >
      <div className="project-page project-card__page">
        <ProjectPage project={project} onClose={onClose} />
      </div>
    </dialog>
  )
}
