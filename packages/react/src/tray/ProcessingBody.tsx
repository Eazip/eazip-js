'use client';

import type { EazipTask } from '../types.js';
import type { EazipTrayMessages } from '../i18n/index.js';
import { ProgressBar } from './ProgressBar.js';

export type ProcessingBodyProps = {
  task: EazipTask;
  messages: EazipTrayMessages;
  onCancel: () => void;
};

export function ProcessingBody({ task, messages, onCancel }: ProcessingBodyProps) {
  return (
    <div className="ez-proc-inner">
      <div>
        <div className="ez-proc-stage">{messages.processingStage}</div>
        <div className="ez-proc-desc">{messages.processingDescription(task.filesTotal)}</div>
      </div>
      <ProgressBar task={task} label={messages.progressLabel} />
      <button type="button" className="ez-ghost-full" onClick={onCancel}>
        {messages.cancelExport}
      </button>
    </div>
  );
}
