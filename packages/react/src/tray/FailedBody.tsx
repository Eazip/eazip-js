'use client';

import type { EazipTask } from '../types.js';
import type { EazipTrayMessages } from '../i18n/index.js';
import { CrossIcon } from './icons.js';

export type FailedBodyProps = {
  task: EazipTask;
  messages: EazipTrayMessages;
  onRetry: () => void;
  onDismiss: () => void;
};

export function FailedBody({ task, messages, onRetry, onDismiss }: FailedBodyProps) {
  return (
    <div className="ez-failed-inner">
      <div className="ez-status-header">
        <div className="ez-status-tile ez-status-tile-danger">
          <CrossIcon size={18} />
        </div>
        <div>
          <div className="ez-status-title">{messages.failedBodyTitle}</div>
          <div className="ez-status-desc">{messages.failedBody}</div>
        </div>
      </div>
      {task.error ? (
        <div className="ez-error-detail">{messages.errorDetail(task.error.code, task.error.message)}</div>
      ) : null}
      <div className="ez-footer">
        {task.canRetry ? (
          <button type="button" className="ez-btn-primary" onClick={onRetry}>
            {messages.retry}
          </button>
        ) : null}
        <button type="button" className="ez-btn-ghost" onClick={onDismiss} style={{ flex: 1 }}>
          {messages.dismiss}
        </button>
      </div>
    </div>
  );
}
