// Drives one animal through puzzle → description → fact, with a Flip
// shared-element morph from the assembled strips into the revealed plate,
// plus the puzzle chrome (pause, shuffle, share, back) and progress bar.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap, Flip, SOFT, prefersReducedMotion } from '../lib/gsap.js'
import Puzzle from './Puzzle.jsx'
import Revealed from './Revealed.jsx'
import ProgressBar from './ProgressBar.jsx'
import IconButton from './IconButton.jsx'
import { markCompleted } from '../lib/storage.js'
import { shareAnimal } from '../lib/share.js'
import { audio } from '../lib/audio.js'

// Stable per-animal number so each species opens on a consistent track.
function hashSlug(slug) {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0
  return Math.abs(h)
}

const SHARE_MESSAGES = {
  shared: 'Shared ✓',
  'downloaded+copied': 'Card saved · link copied ✓',
  downloaded: 'Card saved ✓',
  copied: 'Link copied ✓',
  failed: 'Could not share',
}

export default function PlayFlow({ animal, onBack, onNext, onCompleted }) {
  const [subview, setSubview] = useState('puzzle')
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [shuffleSignal, setShuffleSignal] = useState(0)
  const [toast, setToast] = useState(null)
  const [muted, setMuted] = useState(() => audio.isMuted())
  const [trackName, setTrackName] = useState(null)

  const frameRef = useRef(null)
  const stageRef = useRef(null)
  const flipStateRef = useRef(null)
  const pendingMorphRef = useRef(false)
  const toastTimer = useRef(null)

  // Reset the flow whenever the animal changes.
  useEffect(() => {
    setSubview('puzzle')
    setPaused(false)
    setProgress(0)
  }, [animal.slug])

  // Synthwave plays while solving (one track per animal); stops once revealed.
  useEffect(() => {
    if (subview === 'puzzle') setTrackName(audio.startPad(hashSlug(animal.slug)))
    else audio.stopPad()
    return () => audio.stopPad()
  }, [subview, animal.slug])

  // Page entrance: the whole stage slides in with the shared soft ease.
  useLayoutEffect(() => {
    if (prefersReducedMotion || !stageRef.current) return
    const tw = gsap.fromTo(
      stageRef.current,
      { x: 36, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: SOFT },
    )
    return () => tw.kill()
  }, [animal.slug])

  // Solve handler: capture the hero's geometry, then swap to the revealed view.
  const handleSolved = () => {
    const state = markCompleted(animal.slug)
    onCompleted && onCompleted(state)
    audio.resolveChord()
    if (!prefersReducedMotion) {
      flipStateRef.current = Flip.getState('[data-flip-id="hero"]')
      pendingMorphRef.current = true
    }
    setSubview('description')
  }

  // Run the Flip morph once the revealed <img> has mounted.
  useLayoutEffect(() => {
    if (subview !== 'description' || !pendingMorphRef.current) return
    pendingMorphRef.current = false
    const state = flipStateRef.current
    if (!state) return
    Flip.from(state, {
      duration: 0.9,
      ease: SOFT,
      absolute: true,
      scale: true,
    })
  }, [subview])

  const reshuffle = () => {
    if (subview !== 'puzzle') return
    setPaused(false)
    setProgress(0)
    setShuffleSignal((n) => n + 1)
  }

  const onShare = async () => {
    setToast('…')
    const status = await shareAnimal(animal)
    setToast(SHARE_MESSAGES[status] || 'Done')
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m
      audio.setMuted(next)
      if (!next) audio.ensureRunning() // unmuting is a user gesture — resume
      return next
    })
  }

  const inPuzzle = subview === 'puzzle'

  return (
    <section ref={stageRef} className="mx-auto flex w-full max-w-md flex-col gap-4">
      {/* Top chrome */}
      <div className="flex items-center justify-between">
        <IconButton label="Back to library" onClick={onBack}>
          ←
        </IconButton>

        <div className="flex flex-col items-center">
          <span className="text-[10px] font-semibold uppercase tracking-chip text-ink/45">
            {inPuzzle ? 'Drag tiles into place' : 'Field guide'}
          </span>
          {inPuzzle && trackName && (
            <button
              type="button"
              onClick={() => setTrackName(audio.nextTrack())}
              title="Next track"
              className="mt-0.5 text-[10px] font-semibold uppercase tracking-chip text-moss transition-colors hover:text-terra"
            >
              ♪ {trackName} ›
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <IconButton
            label={muted ? 'Unmute ambient sound' : 'Mute ambient sound'}
            active={!muted}
            onClick={toggleMute}
          >
            {muted ? '🔇' : '♪'}
          </IconButton>
          {inPuzzle ? (
            <>
              <IconButton
                label={paused ? 'Resume' : 'Pause'}
                active={paused}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? '▶' : '⏸'}
              </IconButton>
              <IconButton label="Shuffle" onClick={reshuffle}>
                🔀
              </IconButton>
            </>
          ) : (
            <IconButton label="Share this animal" onClick={onShare}>
              ↗
            </IconButton>
          )}
        </div>
      </div>

      {/* Card region */}
      <div className="relative">
        {inPuzzle ? (
          <>
            <Puzzle
              animal={animal}
              frameRef={frameRef}
              paused={paused}
              shuffleSignal={shuffleSignal}
              onProgress={setProgress}
              onSolved={handleSolved}
            />
            {/* Pause dim */}
            <div
              aria-hidden={!paused}
              className={[
                'pointer-events-none absolute inset-0 grid place-items-center rounded-panel',
                'bg-sage/60 backdrop-blur-[3px] transition-opacity duration-300',
                paused ? 'opacity-100' : 'opacity-0',
              ].join(' ')}
            >
              <span className="text-sm font-semibold uppercase tracking-chip text-ink/60">
                Paused
              </span>
            </div>
          </>
        ) : (
          <Revealed
            animal={animal}
            mode={subview}
            frameRef={frameRef}
            onToggle={() => setSubview((m) => (m === 'description' ? 'fact' : 'description'))}
            onNext={onNext}
          />
        )}
      </div>

      {/* Bottom: progress while solving */}
      {inPuzzle && (
        <ProgressBar value={progress} label={`${Math.round(progress * 100)}%`} />
      )}

      {/* Share toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
          <span className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-leaf shadow-lg">
            {toast}
          </span>
        </div>
      )}
    </section>
  )
}
