// Synthwave score, synthesised live with the Web Audio API — no asset, no
// licensing, works offline. A driving 8th-note saw bass, a 16th-note arpeggio
// through a tempo-synced echo, a warm detuned-saw pad on an Am–F–C–G
// progression, and four-on-the-floor drums, all on a lookahead scheduler.
// Plays while the puzzle is being solved; a bright chord resolves on solve.
// Honours a persisted mute flag and browser autoplay rules.

const MUTE_KEY = 'art-of-fauna:muted'

const BPM = 100
const STEPS = 16 // 16th-note steps per bar
const BARS = 4

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12)

// Am – F – C – G.  Bass roots (low), chord tones (mid) per bar.
const BASS = [33, 29, 36, 31] // A1 F1 C2 G1
const CHORD = [
  [57, 60, 64], // Am  A3 C4 E4
  [53, 57, 60], // F   F3 A3 C4
  [60, 64, 67], // C   C4 E4 G4
  [55, 59, 62], // G   G3 B3 D4
]

class SynthwaveAudio {
  constructor() {
    this.ctx = null
    this.master = null
    this.playing = false
    this.timer = null
    this.step = 0
    this.nextTime = 0
    this.muted = this._readMuted()
    this._gestureBound = false
    this.sp16 = 60 / BPM / 4 // seconds per 16th note
  }

  _readMuted() {
    try {
      return localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      return false
    }
  }

  isMuted() {
    return this.muted
  }

  _ensureGraph() {
    if (this.ctx) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 0.0001
    this.master.connect(ctx.destination)

    // Reverb (bright, medium)
    const reverb = ctx.createConvolver()
    reverb.buffer = this._impulse(1.8, 2.6)
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    reverb.connect(wet)
    wet.connect(this.master)
    this.reverb = reverb

    // Tempo-synced feedback delay (the signature synthwave echo) — dotted 8th.
    const delay = ctx.createDelay(1.0)
    delay.delayTime.value = this.sp16 * 3
    const fb = ctx.createGain()
    fb.gain.value = 0.36
    const delayWet = ctx.createGain()
    delayWet.gain.value = 0.5
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(delayWet)
    delayWet.connect(this.master)
    delayWet.connect(reverb)
    this.delay = delay

    // Cached white-noise buffer for drums.
    this.noise = this._noise(1)
  }

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * seconds)
    const buf = this.ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
    return buf
  }

  _noise(seconds) {
    const rate = this.ctx.sampleRate
    const len = Math.floor(rate * seconds)
    const buf = this.ctx.createBuffer(1, len, rate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  ensureRunning() {
    this._ensureGraph()
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
    if (!this._gestureBound && typeof window !== 'undefined') {
      this._gestureBound = true
      window.addEventListener('pointerdown', () => this.ctx && this.ctx.resume().catch(() => {}), {
        once: true,
      })
    }
  }

  // ---- Instrument voices -------------------------------------------------

  _kick(t) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.frequency.setValueAtTime(150, t)
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12)
    g.gain.setValueAtTime(0.9, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.22)
  }

  _clap(t) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800
    bp.Q.value = 0.7
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.master)
    g.connect(this.reverb)
    src.start(t)
    src.stop(t + 0.2)
  }

  _hat(t) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 7500
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.18, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045)
    src.connect(hp)
    hp.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + 0.06)
  }

  _bass(t, m) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = midi(m)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 700
    const g = ctx.createGain()
    const dur = this.sp16 * 2 * 0.92
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(lp)
    lp.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  _arp(t, m) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = midi(m + 12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    osc.connect(g)
    g.connect(this.delay) // echo
    g.connect(this.reverb)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.22)
  }

  _pad(t, tones) {
    const ctx = this.ctx
    const dur = this.sp16 * STEPS * 0.98 // one bar
    const padGain = ctx.createGain()
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 2000
    padGain.connect(lp)
    lp.connect(this.master)
    lp.connect(this.reverb)
    padGain.gain.setValueAtTime(0.0001, t)
    padGain.gain.exponentialRampToValueAtTime(0.12, t + 0.35)
    padGain.gain.setValueAtTime(0.12, t + dur - 0.4)
    padGain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const oscs = []
    tones.forEach((m) => {
      ;[-6, 6].forEach((det) => {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = midi(m)
        o.detune.value = det
        o.connect(padGain)
        o.start(t)
        o.stop(t + dur + 0.05)
        oscs.push(o)
      })
    })
  }

  // ---- Scheduler ---------------------------------------------------------

  _scheduleStep(step, t) {
    const bar = Math.floor(step / STEPS) % BARS
    const s = step % STEPS
    const chord = CHORD[bar]

    if (s === 0) this._pad(t, chord)
    if (s % 4 === 0) this._kick(t) // four-on-the-floor
    if (s === 4 || s === 12) this._clap(t) // backbeat
    if (s % 2 === 0) this._hat(t) // 8th-note hats
    if (s % 2 === 0) this._bass(t, BASS[bar]) // driving 8th bass
    // 16th-note arpeggio cycling the chord tones, ascending.
    this._arp(t, chord[s % chord.length] + (s >= 8 ? 12 : 0))
  }

  _tick() {
    const ctx = this.ctx
    const scheduleAhead = 0.12
    while (this.nextTime < ctx.currentTime + scheduleAhead) {
      this._scheduleStep(this.step, this.nextTime)
      this.nextTime += this.sp16
      this.step = (this.step + 1) % (STEPS * BARS)
    }
  }

  startPad() {
    this.ensureRunning()
    if (!this.ctx || this.playing) return
    this.playing = true
    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.08
    this._applyMasterTarget()
    this.timer = setInterval(() => this._tick(), 25)
  }

  stopPad() {
    if (!this.ctx || !this.playing) return
    this.playing = false
    clearInterval(this.timer)
    this.timer = null
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now)
    this.master.gain.exponentialRampToValueAtTime(0.0001, now + 0.6)
  }

  // A bright resolving chord on solve (Am add9 with a filter sweep up).
  resolveChord() {
    this.ensureRunning()
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(400, t)
    lp.frequency.exponentialRampToValueAtTime(6500, t + 1.1)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.08)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3)
    lp.connect(g)
    g.connect(ctx.destination) // dry — survives the loop's master fade-out
    g.connect(this.reverb)
    ;[57, 60, 64, 69, 71].forEach((m) => {
      ;[-7, 7].forEach((det) => {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = midi(m)
        o.detune.value = det
        o.connect(lp)
        o.start(t)
        o.stop(t + 3.1)
      })
    })
  }

  _applyMasterTarget() {
    if (!this.master || !this.ctx) return
    const now = this.ctx.currentTime
    const target = this.muted ? 0.0001 : 0.16
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now)
    this.master.gain.exponentialRampToValueAtTime(Math.max(0.0001, target), now + 0.8)
  }

  setMuted(muted) {
    this.muted = muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    if (this.playing) this._applyMasterTarget()
  }
}

export const audio = new SynthwaveAudio()
