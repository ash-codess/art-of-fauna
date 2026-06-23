// The puzzle mechanic: a vintage plate sliced into a 2D grid of tiles, each
// nudged off its home cell in both axes. Tiles enter staggered, are dragged
// back into the grid (GSAP Draggable, x + y), and snap home with an elastic
// bounce. Last tile locking in triggers the solve celebration. The artwork
// floats inside a frosted-glass panel.

import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap, Draggable, SOFT, prefersReducedMotion } from '../lib/gsap.js'
import { imageUrl, aspectOf } from '../data/animals.js'

const COLS = 4

function gridFor(aspect) {
  const rows = Math.min(6, Math.max(3, Math.round(COLS / aspect)))
  return { cols: COLS, rows }
}

const rand = (lo, hi) => lo + Math.random() * (hi - lo)

function makeOffsets(cols, rows, tileW, tileH) {
  const maxX = 1.25 * tileW
  const maxY = 1.25 * tileH
  const out = []
  for (let k = 0; k < cols * rows; k++) {
    const col = k % cols
    const row = Math.floor(k / cols)
    const loTx = Math.max(-col * tileW, -maxX)
    const hiTx = Math.min((cols - 1 - col) * tileW, maxX)
    const loTy = Math.max(-row * tileH, -maxY)
    const hiTy = Math.min((rows - 1 - row) * tileH, maxY)
    let dx = rand(loTx, hiTx)
    let dy = rand(loTy, hiTy)
    if (Math.abs(dx) < 0.45 * tileW && Math.abs(dy) < 0.45 * tileH) {
      if (hiTx - loTx > hiTy - loTy) dx = Math.random() < 0.5 ? loTx : hiTx
      else dy = Math.random() < 0.5 ? loTy : hiTy
    }
    out.push({ dx, dy })
  }
  return out
}

export default function Puzzle({
  animal,
  frameRef,
  paused,
  shuffleSignal,
  onProgress,
  onSolved,
}) {
  const areaRef = useRef(null)
  const layerRef = useRef(null)
  const flashRef = useRef(null)
  const tileRefs = useRef([])
  const dragRefs = useRef([])
  const lockedRef = useRef(new Set())
  const sizeRef = useRef({ w: 0, h: 0 })
  const solvedRef = useRef(false)

  const aspect = aspectOf(animal)
  const { cols, rows } = gridFor(aspect)
  const total = cols * rows
  const bg = imageUrl(animal.file, 1100)

  // Match the play area to the plate's aspect ratio + lay out tiles.
  useLayoutEffect(() => {
    const area = areaRef.current
    if (!area) return
    const apply = () => {
      const w = area.clientWidth
      const h = w / aspect
      area.style.height = `${h}px`
      sizeRef.current = { w, h }
      layoutTiles()
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(area)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect])

  function layoutTiles() {
    const { w, h } = sizeRef.current
    if (!w) return
    const tileW = w / cols
    const tileH = h / rows
    tileRefs.current.forEach((el, k) => {
      if (!el) return
      const col = k % cols
      const row = Math.floor(k / cols)
      el.style.width = `${tileW}px`
      el.style.height = `${tileH}px`
      el.style.left = `${col * tileW}px`
      el.style.top = `${row * tileH}px`
      el.style.backgroundSize = `${w}px ${h}px`
      el.style.backgroundPosition = `${-col * tileW}px ${-row * tileH}px`
    })
  }

  useLayoutEffect(() => {
    const { w, h } = sizeRef.current
    if (!w) return

    solvedRef.current = false
    lockedRef.current = new Set()
    onProgress(0)

    const tileW = w / cols
    const tileH = h / rows
    const thX = Math.max(14, tileW * 0.18)
    const thY = Math.max(14, tileH * 0.18)
    const offsets = makeOffsets(cols, rows, tileW, tileH)
    const reduce = prefersReducedMotion

    layoutTiles()

    dragRefs.current.forEach((d) => d && d.kill())
    dragRefs.current = []

    const lockTile = (k) => {
      if (lockedRef.current.has(k)) return
      lockedRef.current.add(k)
      const d = dragRefs.current[k]
      if (d) d.disable()
      const el = tileRefs.current[k]
      el.style.zIndex = '1'
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: reduce ? 0.2 : 0.8,
        ease: reduce ? SOFT : 'elastic.out(1, 0.55)',
      })
      el.classList.add('tile-locked')
      onProgress(lockedRef.current.size / total)
      if (lockedRef.current.size === total) celebrate()
    }

    const celebrate = () => {
      if (solvedRef.current) return
      solvedRef.current = true
      const frame = frameRef.current
      const flash = flashRef.current
      if (reduce) {
        onSolved()
        return
      }
      const tl = gsap.timeline({ onComplete: () => onSolved() })
      tl.to(frame, { scale: 1.03, duration: 0.25, ease: SOFT })
        .to(frame, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.5)' })
        .fromTo(
          flash,
          { opacity: 0, scale: 0.6 },
          { opacity: 0.9, scale: 1.35, duration: 0.5, ease: 'power2.out' },
          0,
        )
        .to(flash, { opacity: 0, duration: 0.5, ease: 'power1.in' }, '>-0.15')
        .to({}, { duration: 0.15 })
    }

    tileRefs.current.forEach((el, k) => {
      const col = k % cols
      const row = Math.floor(k / cols)
      const { dx, dy } = offsets[k]
      const sideX = (col < cols / 2 ? -1 : 1) * w * 0.45
      const sideY = (row < rows / 2 ? -1 : 1) * h * 0.3

      gsap.set(el, reduce ? { x: dx, y: dy } : { x: dx + sideX, y: dy + sideY, opacity: 0, scale: 0.92 })
      if (!reduce) {
        gsap.to(el, {
          x: dx,
          y: dy,
          opacity: 1,
          scale: 1,
          duration: 0.85,
          ease: 'power3.out',
          delay: (row + col) * 0.05,
        })
      }

      const d = Draggable.create(el, {
        type: 'x,y',
        bounds: areaRef.current,
        cursor: 'grab',
        activeCursor: 'grabbing',
        zIndexBoost: true,
        allowContextMenu: true,
        onPress() {
          gsap.killTweensOf(el)
        },
        onDragEnd() {
          if (Math.abs(this.x) <= thX && Math.abs(this.y) <= thY) lockTile(k)
        },
      })[0]
      dragRefs.current[k] = d
    })

    return () => {
      dragRefs.current.forEach((d) => d && d.kill())
      dragRefs.current = []
      tileRefs.current.forEach((el) => el && gsap.killTweensOf(el))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.slug, shuffleSignal])

  useEffect(() => {
    dragRefs.current.forEach((d, k) => {
      if (!d) return
      if (paused || lockedRef.current.has(k)) d.disable()
      else d.enable()
    })
  }, [paused])

  return (
    <div ref={frameRef} className="glass puzzle-frame relative w-full p-3">
      <div
        ref={areaRef}
        className="relative w-full overflow-hidden rounded-[16px] bg-sage-deep"
      >
        <div ref={layerRef} data-flip-id="hero" className="absolute inset-0">
          {Array.from({ length: total }).map((_, k) => (
            <div
              key={k}
              ref={(el) => (tileRefs.current[k] = el)}
              className="tile absolute bg-no-repeat will-change-transform"
              style={{
                backgroundImage: `url("${bg}")`,
                boxShadow: 'inset 0 0 0 1px rgba(38,48,42,0.18)',
              }}
            />
          ))}
        </div>

        {/* Soft radial colour flash for the solve celebration */}
        <div
          ref={flashRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(197,107,69,0.6), rgba(63,107,76,0.0) 60%)',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </div>
  )
}
