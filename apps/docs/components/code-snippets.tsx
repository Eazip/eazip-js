import type { CodeLine } from './code-window';

// Keep the homepage snippets aligned with the real @eazip/react and
// @eazip/core APIs whenever their public signatures change.

export const EXPORTER_TSX: readonly CodeLine[] = [
  [
    ['import', 'kw'],
    [" { useEazip, EazipTray } ", 'pl'],
    ['from', 'kw'],
    [' ', 'pl'],
    ["'@eazip/react'", 'str'],
  ],
  [
    ['import', 'kw'],
    [' { MyFileList } ', 'pl'],
    ['from', 'kw'],
    [' ', 'pl'],
    ["'./MyFileList'", 'str'],
  ],
  [],
  [
    ['export default function', 'kw'],
    [' ', 'pl'],
    ['App', 'fn'],
    ['() {', 'pl'],
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
    ['MyFileList', 'fn'],
  ],
  [
    ['        onDownload={(files) => zip.', 'pl'],
    ['download', 'fn'],
    ['({ files })}', 'pl'],
  ],
  [['      />', 'pl']],
  [],
  [
    ['      <', 'pl'],
    ['EazipTray', 'fn'],
    [' />', 'pl'],
  ],
  [['    </>', 'pl']],
  [['  )', 'pl']],
  [['}', 'pl']],
];

export const DEMO_CORE_TS: readonly CodeLine[] = [
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
  [
    ['export async function', 'kw'],
    [' ', 'pl'],
    ['downloadZip', 'fn'],
    ['(files) {', 'pl'],
  ],
  [
    ['  ', 'pl'],
    ['const', 'kw'],
    [' result = ', 'pl'],
    ['await', 'kw'],
    [' ', 'pl'],
    ['createZip', 'fn'],
    ['({', 'pl'],
  ],
  [['    files,', 'pl']],
  [
    ['    zipName: ', 'pl'],
    ["'export.zip'", 'str'],
    [',', 'pl'],
  ],
  [['  })', 'pl']],
  [],
  [
    ['  result.', 'pl'],
    ['download', 'fn'],
    ['()', 'pl'],
  ],
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

export const APP_TSX: readonly CodeLine[] = EXPORTER_TSX;
