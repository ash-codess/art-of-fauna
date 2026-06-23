// Small circular outline button for chrome actions (pause, shuffle, share…).

export default function IconButton({ label, onClick, children, disabled, active }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        'icon-btn select-none disabled:opacity-40 disabled:pointer-events-none',
        active ? 'border-moss/60 text-moss' : '',
      ].join(' ')}
    >
      <span aria-hidden className="text-base leading-none">
        {children}
      </span>
    </button>
  )
}
