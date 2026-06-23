// Top-level router + progress state. Library ⇄ play, with shareable
// per-animal deep links (artoffauna.app/a/[slug], mirrored locally as /a/slug).

import { useCallback, useEffect, useState } from 'react'
import './lib/gsap.js' // register plugins early
import Library from './components/Library.jsx'
import PlayFlow from './components/PlayFlow.jsx'
import { animals, animalBySlug } from './data/animals.js'
import { getProgress } from './lib/storage.js'
import { audio } from './lib/audio.js'

function slugFromLocation() {
  const m = window.location.pathname.match(/\/a\/([a-z0-9-]+)/i)
  if (m && animalBySlug[m[1]]) return m[1]
  const q = new URLSearchParams(window.location.search).get('a')
  return q && animalBySlug[q] ? q : null
}

export default function App() {
  const [progress, setProgress] = useState(() => getProgress())
  const [index, setIndex] = useState(() => {
    const slug = slugFromLocation()
    return slug ? animals.findIndex((a) => a.slug === slug) : -1
  })

  const inPlay = index >= 0

  // Keep the URL in sync so a solved plate can be shared / reopened.
  // BASE_URL is '/' in dev and '/art-of-fauna/' on GitHub Pages.
  const goTo = useCallback((i, replace = false) => {
    setIndex(i)
    const base = import.meta.env.BASE_URL
    const url = i >= 0 ? `${base}a/${animals[i].slug}` : base
    const fn = replace ? 'replaceState' : 'pushState'
    try {
      window.history[fn]({ i }, '', url)
    } catch {
      /* sandboxed history — ignore */
    }
  }, [])

  // Browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const slug = slugFromLocation()
      setIndex(slug ? animals.findIndex((a) => a.slug === slug) : -1)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const handlePick = (i) => {
    audio.ensureRunning() // this click is a user gesture — unlock audio now
    goTo(i)
  }
  const handleBack = () => goTo(-1)
  const handleNext = () => goTo((index + 1) % animals.length)

  return (
    <main className="min-h-full px-4 py-6 sm:px-8 sm:py-10">
      {inPlay ? (
        <PlayFlow
          key={animals[index].slug}
          animal={animals[index]}
          onBack={handleBack}
          onNext={handleNext}
          onCompleted={setProgress}
        />
      ) : (
        <Library progress={progress} onPick={handlePick} />
      )}
    </main>
  )
}
