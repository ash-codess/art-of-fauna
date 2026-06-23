// The post-solve views: the revealed artwork (with names) and the fact card.
// A segmented toggle slides between them; "Next" advances to the next animal.
// Tab swaps animate as a horizontal slide-swap; chips stagger in.

import { useLayoutEffect, useRef } from 'react'
import { gsap, SOFT, prefersReducedMotion } from '../lib/gsap.js'
import { imageUrl, IUCN } from '../data/animals.js'
import { MetaChip } from './Chip.jsx'

// Class → glyph for the class chip.
const CLASS_GLYPH = {
  Bird: '🪶',
  Mammal: '🐾',
  Reptile: '🦎',
  Fish: '🐟',
  Insect: '🦋',
  Mollusc: '🐙',
  Jellyfish: '🌀',
}

// IUCN code → tone + glyph for the status chip.
const IUCN_TONE = {
  EX: 'terra',
  EW: 'terra',
  CR: 'terra',
  EN: 'terra',
  VU: 'terra',
  NT: 'terra',
  LC: 'moss',
  DD: 'ink',
  NE: 'ink',
}

export default function Revealed({ animal, mode, frameRef, onToggle, onNext }) {
  const contentRef = useRef(null)
  const chipsRef = useRef(null)
  const prevMode = useRef(mode)

  // Slide-swap the content card whenever the mode changes (image ↔ fact),
  // and stagger the metadata chips in on the fact view.
  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      prevMode.current = mode
      return
    }
    const forward = mode === 'fact' // image → fact slides in from the right
    const fromX = forward ? 40 : -40

    const tl = gsap.timeline()
    tl.fromTo(
      contentRef.current,
      { x: fromX, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.5, ease: SOFT },
    )

    if (mode === 'fact' && chipsRef.current) {
      tl.fromTo(
        chipsRef.current.children,
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: SOFT, stagger: 0.08 },
        '-=0.3',
      )
    }

    prevMode.current = mode
    return () => tl.kill()
  }, [mode])

  // Gentle idle "breathing" on the revealed plate — keeps the calm alive.
  useLayoutEffect(() => {
    if (mode !== 'description' || prefersReducedMotion) return
    const el = frameRef.current
    if (!el) return
    const tween = gsap.to(el, {
      scale: 1.012,
      duration: 4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
    return () => {
      tween.kill()
      gsap.set(el, { scale: 1 })
    }
  }, [mode, frameRef])

  const toggleLabel = mode === 'description' ? 'Description' : 'Image'

  return (
    <div className="flex flex-col gap-5">
      <div ref={contentRef}>
        {mode === 'description' ? (
          <figure className="flex flex-col gap-4">
            <div ref={frameRef} className="glass p-3">
              <div
                className="overflow-hidden rounded-[16px] bg-sage-deep"
                style={{ aspectRatio: `${animal.width} / ${animal.height}` }}
              >
                <img
                  data-flip-id="hero"
                  src={imageUrl(animal.file, 1100)}
                  alt={`Vintage illustration of the ${animal.common}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>
            </div>
            <figcaption className="px-1">
              <p className="guide-serif text-base italic text-ink/55">{animal.latin}</p>
              <h2 className="guide-serif text-3xl font-semibold leading-tight text-ink">
                {animal.common}
              </h2>
              <p className="mt-1 text-[11px] uppercase tracking-chip text-ink/40">
                {animal.credit}
              </p>
            </figcaption>
          </figure>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="glass px-6 py-7">
              <p className="guide-serif text-base italic text-ink/55">{animal.latin}</p>
              <h2 className="guide-serif mb-3 text-2xl font-semibold leading-tight text-ink">
                {animal.common}
              </h2>
              <p className="guide-serif text-lg leading-relaxed text-ink/85">
                {animal.fact}
              </p>
            </div>
            <div ref={chipsRef} className="grid grid-cols-2 gap-3">
              <MetaChip
                glyph={CLASS_GLYPH[animal.klass] || '🪶'}
                value={animal.klass}
                label="Class"
                tone="moss"
              />
              <MetaChip
                glyph="🌿"
                value={`${animal.iucn} · ${IUCN[animal.iucn]}`}
                label="IUCN Status"
                tone={IUCN_TONE[animal.iucn] || 'ink'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Segmented tab toggle */}
      <div className="glass-soft grid grid-cols-2 gap-2 p-1.5">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-[20px] px-4 py-2.5 text-sm font-semibold text-ink/70 transition-colors hover:bg-white/40 hover:text-moss"
        >
          {toggleLabel}
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-[20px] bg-moss px-4 py-2.5 text-sm font-semibold text-leaf transition-colors hover:bg-moss-deep"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
