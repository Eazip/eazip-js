import type { EazipSourceFile } from '@eazip/react';

export type DemoAsset = {
  id: string;
  name: string;
  ext: string;
  size: number;
  kind: 'sample' | 'generated' | 'remote';
  source: EazipSourceFile;
  hue: number;
  /** Real thumbnail for remote images. */
  thumbUrl?: string;
  /** User-added assets can be removed from the grid. */
  removable?: boolean;
};

function textFile(name: string, ext: string, body: string, hue: number): DemoAsset {
  const blob = new Blob([body], { type: 'text/plain' });
  return {
    id: name,
    name,
    ext,
    size: blob.size,
    kind: 'generated',
    source: { file: blob, filename: `${name.toLowerCase().replaceAll(' ', '-')}.${ext.toLowerCase()}` },
    hue,
  };
}

function repeat(line: string, times: number): string {
  return Array.from({ length: times }, (_, index) => `${index + 1}. ${line}`).join('\n');
}

export function buildAssets(): DemoAsset[] {
  const samples: DemoAsset[] = [
    {
      id: 'color-grid',
      name: 'Color grid',
      ext: 'SVG',
      size: 1600,
      kind: 'sample',
      source: { url: '/samples/color-grid.svg', filename: 'color-grid.svg' },
      hue: 220,
    },
    {
      id: 'receipt-card',
      name: 'Receipt card',
      ext: 'SVG',
      size: 1900,
      kind: 'sample',
      source: { url: '/samples/receipt-card.svg', filename: 'receipt-card.svg' },
      hue: 160,
    },
    {
      id: 'notes',
      name: 'Release notes',
      ext: 'TXT',
      size: 800,
      kind: 'sample',
      source: { url: '/samples/notes.txt', filename: 'notes.txt' },
      hue: 30,
    },
  ];

  const generated: DemoAsset[] = [
    textFile('Brand guidelines', 'TXT', repeat('Use the accent sparingly.', 120), 260),
    textFile('Q3 report', 'CSV', `quarter,revenue\nQ1,120\nQ2,180\nQ3,240\n`, 200),
    textFile('Invoice 0412', 'TXT', repeat('Line item — 42.00', 40), 10),
    textFile('Iconography', 'TXT', repeat('icon: 24px grid', 60), 280),
    textFile('Spec sheet', 'TXT', repeat('Tolerance ±0.2mm', 90), 120),
    textFile('Budget model', 'CSV', repeat('cell,value', 150), 90),
    textFile('Contract', 'TXT', repeat('The parties agree…', 200), 330),
    textFile('Wordmark', 'TXT', 'EAZIP — wordmark usage notes\n', 240),
    textFile('Walkthrough', 'TXT', repeat('Step-by-step notes', 80), 180),
  ];

  return [...samples, ...generated];
}

/** Publicly hosted demo photos — reachable by both the browser and the Eazip API. */
export function samplePhotos(count: number, offset = 0): DemoAsset[] {
  return Array.from({ length: count }, (_, index) => {
    const seed = `eazip-${offset + index + 1}`;
    const url = `https://picsum.photos/seed/${seed}/640/480`;
    return {
      id: `photo-${seed}`,
      name: `Photo ${offset + index + 1}`,
      ext: 'JPG',
      size: 0,
      kind: 'remote' as const,
      source: { url, filename: `photo-${offset + index + 1}.jpg` },
      hue: (offset + index) * 30 % 360,
      thumbUrl: `https://picsum.photos/seed/${seed}/320/240`,
      removable: true,
    };
  });
}

export function assetFromUrl(rawUrl: string, index: number): DemoAsset | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const segment = parsed.pathname.split('/').filter(Boolean).pop();
  const filename = segment ? decodeURIComponent(segment) : `remote-${index + 1}`;
  const ext = filename.includes('.') ? filename.split('.').pop()!.toUpperCase().slice(0, 4) : 'URL';
  const isImage = /^(JPG|JPEG|PNG|GIF|WEBP|AVIF|SVG)$/.test(ext);
  return {
    id: `url-${parsed.href}`,
    name: filename,
    ext,
    size: 0,
    kind: 'remote',
    source: { url: parsed.href, filename },
    hue: 265,
    ...(isImage ? { thumbUrl: parsed.href } : {}),
    removable: true,
  };
}
