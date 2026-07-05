'use client';

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { resolveMessages, type EazipTrayLocale, type EazipTrayMessages } from '../i18n/index.js';
import { useEazipStore, useHydrateStore } from '../internal/use-store.js';
import type { EazipTask } from '../types.js';
import { ExpiredBody } from './ExpiredBody.js';
import { FailedBody } from './FailedBody.js';
import { Header } from './Header.js';
import { ProcessingBody } from './ProcessingBody.js';
import { ProgressBar } from './ProgressBar.js';
import { ReadyBody } from './ReadyBody.js';
import { trayCss } from './styles.js';
import { buildCssVars, THEMES, useResolvedTheme } from './theme.js';

export type EazipTrayProps = {
  placement?: 'corner' | 'bar' | 'anchored';
  theme?: 'light' | 'dark' | 'auto';
  accent?: string;
  autoDownload?: boolean;
  autoHideMs?: number;
  locale?: EazipTrayLocale;
  messages?: Partial<EazipTrayMessages>;
  className?: string;
  zIndex?: number;
  offset?: { x?: number; y?: number };
  container?: HTMLElement | null;
  onStateChange?: (task: EazipTask | null) => void;
};

export function EazipTray({
  placement = 'corner',
  theme = 'auto',
  accent = '#3056d3',
  autoDownload,
  autoHideMs = 20_000,
  locale = 'en',
  messages: messageOverrides,
  className,
  zIndex = 9999,
  offset,
  container,
  onStateChange,
}: EazipTrayProps): ReactNode {
  const store = useEazipStore();
  useHydrateStore(store);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const task = snapshot.tasks[0] ?? null;
  const expanded = snapshot.expanded;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (autoDownload !== undefined) store.setConfig({ autoDownload });
  }, [store, autoDownload]);

  const taskId = task?.id ?? null;
  const taskState = task?.state ?? null;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.(task);
    // Only re-notify on identity or state transitions, not every progress tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, taskState]);

  const [interacting, setInteracting] = useState(false);
  const downloadStarted = task?.downloadStarted ?? false;
  useEffect(() => {
    if (!taskId || taskState !== 'completed' || !downloadStarted) return;
    if (autoHideMs <= 0 || interacting) return;
    const timer = setTimeout(() => store.dismiss(taskId), autoHideMs);
    return () => clearTimeout(timer);
  }, [store, taskId, taskState, downloadStarted, autoHideMs, interacting]);

  const resolvedTheme = useResolvedTheme(theme);
  const bodyId = useId();

  const rootStyle = useMemo(() => {
    const vars: Record<string, string> = {
      ...buildCssVars(THEMES[resolvedTheme], accent),
      '--ez-z': String(zIndex),
    };
    if (offset?.x != null) vars['--ez-offset-x'] = `${offset.x}px`;
    if (offset?.y != null) vars['--ez-offset-y'] = `${offset.y}px`;
    return vars as CSSProperties;
  }, [resolvedTheme, accent, zIndex, offset?.x, offset?.y]);

  if (!mounted || !task) return null;

  const messages = resolveMessages(locale, messageOverrides);
  const portalTarget = container ?? document.body;
  const showSlimBar = task.state === 'processing' && !expanded;

  const body = expanded ? (
    <div className="ez-body" id={bodyId}>
      {task.state === 'processing' ? (
        <ProcessingBody task={task} messages={messages} onCancel={() => store.cancel(task.id)} />
      ) : null}
      {task.state === 'completed' || task.state === 'partial' ? (
        <ReadyBody
          task={task}
          messages={messages}
          onDownloadZip={(zipIndex) => store.downloadZip(task.id, zipIndex)}
          onDownloadAll={() => store.downloadAll(task.id)}
          onDismiss={() => store.dismiss(task.id)}
        />
      ) : null}
      {task.state === 'failed' ? (
        <FailedBody
          task={task}
          messages={messages}
          onRetry={() => store.retry(task.id)}
          onDismiss={() => store.dismiss(task.id)}
        />
      ) : null}
      {task.state === 'expired' ? (
        <ExpiredBody
          task={task}
          messages={messages}
          onRetry={() => store.retry(task.id)}
          onDismiss={() => store.dismiss(task.id)}
        />
      ) : null}
    </div>
  ) : null;

  return createPortal(
    <div
      className={`ez-root ez-place-${placement}${expanded ? ' ez-expanded' : ''}${className ? ` ${className}` : ''}`}
      style={rootStyle}
      role="status"
      aria-live="polite"
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setInteracting(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && expanded) store.setExpanded(false);
      }}
    >
      <style data-eazip-tray="">{trayCss}</style>
      <div className="ez-card">
        <Header
          task={task}
          messages={messages}
          expanded={expanded}
          bodyId={bodyId}
          chevronPointsDown={placement === 'anchored'}
          onToggle={store.toggleExpanded}
          onDismiss={() => store.dismiss(task.id)}
        />
        {showSlimBar ? (
          <div className="ez-slim-bar-wrap">
            <ProgressBar task={task} label={messages.progressLabel} slim />
          </div>
        ) : null}
        {body}
      </div>
    </div>,
    portalTarget,
  );
}
