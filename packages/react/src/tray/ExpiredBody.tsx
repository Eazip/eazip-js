'use client';

import type { EazipTask } from '../types.js';
import type { EazipTrayMessages } from '../i18n/index.js';
import { ClockIcon } from './icons.js';

export type ExpiredBodyProps = {
  task: EazipTask;
  messages: EazipTrayMessages;
  onRetry: () => void;
  onDismiss: () => void;
};

export function ExpiredBody({ task, messages, onRetry, onDismiss }: ExpiredBodyProps) {
  return (
    <div className="ez-expired-inner">
      <div className="ez-status-header">
        <div className="ez-status-tile ez-status-tile-neutral">
          <ClockIcon size={18} />
        </div>
        <div>
          <div className="ez-status-title">{messages.expiredBodyTitle}</div>
          <div className="ez-status-desc">{messages.expiredBody}</div>
        </div>
      </div>
      <div className="ez-footer">
        {task.canRetry ? (
          <button type="button" className="ez-btn-primary" onClick={onRetry}>
            {messages.runAgain}
          </button>
        ) : null}
        <button type="button" className="ez-btn-ghost" onClick={onDismiss} style={{ flex: 1 }}>
          {messages.dismiss}
        </button>
      </div>
    </div>
  );
}
