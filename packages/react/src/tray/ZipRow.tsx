'use client';

import type { EazipTaskZip } from '../types.js';
import type { EazipTrayMessages } from '../i18n/index.js';
import { formatBytes } from '../utils/format.js';
import { ZipFileIcon } from './icons.js';

export type ZipRowProps = {
  zip: EazipTaskZip;
  messages: EazipTrayMessages;
  onDownload: () => void;
};

export function ZipRow({ zip, messages, onDownload }: ZipRowProps) {
  return (
    <div className="ez-zip-row">
      <div className="ez-zip-icon">
        <ZipFileIcon />
      </div>
      <div className="ez-zip-info">
        <div className="ez-zip-name">{zip.filename}</div>
        {zip.size != null ? <div className="ez-zip-size">{formatBytes(zip.size)}</div> : null}
      </div>
      <button
        type="button"
        className={zip.downloadStarted ? 'ez-btn-ghost-row' : 'ez-btn-primary-row'}
        onClick={onDownload}
      >
        {zip.downloadStarted ? messages.downloadAgain : messages.download}
      </button>
    </div>
  );
}
