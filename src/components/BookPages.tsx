import {useEffect, useMemo, useRef, type RefObject} from 'react'
import {useFrame} from '@react-three/fiber'
import {Html} from '@react-three/drei'
import {MeshBasicMaterial, type Group} from 'three'
import type {Project} from '../data/projects'
import {twoToneBox} from './bookGeometry'
import {htmlLayer} from './htmlLayer'
import {BOOK, type BookSize} from './layout'
import {displayReferred, pageMaterial} from './materials'
import {OPEN, PAGE_CSS_PX_PER_M, stage} from './openAnimation'
import {ProjectPage} from './ProjectPage'
import {pageBackground, useTitlePageTexture} from './TitlePageTexture'

const SHEETS = 3
const SHEET_T = 0.0004
const SHEET_GAP = 0.0006
// The top sheet (the title page) rests ~5° off flat; the ones below lie a touch flatter, on the open cover (-176°).
const sheetAngle = (i: number) => ((-175.7 + i * 0.35) * Math.PI) / 180

// Drei's Html transform maps 40 CSS px to 1 world unit; the page is laid out at PAGE_CSS_PX_PER_M and scaled to fit.
const HTML_SCALE = 40 / PAGE_CSS_PX_PER_M

type BookPagesProps = {
  project: Project
  size: BookSize
  clock: RefObject<number> // open timeline, owned by Book
  html: boolean // lay the project page on the right-hand page (false: a 2D card shows it instead)
  onClose: () => void
}

// Only mounted while a book is out of its slot. Same local frame as Book.
export const BookPages = ({project, size, clock, html, onClose}: BookPagesProps) => {
  const {height: h, thickness: t} = size
  const {depth: d, coverT, spineT, pageInset} = BOOK
  const pageW = d - spineT - pageInset
  const pageH = h - pageInset * 2

  const sheetRefs = useRef<(Group | null)[]>([])
  const contentRef = useRef<HTMLDivElement>(null)

  const titleTexture = useTitlePageTexture(project, pageW, pageH)
  // Unlit and display-referred, so the title page has exactly the same paper as the Html page next to it.
  const titleMaterial = useMemo(
    () => displayReferred(new MeshBasicMaterial({map: titleTexture, toneMapped: false})),
    [titleTexture],
  )
  useEffect(() => () => titleMaterial.dispose(), [titleMaterial])
  // The -x face is the one facing the reader once the sheet has turned.
  const topSheetMaterials = useMemo(() => [pageMaterial, titleMaterial], [titleMaterial])
  const topSheetGeometry = useMemo(() => twoToneBox(SHEET_T, pageH, pageW, [1]), [pageH, pageW])
  useEffect(() => () => topSheetGeometry.dispose(), [topSheetGeometry])
  const focusMoved = useRef(false)

  useFrame(() => {
    const time = clock.current
    sheetRefs.current.forEach((sheet, i) => {
      if (!sheet) return
      const p = stage(time, {start: OPEN.sheets.start + i * OPEN.sheets.stagger, duration: OPEN.sheets.duration})
      sheet.visible = p > 0
      sheet.rotation.y = p * sheetAngle(i)
    })
    const el = contentRef.current
    if (el) {
      const p = stage(time, OPEN.content)
      el.style.opacity = String(p)
      el.style.pointerEvents = p > 0.5 ? 'auto' : 'none'
      // Once the page is readable, keyboard focus moves onto it (its "back" button comes first).
      if (p > 0.5 !== focusMoved.current) {
        focusMoved.current = p > 0.5
        if (p > 0.5) el.querySelector('button')?.focus({preventScroll: true})
      }
    }
  })

  return (
    <>
      {/* Sheets hinge just above the cover's hinge line; hidden until they start turning */}
      {Array.from({length: SHEETS}, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            sheetRefs.current[i] = el
          }}
          position={[t / 2 + SHEET_GAP * (i + 1), 0, -spineT]}
          visible={false}
        >
          {i === SHEETS - 1
            ? <mesh position={[0, h / 2, -pageW / 2]} geometry={topSheetGeometry} material={topSheetMaterials} />
            : (
                <mesh position={[0, h / 2, -pageW / 2]} material={pageMaterial}>
                  <boxGeometry args={[SHEET_T, pageH, pageW]} />
                </mesh>
              )}
        </group>
      ))}

      {/* Right page: real DOM laid on top of the page block */}
      {html && (
        <Html
          ref={contentRef}
          portal={htmlLayer as RefObject<HTMLElement>}
          transform
          position={[t / 2 - coverT + 0.0005, h / 2, -spineT - pageW / 2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={HTML_SCALE}
          className="project-page"
          style={{width: pageW * PAGE_CSS_PX_PER_M, height: pageH * PAGE_CSS_PX_PER_M, background: pageBackground('left'), opacity: 0}}
        >
          <ProjectPage project={project} onClose={onClose} />
        </Html>
      )}
    </>
  )
}
