// Central GSAP setup: register plugins once, define the single shared ease.
//
// Draggable, Flip, and CustomEase ship free with GSAP 3.12+. Registering them
// here (and only here) keeps every screen on the same motion vocabulary.

import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'

gsap.registerPlugin(Draggable, Flip, CustomEase)

// One custom ease, reused everywhere — weighted, organic, never "gamey".
// Created idempotently so hot-reload / StrictMode double-invokes don't throw.
export const SOFT = CustomEase.create('soft', '0.6,0,0.2,1')

// Reduced-motion respect — calm should never mean nausea.
export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { gsap, Draggable, Flip, CustomEase }
