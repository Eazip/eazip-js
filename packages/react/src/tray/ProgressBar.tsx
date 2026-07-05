'use client';

import type { EazipTask } from '../types.js';

export function progressPercent(task: EazipTask): number | null {
  const progress = task.progress;
  if (!progress || progress.filesTotal <= 0) return null;
  return Math.min(100, Math.round((progress.filesCompleted / progress.filesTotal) * 100));
}

export type ProgressBarProps = {
  task: EazipTask;
  label: string;
  slim?: boolean;
};

export function ProgressBar({ task, label, slim = false }: ProgressBarProps) {
  const percent = progressPercent(task);
  const determinate = percent != null;
  return (
    <div
      className={slim ? 'ez-slim-bar' : 'ez-bar'}
      role="progressbar"
      aria-label={label}
      {...(determinate
        ? { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': percent }
        : {})}
    >
      <div
        className={`${slim ? 'ez-slim-bar-fill' : 'ez-bar-fill'}${determinate ? '' : ' ez-indet'}`}
        style={determinate ? { width: `${percent}%`, left: 0 } : undefined}
      />
    </div>
  );
}
