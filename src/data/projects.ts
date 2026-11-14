export type Project = {
  id: string // slug, used in URL hash: /#weekend-weather
  title: string
  tagline: string // one sentence
  description: string // 2–4 sentences, shown on the open page
  stack: string[]
  year: number
  status: 'live' | 'wip' | 'idea'
  color: string // spine/cover base color
  accent?: string // foil/label color
  coverImage?: string // optional, /covers/<id>.webp
  links?: {label: string, href: string}[]
  height?: number // 0.8–1.15 relative, for natural variation
  thickness?: number // 0.6–1.4 relative
  faceOut?: boolean // stands cover-out at the end of its row, leaning on the others
}

// "Coming soon" blank books: muted, not clickable, no card.
export type ComingSoon = Pick<Project, 'id' | 'color' | 'height' | 'thickness'>

// The books themselves live in projects.example.ts: edit that file to put your own on the shelf.
export {comingSoon, projects} from './projects.example'
