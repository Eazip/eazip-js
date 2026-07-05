'use client';

import type { EazipTask } from '../types.js';
import type { EazipTrayMessages } from '../i18n/index.js';
import { formatBytes } from '../utils/format.js';
import {
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  CloseIcon,
  CrossIcon,
  SpinnerIcon,
  WarningIcon,
} from './icons.js';

export type HeaderProps = {
  task: EazipTask;
  messages: EazipTrayMessages;
  expanded: boolean;
  bodyId: string;
  chevronPointsDown: boolean;
  onToggle: () => void;
  onDismiss: () => void;
};

function iconWrapStyle(task: EazipTask): { background: string; color: string } {
  switch (task.state) {
    case 'completed':
      return { background: 'var(--ez-ok)', color: '#fff' };
    case 'partial':
      return { background: 'var(--ez-warn)', color: '#fff' };
    case 'failed':
      return { background: 'var(--ez-danger)', color: '#fff' };
    case 'expired':
      return { background: 'var(--ez-surface3)', color: 'var(--ez-fg3)' };
    default:
      return {
        background: 'color-mix(in srgb, var(--ez-accent) 13%, var(--ez-surface))',
        color: 'var(--ez-accent)',
      };
  }
}

function stateIcon(task: EazipTask) {
  switch (task.state) {
    case 'completed':
      return <CheckIcon />;
    case 'partial':
      return <WarningIcon />;
    case 'failed':
      return <CrossIcon />;
    case 'expired':
      return <ClockIcon />;
    default:
      return <SpinnerIcon />;
  }
}

export function totalZipSize(task: EazipTask): string | null {
  let total = 0;
  let known = false;
  for (const zip of task.zips) {
    if (zip.size != null) {
      total += zip.size;
      known = true;
    }
  }
  return known ? formatBytes(total) : null;
}

function headerText(task: EazipTask, messages: EazipTrayMessages): { title: string; subtitle: string } {
  switch (task.state) {
    case 'completed':
      return {
        title: task.downloadStarted ? messages.downloadStartedTitle : messages.downloadReadyTitle,
        subtitle: messages.readySubtitle(task.zips.length, totalZipSize(task)),
      };
    case 'partial':
      return {
        title: task.downloadStarted ? messages.downloadStartedTitle : messages.downloadReadyTitle,
        subtitle: messages.skippedSubtitle(task.skippedCount),
      };
    case 'failed':
      return { title: messages.failedTitle, subtitle: messages.failedSubtitle };
    case 'expired':
      return { title: messages.expiredTitle, subtitle: messages.expiredSubtitle };
    default:
      return { title: messages.preparingTitle(task.filesTotal), subtitle: '' };
  }
}

export function Header({
  task,
  messages,
  expanded,
  bodyId,
  chevronPointsDown,
  onToggle,
  onDismiss,
}: HeaderProps) {
  const { title, subtitle } = headerText(task, messages);
  const chevronRotation = expanded ? (chevronPointsDown ? 180 : 0) : chevronPointsDown ? 0 : 180;
  return (
    <div className="ez-header" onClick={onToggle}>
      <div className="ez-icon-wrap" style={iconWrapStyle(task)}>
        {stateIcon(task)}
      </div>
      <div className="ez-title-area">
        <div className="ez-title">{title}</div>
        {subtitle ? <div className="ez-subtitle">{subtitle}</div> : null}
      </div>
      <button
        type="button"
        className="ez-close-btn"
        aria-label={messages.close}
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
      >
        <CloseIcon />
      </button>
      <button
        type="button"
        className="ez-chevron"
        aria-expanded={expanded}
        aria-controls={bodyId}
        aria-label={expanded ? messages.collapse : messages.expand}
        style={{ transform: `rotate(${chevronRotation}deg)` }}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <ChevronIcon />
      </button>
    </div>
  );
}
