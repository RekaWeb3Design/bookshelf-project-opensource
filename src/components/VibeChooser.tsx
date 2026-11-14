import {useLayoutEffect, useRef, type KeyboardEvent} from 'react'
import {vibes} from '../data/vibes'

type VibeChooserProps = {
  currentId?: string
  onChoose: (id: string) => void
  onClose?: () => void // missing on the first visit: a vibe has to be picked
}

// Modal dialog: the browser traps focus, Esc cancels, and focus returns to the "change vibe" button on close.
export const VibeChooser = ({currentId, onChoose, onClose}: VibeChooserProps) => {
  const ref = useRef<HTMLDialogElement>(null)

  // Layout effect: close() must run while the dialog is still in the DOM, or focus isn't handed back.
  useLayoutEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const card = dialog.querySelector<HTMLElement>('[aria-pressed="true"]') ?? dialog.querySelector<HTMLElement>('.chooser__card')
    card?.focus()
    return () => dialog.close()
  }, [])

  // Arrow keys walk the cards, on top of the usual Tab order.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const step = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[e.key]
    if (!step) return
    e.preventDefault()
    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>('.chooser__card')]
    const current = cards.indexOf(document.activeElement as HTMLElement)
    cards[(current + step + cards.length) % cards.length]?.focus()
  }

  return (
    <dialog
      ref={ref}
      className="chooser"
      aria-labelledby="chooser-title"
      onCancel={(e) => {
        e.preventDefault()
        onClose?.()
      }}
      onClose={(e) => {
        // The browser can force-close a dialog (second Esc). Stay open until a vibe is picked.
        if (e.currentTarget.open) return
        if (onClose) onClose()
        else e.currentTarget.showModal()
      }}
    >
      <h1 id="chooser-title">Choose your vibe</h1>
      <p className="chooser__lede">Where should the shelf live tonight?</p>
      <ul className="chooser__grid" onKeyDown={onKeyDown}>
        {vibes.map((vibe) => (
          <li key={vibe.id}>
            <button className="chooser__card" aria-pressed={vibe.id === currentId} onClick={() => onChoose(vibe.id)}>
              <img src={vibe.thumb} alt="" width={480} height={268} />
              <span>{vibe.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {onClose && <button className="chooser__keep" onClick={onClose}>Keep the current one</button>}
    </dialog>
  )
}
