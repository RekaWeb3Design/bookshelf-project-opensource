// Remembers whether the last input was a pointer (mouse, touch, pen) or the keyboard, as data-input on <html>.
// Browsers treat focus moved by code (into a dialog, onto the open page) as "focus-visible" even right after
// a tap; the stylesheet uses this to show focus rings to keyboard users only.
const root = document.documentElement
root.dataset.input = 'pointer'
window.addEventListener('pointerdown', () => {
  root.dataset.input = 'pointer'
}, true)
window.addEventListener('keydown', (e) => {
  if (!e.metaKey && !e.ctrlKey && !e.altKey) root.dataset.input = 'keyboard'
}, true)
