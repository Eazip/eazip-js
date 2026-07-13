export function LogoMark({ size = 27 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: 'var(--ez-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 10px color-mix(in srgb, var(--ez-accent) 45%, transparent)',
        flexShrink: 0,
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 3h9l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M11 5h2v2h-2zM11 7h2v2h-2zM11 9h2v2h-2z" fill="#fff" />
      </svg>
    </div>
  );
}
