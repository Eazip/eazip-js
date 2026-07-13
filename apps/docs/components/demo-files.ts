export type DemoFile = {
  id: string;
  name: string;
  ext: string;
  hue: number;
  blob: Blob;
};

function repeatLine(line: string, times: number): string {
  return Array.from({ length: times }, (_, i) => `${i + 1}. ${line}`).join('\n');
}

function csv(rows: string[]): string {
  return rows.join('\n');
}

/**
 * Six small, real Blobs for the homepage's live demo tray — not placeholder
 * labels. Sizes shown in the UI are read straight off `Blob.size`, and the
 * ZIP a visitor downloads is a genuine archive of this content.
 */
export function buildDemoFiles(): DemoFile[] {
  return [
    {
      id: 'brand-guidelines',
      name: 'Brand guidelines.txt',
      ext: 'TXT',
      hue: 245,
      blob: new Blob([repeatLine('Use the accent color sparingly.', 130)], { type: 'text/plain' }),
    },
    {
      id: 'q3-report',
      name: 'Q3 report.csv',
      ext: 'CSV',
      hue: 150,
      blob: new Blob(
        [csv(['quarter,revenue,region', ...Array.from({ length: 90 }, (_, i) => `Q${(i % 4) + 1},${1200 + i * 37},region-${i % 6}`)])],
        { type: 'text/csv' },
      ),
    },
    {
      id: 'invoice-0412',
      name: 'Invoice 0412.txt',
      ext: 'TXT',
      hue: 20,
      blob: new Blob([repeatLine('Line item — 42.00 USD', 60)], { type: 'text/plain' }),
    },
    {
      id: 'logo-usage',
      name: 'Logo usage.svg',
      ext: 'SVG',
      hue: 280,
      blob: new Blob(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6366f1"/><path d="M18 20h20l8 8v16a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V22a2 2 0 0 1 2-2z" fill="#fff"/></svg>',
        ],
        { type: 'image/svg+xml' },
      ),
    },
    {
      id: 'release-notes',
      name: 'Release notes.txt',
      ext: 'TXT',
      hue: 340,
      blob: new Blob([repeatLine('Fixed a bug and improved performance.', 45)], { type: 'text/plain' }),
    },
    {
      id: 'budget-model',
      name: 'Budget model.csv',
      ext: 'CSV',
      hue: 190,
      blob: new Blob(
        [csv(['category,planned,actual', ...Array.from({ length: 70 }, (_, i) => `line-${i + 1},${500 + i * 11},${480 + i * 12}`)])],
        { type: 'text/csv' },
      ),
    },
  ];
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}
