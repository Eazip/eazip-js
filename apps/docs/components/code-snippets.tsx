import type { CodeLine } from './code-window';

// Every line below reconstructs (token text, concatenated in order) to the
// exact fenced code blocks in CONTENT-SPEC.md — do not edit the text of any
// token without re-checking against that file; these snippets match the
// real @eazip/react and @eazip/core APIs.

export const EXPORTER_TSX: readonly CodeLine[] = [
  [
    ['import', 'kw'],
    [" { useEazip, EazipTray } ", 'pl'],
    ['from', 'kw'],
    [' ', 'pl'],
    ["'@eazip/react'", 'str'],
  ],
  [],
  [
    ['function', 'kw'],
    [' ', 'pl'],
    ['Exporter', 'fn'],
    ['({ files }) {', 'pl'],
  ],
  [
    ['  ', 'pl'],
    ['const', 'kw'],
    [' zip = ', 'pl'],
    ['useEazip', 'fn'],
    ['()', 'pl'],
  ],
  [],
  [
    ['  ', 'pl'],
    ['return', 'kw'],
    [' (', 'pl'],
  ],
  [['    <>', 'pl']],
  [
    ['      <', 'pl'],
    ['button', 'fn'],
    [' onClick={() => zip.', 'pl'],
    ['download', 'fn'],
    ['({ files })}>', 'pl'],
  ],
  [['        Download as ZIP', 'pl']],
  [
    ['      </', 'pl'],
    ['button', 'fn'],
    ['>', 'pl'],
  ],
  [],
  [['      {/* progress, cancel & retry — built in */}', 'cmt']],
  [
    ['      <', 'pl'],
    ['EazipTray', 'fn'],
    [' />', 'pl'],
  ],
  [['    </>', 'pl']],
  [['  )', 'pl']],
  [['}', 'pl']],
];

export const EXPORT_TS: readonly CodeLine[] = [
  [
    ['import', 'kw'],
    [' { ', 'pl'],
    ['createZip', 'fn'],
    [' } ', 'pl'],
    ['from', 'kw'],
    [' ', 'pl'],
    ["'@eazip/core'", 'str'],
  ],
  [],
  [['// mix local data and remote URLs freely', 'cmt']],
  [
    ['const', 'kw'],
    [' result = ', 'pl'],
    ['await', 'kw'],
    [' ', 'pl'],
    ['createZip', 'fn'],
    ['({', 'pl'],
  ],
  [['  files: [', 'pl']],
  [
    ['    { url: ', 'pl'],
    ["'/files/report.pdf'", 'str'],
    [' },', 'pl'],
  ],
  [
    ['    { file: svgBlob, filename: ', 'pl'],
    ["'logo.svg'", 'str'],
    [' },', 'pl'],
  ],
  [['  ],', 'pl']],
  [
    ['  zipName: ', 'pl'],
    ["'export.zip'", 'str'],
    [',', 'pl'],
  ],
  [['})', 'pl']],
  [],
  [
    ['result.', 'pl'],
    ['download', 'fn'],
    ['()', 'pl'],
  ],
];

export const APP_TSX: readonly CodeLine[] = [
  [
    ['import', 'kw'],
    [" { useEazip, EazipTray } ", 'pl'],
    ['from', 'kw'],
    [' ', 'pl'],
    ["'@eazip/react'", 'str'],
  ],
  [],
  [
    ['const', 'kw'],
    [' zip = ', 'pl'],
    ['useEazip', 'fn'],
    ['()', 'pl'],
  ],
  [
    ['zip.', 'pl'],
    ['download', 'fn'],
    ['({ files })', 'pl'],
    ['          ', 'pl'],
    ['// fire & forget', 'cmt'],
  ],
  [],
  [['// drop the tray in once; it owns its states', 'cmt']],
  [
    ['<', 'pl'],
    ['EazipTray', 'fn'],
    [' />', 'pl'],
  ],
  [],
  [['// huge job? one option — same tray, same UX', 'cmt']],
  [
    ['zip.', 'pl'],
    ['download', 'fn'],
    ['({ files: urls, strategy: ', 'pl'],
    ["'cloud'", 'str'],
    [', publicKey })', 'pl'],
  ],
];

