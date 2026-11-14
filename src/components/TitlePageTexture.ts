import {useEffect, useMemo} from 'react'
import {useTexture} from '@react-three/drei'
import {CanvasTexture, SRGBColorSpace} from 'three'
import type {Project} from '../data/projects'
import {wrapText} from './BookCoverTexture'
import {PAPER_URL, SERIF} from './materials'

const PX_PER_M = 4096

// Fake page lighting, shared by the 3D title page (canvas) and the DOM page (CSS) so the two match:
// [distance from the gutter across the page 0..1, darkness]. A gutter shadow, plus a slight falloff at the outer edge.
const PAGE_SHADE: [number, number][] = [[0, 0.42], [0.03, 0.2], [0.14, 0], [0.7, 0], [1, 0.08]]
const shadeColor = (alpha: number) => `rgba(64,38,12,${alpha})`

// CSS background for a page whose gutter is on the given side.
export const pageBackground = (gutter: 'left' | 'right') => {
  const stops = PAGE_SHADE.map(([at, alpha]) => `${shadeColor(alpha)} ${at * 100}%`).join(', ')
  return `linear-gradient(to ${gutter === 'left' ? 'right' : 'left'}, ${stops}), url(${PAPER_URL}) center / cover`
}

// Generated title page: paper, frame, title, tagline, year — in the book's own color. Its gutter is on the right.
const drawTitlePage = (project: Project, paper: HTMLImageElement, widthM: number, heightM: number) => {
  const canvas = document.createElement('canvas')
  const w = Math.round(widthM * PX_PER_M)
  const h = Math.round(heightM * PX_PER_M)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // Same crop as CSS `center / cover`
  const scale = Math.max(w / paper.width, h / paper.height)
  ctx.drawImage(paper, (w - paper.width * scale) / 2, (h - paper.height * scale) / 2, paper.width * scale, paper.height * scale)

  const m = w * 0.08
  ctx.strokeStyle = project.color
  ctx.lineWidth = w * 0.006
  ctx.strokeRect(m, m, w - m * 2, h - m * 2)
  ctx.lineWidth = w * 0.002
  ctx.strokeRect(m * 1.25, m * 1.25, w - m * 2.5, h - m * 2.5)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const maxText = w - m * 4

  ctx.fillStyle = project.color
  const titleSize = w * 0.105
  ctx.font = `600 ${titleSize}px ${SERIF}`
  const titleLines = wrapText(ctx, project.title, maxText)
  titleLines.forEach((line, i) => ctx.fillText(line, w / 2, h * 0.3 + i * titleSize * 1.2))

  const ruleY = h * 0.3 + titleLines.length * titleSize * 1.2
  ctx.fillRect(w / 2 - w * 0.08, ruleY, w * 0.16, w * 0.004)

  ctx.fillStyle = '#4a4238'
  const tagSize = w * 0.048
  ctx.font = `italic ${tagSize}px ${SERIF}`
  wrapText(ctx, project.tagline, maxText).forEach((line, i) => ctx.fillText(line, w / 2, ruleY + tagSize * 2 + i * tagSize * 1.4))

  ctx.fillStyle = project.color
  ctx.font = `${w * 0.045}px ${SERIF}`
  ctx.fillText(String(project.year), w / 2, h - m * 2.2)

  const shade = ctx.createLinearGradient(w, 0, 0, 0)
  PAGE_SHADE.forEach(([at, alpha]) => shade.addColorStop(at, shadeColor(alpha)))
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, w, h)

  return canvas
}

export const useTitlePageTexture = (project: Project, widthM: number, heightM: number) => {
  const paper = useTexture(PAPER_URL)
  const texture = useMemo(() => {
    const tex = new CanvasTexture(drawTitlePage(project, paper.image as HTMLImageElement, widthM, heightM))
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 8
    return tex
  }, [project, paper, widthM, heightM])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}
