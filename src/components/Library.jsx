// Home / library: a grid of floating glass plates to assemble. Unsolved plates
// are shown blurred (a teaser, not a spoiler); solved plates resolve to crisp art.

import { useLayoutEffect, useRef } from 'react'
import { gsap, SOFT, prefersReducedMotion } from '../lib/gsap.js'
import { animals, imageUrl } from '../data/animals.js'

// A gentle rhythm: a couple of larger feature tiles among the grid.
const SPAN = { 0: 'col-span-2 row-span-2', 5: 'col-span-2', 8: 'row-span-2' }

export default function Library({ progress, onPick }) {
  const gridRef = useRef(null)
  const completed = progress.completed || {}
  const done = Object.keys(completed).length

  // Stagger the tiles in on mount.
  useLayoutEffect(() => {
    if (prefersReducedMotion || !gridRef.current) return
    const tw = gsap.fromTo(
      gridRef.current.children,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, ease: SOFT, stagger: 0.045 },
    )
    return () => tw.kill()
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-chip text-terra">
            A calm assembly
          </p>
          <h1 className="guide-serif text-4xl font-semibold leading-none text-ink sm:text-5xl">
            Art of Fauna
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">
            Slide the scattered tiles of each vintage plate back into place, then
            meet the creature you’ve uncovered.
          </p>
        </div>
        <div className="flex gap-3">
          <Stat value={`${done}/${animals.length}`} label="Assembled" />
          <Stat value={progress.streak || 0} label="Day streak" tone="moss" />
        </div>
      </header>

      {/* Bento grid */}
      <div
        ref={gridRef}
        className="grid auto-rows-[120px] grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {animals.map((a, i) => {
          const isDone = Boolean(completed[a.slug])
          return (
            <button
              key={a.slug}
              type="button"
              onClick={() => onPick(i)}
              className={[
                'group relative overflow-hidden rounded-panel border border-white/45 bg-sage-deep',
                'shadow-[0_12px_30px_rgba(38,48,42,0.14)] text-left transition-transform duration-300 hover:-translate-y-0.5',
                SPAN[i] || '',
              ].join(' ')}
            >
              <img
                src={imageUrl(a.file, 600)}
                alt={isDone ? a.common : 'Unassembled plate'}
                loading="lazy"
                draggable={false}
                className={[
                  'absolute inset-0 h-full w-full object-cover transition-all duration-500',
                  isDone
                    ? 'opacity-90'
                    : 'scale-110 opacity-70 blur-md saturate-[0.7] group-hover:blur-[10px]',
                ].join(' ')}
              />
              {/* Legible footer wash */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent p-3">
                {isDone ? (
                  <>
                    <p className="guide-serif text-xs italic text-leaf/75">
                      {a.latin}
                    </p>
                    <p className="guide-serif text-sm font-semibold leading-tight text-leaf">
                      {a.common}
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-semibold uppercase tracking-chip text-leaf/90">
                    {a.klass} · Tap to assemble
                  </p>
                )}
              </div>

              {/* Solved tick */}
              {isDone && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-moss text-xs text-leaf">
                  ✓
                </span>
              )}
            </button>
          )
        })}
      </div>

      <footer className="pb-4 pt-2 text-center text-[11px] text-ink/45">
        Illustrations are public-domain plates from Audubon, Haeckel, Gould &amp; others.
      </footer>
    </div>
  )
}

function Stat({ value, label, tone }) {
  return (
    <div className="glass flex flex-col items-center px-4 py-2.5">
      <span
        className={`nums guide-serif text-2xl font-semibold leading-none ${
          tone === 'moss' ? 'text-moss' : 'text-ink'
        }`}
      >
        {value}
      </span>
      <span className="mt-1 text-[9px] font-semibold uppercase tracking-chip text-ink/45">
        {label}
      </span>
    </div>
  )
}
