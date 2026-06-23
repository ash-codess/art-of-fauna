// Two flavours of the Swiss-style label chip.

// Inline pill: "BIRD · CLASS"
export function Chip({ value, label }) {
  return (
    <span className="chip">
      <span className="text-ink">{value}</span>
      {label ? (
        <>
          <span className="text-ink/30">·</span>
          <span className="text-ink/50">{label}</span>
        </>
      ) : null}
    </span>
  )
}

// Tiny glass sub-card: stacked value over label, with a leading glyph.
export function MetaChip({ glyph, value, label, tone = 'ink' }) {
  const toneClass =
    tone === 'terra' ? 'text-terra' : tone === 'moss' ? 'text-moss' : 'text-ink'
  return (
    <div className="glass flex items-center gap-3 px-4 py-3">
      <span aria-hidden className="text-xl leading-none">
        {glyph}
      </span>
      <span className="flex flex-col">
        <span className={`guide-serif text-lg leading-tight ${toneClass}`}>{value}</span>
        <span className="text-[10px] font-semibold uppercase tracking-chip text-ink/45">
          {label}
        </span>
      </span>
    </div>
  )
}
