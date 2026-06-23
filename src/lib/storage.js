// Progress + streak persistence in localStorage.
//
// Shape: { completed: { [slug]: ISOdate }, streak: number, lastPlayed: 'YYYY-MM-DD' }

const KEY = 'art-of-fauna:v1'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { completed: {}, streak: 0, lastPlayed: null }
    const parsed = JSON.parse(raw)
    return {
      completed: parsed.completed || {},
      streak: parsed.streak || 0,
      lastPlayed: parsed.lastPlayed || null,
    }
  } catch {
    return { completed: {}, streak: 0, lastPlayed: null }
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private mode / quota — fail quietly, the game still plays */
  }
}

function todayKey() {
  // Local calendar day, not UTC — streaks should match the player's day.
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function dayDiff(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((db - da) / 86400000)
}

export function getProgress() {
  return read()
}

export function isCompleted(slug) {
  return Boolean(read().completed[slug])
}

/** Record a solved animal; advance the daily streak. Returns the new state. */
export function markCompleted(slug) {
  const state = read()
  const today = todayKey()

  if (!state.completed[slug]) {
    state.completed[slug] = new Date().toISOString()
  }

  if (state.lastPlayed !== today) {
    const gap = state.lastPlayed ? dayDiff(state.lastPlayed, today) : null
    state.streak = gap === 1 ? state.streak + 1 : 1
    state.lastPlayed = today
  } else if (state.streak === 0) {
    state.streak = 1
  }

  write(state)
  return state
}

export function completedCount() {
  return Object.keys(read().completed).length
}

export function resetProgress() {
  write({ completed: {}, streak: 0, lastPlayed: null })
}
