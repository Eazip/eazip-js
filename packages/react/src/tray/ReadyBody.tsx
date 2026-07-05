'use client';

import { useState } from 'react';
import type { EazipTask } from '../types.js';
import type { EazipTrayMessages } from '../i18n/index.js';
import { DownloadArrowIcon, WarningTriangleIcon } from './icons.js';
import { ZipRow } from './ZipRow.js';

export type ReadyBodyProps = {
  task: EazipTask;
  messages: EazipTrayMessages;
  onDownloadZip: (zipIndex: number) => void;
  onDownloadAll: () => void;
  onDismiss: () => void;
};

export function ReadyBody({ task, messages, onDownloadZip, onDownloadAll, onDismiss }: ReadyBodyProps) {
  const [showSkipped, setShowSkipped] = useState(false);
  const includedCount = Math.max(0, task.filesTotal - task.skippedCount);
  return (
    <div className="ez-ready-inner">
      {task.downloadStarted ? (
        <div className="ez-banner ez-banner-ok">
          <span style={{ color: 'var(--ez-ok)', flexShrink: 0, marginTop: 1 }}>
            <DownloadArrowIcon />
          </span>
          <div className="ez-banner-text">{messages.autoStartedBanner}</div>
        </div>
      ) : null}
      {task.state === 'partial' ? (
        <div className="ez-banner ez-banner-warn">
          <span style={{ color: 'var(--ez-warn)', flexShrink: 0, marginTop: 1 }}>
            <WarningTriangleIcon />
          </span>
          <div className="ez-banner-text">{messages.partialBanner(task.skippedCount)}</div>
        </div>
      ) : null}
      {task.zips.length > 0 ? (
        <div className="ez-zip-list">
          {task.zips.map((zip, index) => (
            <ZipRow
              key={`${zip.filename}-${index}`}
              zip={zip}
              messages={messages}
              onDownload={() => onDownloadZip(index)}
            />
          ))}
        </div>
      ) : null}
      <div className="ez-included-row">
        <span>{messages.includedFiles(includedCount)}</span>
        {task.skipped.length > 0 ? (
          <button
            type="button"
            className="ez-toggle-skipped-btn"
            onClick={() => setShowSkipped((value) => !value)}
          >
            {showSkipped ? messages.hideSkipped : messages.viewSkipped}
          </button>
        ) : null}
      </div>
      {showSkipped && task.skipped.length > 0 ? (
        <div className="ez-skipped-list">
          {task.skipped.map((skipped, index) => (
            <div className="ez-skipped-row" key={`${skipped.filename ?? 'file'}-${index}`}>
              <span className="ez-skipped-dot" />
              <span className="ez-skipped-name">{skipped.filename ?? '—'}</span>
              <span className="ez-skipped-reason">{skipped.reason}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="ez-footer">
        <button type="button" className="ez-btn-primary" onClick={onDownloadAll}>
          {task.zips.length > 1 ? messages.downloadAll : messages.download}
        </button>
        <button type="button" className="ez-btn-ghost" onClick={onDismiss}>
          {messages.done}
        </button>
      </div>
    </div>
  );
}
