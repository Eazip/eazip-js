import { describe, expect, it } from 'vitest';
import { en, ja, resolveMessages } from '../src/i18n/index.js';

describe('i18n catalogs', () => {
  it('ja covers every key of en with matching kinds', () => {
    const enKeys = Object.keys(en).sort();
    const jaKeys = Object.keys(ja).sort();
    expect(jaKeys).toEqual(enKeys);
    for (const key of enKeys) {
      expect(typeof ja[key as keyof typeof ja]).toBe(typeof en[key as keyof typeof en]);
    }
  });

  it('falls back to en and applies overrides', () => {
    const messages = resolveMessages('en', { done: 'Close it' });
    expect(messages.done).toBe('Close it');
    expect(messages.downloadReadyTitle).toBe(en.downloadReadyTitle);

    const jaMessages = resolveMessages('ja');
    expect(jaMessages.download).toBe(ja.download);
  });

  it('formats templated messages', () => {
    expect(en.preparingTitle(1)).toContain('1 file');
    expect(en.preparingTitle(820)).toContain('820');
    expect(en.readySubtitle(3, '4.3 GB')).toBe('3 ZIPs · 4.3 GB');
    expect(en.readySubtitle(1, '2.4 GB')).toBe('2.4 GB');
    expect(en.readySubtitle(1, null)).toBe('');
    expect(ja.partialBanner(4)).toContain('4');
  });
});
