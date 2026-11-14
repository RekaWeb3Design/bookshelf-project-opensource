import type {Project} from '../data/projects'
import {fillCloth} from './cloth'
import {SERIF} from './materials'

export const COVER_PX_PER_M = 2560

export const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

// Generated front cover (until a project has real cover art): cloth, foil frame, title, tagline, year.
export const drawCover = (project: Project, linen: CanvasImageSource, widthM: number, heightM: number) => {
  const canvas = document.createElement('canvas')
  const w = Math.round(widthM * COVER_PX_PER_M)
  const h = Math.round(heightM * COVER_PX_PER_M)
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const accent = project.accent ?? '#d8c08a'

  fillCloth(ctx, project.color, linen, COVER_PX_PER_M)
  // Darker groove along the spine hinge (left edge)
  const hinge = ctx.createLinearGradient(0, 0, w * 0.09, 0)
  hinge.addColorStop(0, 'rgba(0,0,0,0.3)')
  hinge.addColorStop(0.55, 'rgba(0,0,0,0.05)')
  hinge.addColorStop(0.7, 'rgba(0,0,0,0.22)')
  hinge.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = hinge
  ctx.fillRect(0, 0, w, h)

  const m = w * 0.1
  ctx.strokeStyle = accent
  ctx.lineWidth = w * 0.008
  ctx.strokeRect(m * 1.3, m, w - m * 2.3, h - m * 2)
  ctx.lineWidth = w * 0.003
  ctx.strokeRect(m * 1.55, m * 1.25, w - m * 2.8, h - m * 2.5)

  const cx = (m * 1.3 + w - m) / 2
  const maxText = w - m * 3.6
  ctx.fillStyle = accent
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  let titleSize = w * 0.15
  ctx.font = `600 ${titleSize}px ${SERIF}`
  // Shrink until the longest word fits on a line
  while (Math.max(...project.title.split(' ').map((word) => ctx.measureText(word).width)) > maxText) {
    titleSize *= 0.92
    ctx.font = `600 ${titleSize}px ${SERIF}`
  }
  const titleLines = wrapText(ctx, project.title, maxText)
  const titleTop = h * 0.36 - ((titleLines.length - 1) * titleSize * 1.12) / 2
  titleLines.forEach((line, i) => ctx.fillText(line, cx, titleTop + i * titleSize * 1.12))

  // Small ornament under the title: rule, diamond, rule
  const ruleY = titleTop + (titleLines.length - 0.2) * titleSize * 1.12
  ctx.fillRect(cx - w * 0.16, ruleY, w * 0.11, w * 0.004)
  ctx.fillRect(cx + w * 0.05, ruleY, w * 0.11, w * 0.004)
  ctx.save()
  ctx.translate(cx, ruleY + w * 0.002)
  ctx.rotate(Math.PI / 4)
  ctx.fillRect(-w * 0.014, -w * 0.014, w * 0.028, w * 0.028)
  ctx.restore()

  const tagSize = w * 0.058
  ctx.font = `italic ${tagSize}px ${SERIF}`
  wrapText(ctx, project.tagline, maxText).forEach((line, i) => ctx.fillText(line, cx, ruleY + tagSize * 2 + i * tagSize * 1.35))

  ctx.font = `500 ${w * 0.055}px ${SERIF}`
  ctx.fillText(String(project.year), cx, h - m * 1.9)

  return canvas
}
