import type {ComingSoon, Project} from './projects'

// Sample books. Replace them with your own projects; the Project type in projects.ts documents every field.
export const projects: Project[] = [
  {
    id: 'weekend-weather',
    title: 'Weekend Weather App',
    tagline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    stack: ['React', 'Weather API'],
    year: 2026,
    status: 'live',
    color: '#2f5d8a', // slate blue
    accent: '#f2d27a',
    links: [{label: 'Live site', href: 'https://example.com'}, {label: 'Source', href: 'https://example.com/source'}],
    height: 1.04,
    thickness: 1.1,
  },
  {
    id: 'pixel-garden',
    title: 'Pixel Garden',
    tagline: 'Duis aute irure dolor in reprehenderit in voluptate.',
    description: 'Velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    stack: ['TypeScript', 'Canvas'],
    year: 2026,
    status: 'wip',
    color: '#3f8a4f', // leaf green
    accent: '#fff1c9',
    height: 0.9,
    thickness: 0.8,
  },
  {
    id: 'recipe-scaler',
    title: 'Recipe Scaler',
    tagline: 'Curabitur pretium tincidunt lacus, nulla gravida orci.',
    description: 'Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit.',
    stack: ['Svelte', 'Node'],
    year: 2025,
    status: 'live',
    color: '#c2552f', // terracotta
    accent: '#fde7c8',
    links: [{label: 'Live site', href: 'https://example.com'}],
    height: 1.12,
    thickness: 1.3,
  },
  {
    id: 'night-sky-postcards',
    title: 'Night Sky Postcards',
    tagline: 'Praesent dapibus, neque id cursus faucibus, tortor neque.',
    description: 'Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus. Phasellus ultrices nulla quis nibh.',
    stack: ['Three.js', 'Astronomy'],
    year: 2026,
    status: 'idea',
    color: '#2b2f5e', // midnight
    accent: '#e8c76a',
    height: 0.96,
    thickness: 0.7,
  },
  {
    id: 'type-specimen',
    title: 'Type Specimen Maker',
    tagline: 'Vestibulum ante ipsum primis in faucibus orci luctus.',
    description: 'Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, commodo vitae, ornare sit amet, wisi.',
    stack: ['HTML', 'CSS'],
    year: 2026,
    status: 'live',
    color: '#d9a62b', // mustard
    accent: '#3a2408',
    links: [{label: 'Live site', href: 'https://example.com'}, {label: 'Source', href: 'https://example.com/source'}],
    height: 0.92,
    thickness: 0.75,
    faceOut: true,
  },
  {
    id: 'habit-jar',
    title: 'Habit Jar',
    tagline: 'Pellentesque habitant morbi tristique senectus et netus.',
    description: 'Fusce fermentum odio nec arcu. Vivamus euismod mauris. In ut quam vitae odio lacinia tincidunt. Praesent ut ligula non mi varius sagittis.',
    stack: ['React Native'],
    year: 2025,
    status: 'wip',
    color: '#8a3f7a', // plum
    accent: '#ffe6f4',
    height: 1.0,
    thickness: 1.0,
  },
]

export const comingSoon: ComingSoon[] = [
  {id: 'soon-1', color: '#6b5a4c', height: 0.94, thickness: 0.75},
  {id: 'soon-2', color: '#4e5f6b', height: 1.02, thickness: 1.0},
  {id: 'soon-3', color: '#66604a', height: 0.86, thickness: 0.65},
]
