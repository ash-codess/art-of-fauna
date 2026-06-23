// Bottom progress bar — width eased with GSAP on each strip solved,
// never jumping.

import { useEffect, useRef } from 'react'
import { gsap, SOFT } from '../lib/gsap.js'

export default function ProgressBar({ value, label }) {
  const fillRef = useRef(null)

  useEffect(() => {
    if (!fillRef.current) return
    gsap.to(fillRef.current, {
      width: `${Math.round(value * 100)}%`,
      duration: 0.7,
      ease: SOFT,
    })
  }, [value])

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
        <div
          ref={fillRef}
          className="h-full rounded-full bg-moss"
          style={{ width: 0 }}
        />
      </div>
      {label ? (
        <span className="nums text-[11px] font-semibold uppercase tracking-chip text-ink/55">
          {label}
        </span>
      ) : null}
    </div>
  )
}
