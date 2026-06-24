// Synthwave score, synthesised live with the Web Audio API — no asset, no
// licensing, works offline. Several tracks (different key, tempo, and lead
// timbre) are available; one is chosen per animal and the player can cycle
// through them. Each track is a driving 8th-note saw bass, a 16th-note arpeggio
// through a tempo-synced echo, a warm detuned-saw pad over a 4-chord
// progression, and four-on-the-floor drums, all on a lookahead scheduler.
// Plays while the puzzle is being solved; a bright chord resolves on solve.

const MUTE_KEY = 'art-of-fauna:muted'
const STEPS = 16 // 16th-note steps per bar
const BARS = 4

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12)

// Each track: 4 bars, with a low bass root + mid chord tones per bar.
const TRACKS = [
  {
    name: 'Midnight Drive',
    bpm: 100,
    lead: 'square',
    bass: [33, 29, 36, 31], // Am – F – C – G
    tones: [
      [57, 60, 64],
      [53, 57, 60],
      [60, 64, 67],
      [55, 59, 62],
    ],
  },
  {
    name: 'Neon Coast',
    bpm: 112,
    lead: 'sawtooth',
    bass: [38, 34, 29, 36], // Dm – B♭ – F – C
    tones: [
      [62, 65, 69],
      [58, 62, 65],
      [53, 57, 60],
      [60, 64, 67],
    ],
  },
  {
    name: 'Afterglow',
    bpm: 90,
    lead: 'triangle',
    bass: [40, 36, 31, 38], // Em – C – G – D
    tones: [
      [64, 67, 71],
      [60, 64, 67],
      [55, 59, 62],
      [62, 66, 69],
    ],
  },
  {
    name: 'Outrun',
    bpm: 124,
    lead: 'sawtooth',
    bass: [36, 32, 39, 34], // Cm – A♭ – E♭ – B♭
    tones: [
      [60, 63, 67],
      [56, 60, 63],
      [63, 67, 70],
      [58, 62, 65],
    ],
  },
]

class SynthwaveAudio {
  constructor() {
    this.ctx = null
    this.master = null
    this.playing = false
    this.timer = null
    this.step = 0
    this.nextTime = 0
    this.trackIndex = 0
    this.track = TRACKS[0]
    this.sp16 = 60 / this.track.bpm / 4
    this.muted = this._readMuted()
    this._gestureBound = false
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

  currentTrackName() {
    return this.track.name
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

    const reverb = ctx.createConvolver()
    reverb.buffer = this._impulse(1.8, 2.6)
    const wet = ctx.createGain()
    wet.gain.value = 0.32
    reverb.connect(wet)
    wet.connect(this.master)
    this.reverb = reverb

    const delay = ctx.createDelay(1.0)
    delay.delayTime.value = this.sp16 * 3 // dotted-8th echo
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
    osc.type = this.track.lead
    osc.frequency.value = midi(m + 12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)
    osc.connect(g)
    g.connect(this.delay)
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
    tones.forEach((m) => {
      ;[-6, 6].forEach((det) => {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = midi(m)
        o.detune.value = det
        o.connect(padGain)
        o.start(t)
        o.stop(t + dur + 0.05)
      })
    })
  }

  // ---- Scheduler ---------------------------------------------------------

  _scheduleStep(step, t) {
    const bar = Math.floor(step / STEPS) % BARS
    const s = step % STEPS
    const tones = this.track.tones[bar]

    if (s === 0) this._pad(t, tones)
    if (s % 4 === 0) this._kick(t)
    if (s === 4 || s === 12) this._clap(t)
    if (s % 2 === 0) this._hat(t)
    if (s % 2 === 0) this._bass(t, this.track.bass[bar])
    this._arp(t, tones[s % tones.length] + (s >= 8 ? 12 : 0))
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

  _selectTrack(i) {
    this.trackIndex = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length
    this.track = TRACKS[this.trackIndex]
    this.sp16 = 60 / this.track.bpm / 4
    if (this.delay) {
      const now = this.ctx.currentTime
      this.delay.delayTime.setTargetAtTime(this.sp16 * 3, now, 0.05)
    }
  }

  // seed (optional): pick a track deterministically (e.g. per animal).
  startPad(seed) {
    this.ensureRunning()
    if (!this.ctx) return null
    const idx = typeof seed === 'number' ? seed : this.trackIndex
    this._selectTrack(idx)
    if (this.playing) return this.track.name
    this.playing = true
    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.08
    this._applyMasterTarget()
    this.timer = setInterval(() => this._tick(), 25)
    return this.track.name
  }

  // Switch to the next track live (if playing), or just preselect it.
  nextTrack() {
    this.ensureRunning()
    if (!this.ctx) return this.track.name
    this._selectTrack(this.trackIndex + 1)
    if (this.playing) {
      this.step = 0
      this.nextTime = this.ctx.currentTime + 0.08
    }
    return this.track.name
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

  // A bright resolving chord on solve, voiced in the current track's tonic.
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
    const tonic = this.track.tones[0]
    const chord = [...tonic, tonic[0] + 12, tonic[1] + 12]
    chord.forEach((m) => {
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
