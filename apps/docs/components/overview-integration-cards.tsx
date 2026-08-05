import { Card, Cards } from 'fumadocs-ui/components/card';

function ReactMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="1.8" fill="#61dafb" />
      <ellipse cx="12" cy="12" rx="10" ry="4.1" stroke="#61dafb" strokeWidth="1.25" />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4.1"
        stroke="#61dafb"
        strokeWidth="1.25"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4.1"
        stroke="#61dafb"
        strokeWidth="1.25"
        transform="rotate(120 12 12)"
      />
    </svg>
  );
}

function JavaScriptMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="1.5" fill="#f7df1e" />
      <text
        x="19.5"
        y="18.5"
        fill="#161616"
        fontFamily="Arial, sans-serif"
        fontSize="8.5"
        fontWeight="700"
        textAnchor="end"
      >
        JS
      </text>
    </svg>
  );
}

export function OverviewIntegrationCards() {
  return (
    <Cards>
      <Card
        href="/docs/getting-started/react"
        icon={<ReactMark />}
        title="React"
        description={
          <>
            <code>@eazip/react</code> provides <code>useEazip()</code> and a
            drop-in tray for progress, retries, and downloads.
          </>
        }
      />
      <Card
        href="/docs/getting-started/javascript"
        icon={<JavaScriptMark />}
        title="JavaScript"
        description={
          <>
            <code>@eazip/core</code> is the framework-agnostic ZIP engine for
            any browser application.
          </>
        }
      />
    </Cards>
  );
}
