'use client';

export const trayCss = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes ez-spin { to { transform: rotate(360deg); } }
  @keyframes ez-tray-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes ez-body { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ez-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes ez-indet { 0% { left: -40%; } 100% { left: 100%; } }
  @keyframes ez-pop { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
}

.ez-root {
  font-family: inherit;
  -webkit-font-smoothing: antialiased;
  color: var(--ez-fg);
  position: fixed;
  z-index: var(--ez-z, 9999);
}

/* Placement: corner (default) */
.ez-root.ez-place-corner {
  right: 18px;
  bottom: 18px;
  width: 268px;
  transform: translateX(var(--ez-offset-x, 0px)) translateY(var(--ez-offset-y, 0px));
}
.ez-root.ez-place-corner.ez-expanded {
  width: 320px;
}

/* Placement: bar */
.ez-root.ez-place-bar {
  left: 50%;
  bottom: 18px;
  transform: translateX(calc(-50% + var(--ez-offset-x, 0px))) translateY(var(--ez-offset-y, 0px));
  width: 312px;
}
.ez-root.ez-place-bar.ez-expanded {
  width: 440px;
}

/* Placement: anchored */
.ez-root.ez-place-anchored {
  right: 18px;
  top: 70px;
  width: 272px;
  transform: translateX(var(--ez-offset-x, 0px)) translateY(var(--ez-offset-y, 0px));
}
.ez-root.ez-place-anchored.ez-expanded {
  width: 328px;
}

@media (prefers-reduced-motion: no-preference) {
  .ez-root {
    transition: width 0.22s ease, max-width 0.22s ease;
  }
  .ez-spin {
    animation: ez-spin 0.9s linear infinite;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .ez-root.ez-place-corner {
    right: 10px;
    bottom: 12px;
    max-width: 230px;
    width: auto;
  }
  .ez-root.ez-place-corner.ez-expanded {
    left: 10px;
    right: 10px;
    max-width: none;
    width: auto;
  }
  .ez-root.ez-place-bar {
    left: 50%;
    bottom: 12px;
    max-width: 236px;
    width: auto;
    transform: translateX(calc(-50% + var(--ez-offset-x, 0px))) translateY(var(--ez-offset-y, 0px));
  }
  .ez-root.ez-place-bar.ez-expanded {
    left: 10px;
    right: 10px;
    max-width: none;
    width: auto;
    transform: translateX(var(--ez-offset-x, 0px)) translateY(var(--ez-offset-y, 0px));
  }
  .ez-root.ez-place-anchored {
    right: 10px;
    top: 60px;
    max-width: 230px;
    width: auto;
  }
  .ez-root.ez-place-anchored.ez-expanded {
    left: 10px;
    right: 10px;
    max-width: none;
    width: auto;
  }
}

/* Card shell */
.ez-card {
  background: var(--ez-surface);
  border: 1px solid var(--ez-border);
  border-radius: 13px;
  box-shadow: 0 12px 32px var(--ez-shadow);
  overflow: hidden;
}

@media (prefers-reduced-motion: no-preference) {
  .ez-card {
    animation: ez-tray-in 0.28s cubic-bezier(0.2, 0.7, 0.3, 1);
  }
}

/* Header row */
.ez-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  cursor: pointer;
  user-select: none;
}

/* State icon */
.ez-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Title area */
.ez-title-area {
  min-width: 0;
  flex: 1;
}

.ez-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.25;
}

.ez-subtitle {
  font-size: 11.5px;
  color: var(--ez-fg2);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

/* Header buttons */
.ez-close-btn {
  border: none;
  background: transparent;
  color: var(--ez-fg3);
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
}
.ez-close-btn:hover {
  background: var(--ez-surface2);
}

.ez-chevron {
  color: var(--ez-fg3);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

@media (prefers-reduced-motion: no-preference) {
  .ez-chevron {
    transition: transform 0.2s;
  }
}

/* Slim progress bar (collapsed processing) */
.ez-slim-bar-wrap {
  padding: 0 11px 9px;
}

.ez-slim-bar {
  height: 3px;
  border-radius: 3px;
  background: var(--ez-track);
  overflow: hidden;
  position: relative;
}

.ez-slim-bar-fill {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 3px;
  background: var(--ez-accent);
}

@media (prefers-reduced-motion: no-preference) {
  .ez-slim-bar-fill.ez-indet {
    width: 40%;
    animation: ez-indet 1.1s ease-in-out infinite;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ez-slim-bar-fill.ez-indet {
    width: 40%;
    left: 30%;
  }
}

/* Expanded body */
.ez-body {
  border-top: 1px solid var(--ez-border);
  padding: 14px;
  max-height: min(440px, 68vh);
  overflow: auto;
}

@media (prefers-reduced-motion: no-preference) {
  .ez-body {
    animation: ez-body 0.2s ease;
  }
}

/* Processing body */
.ez-proc-inner {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.ez-proc-stage {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-fg);
}

.ez-proc-desc {
  font-size: 12.5px;
  color: var(--ez-fg2);
  margin-top: 4px;
  line-height: 1.5;
}

/* Full progress bar */
.ez-bar {
  height: 6px;
  border-radius: 4px;
  background: var(--ez-track);
  overflow: hidden;
  position: relative;
}

.ez-bar-fill {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 4px;
  background: var(--ez-accent);
}

@media (prefers-reduced-motion: no-preference) {
  .ez-bar-fill.ez-indet {
    width: 40%;
    animation: ez-indet 1.1s ease-in-out infinite;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ez-bar-fill.ez-indet {
    width: 40%;
    left: 30%;
  }
}

/* Ghost button full width */
.ez-ghost-full {
  border: 1px solid var(--ez-border);
  background: var(--ez-surface);
  color: var(--ez-fg2);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
}
.ez-ghost-full:hover {
  background: var(--ez-surface2);
}

/* Ready body */
.ez-ready-inner {
  display: flex;
  flex-direction: column;
  gap: 11px;
}

/* Banner */
.ez-banner {
  display: flex;
  gap: 9px;
  padding: 10px 11px;
  border-radius: 10px;
}

.ez-banner-ok {
  background: color-mix(in srgb, var(--ez-ok) 11%, var(--ez-surface));
  border: 1px solid color-mix(in srgb, var(--ez-ok) 28%, transparent);
}

.ez-banner-warn {
  background: color-mix(in srgb, var(--ez-warn) 12%, var(--ez-surface));
  border: 1px solid color-mix(in srgb, var(--ez-warn) 30%, transparent);
}

.ez-banner-text {
  font-size: 12px;
  color: var(--ez-fg2);
  line-height: 1.45;
}

/* Zip rows */
.ez-zip-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.ez-zip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  background: var(--ez-surface2);
  border: 1px solid var(--ez-border);
  border-radius: 10px;
}

.ez-zip-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ez-accent) 12%, var(--ez-surface));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ez-zip-info {
  flex: 1;
  min-width: 0;
}

.ez-zip-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--ez-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ez-zip-size {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  color: var(--ez-fg3);
  margin-top: 1px;
}

/* Download buttons */
.ez-btn-primary-row {
  border: none;
  background: var(--ez-ink);
  color: var(--ez-inkFg);
  border-radius: 8px;
  padding: 7px 13px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}
.ez-btn-primary-row:hover {
  opacity: 0.9;
}

.ez-btn-ghost-row {
  border: 1px solid var(--ez-border);
  background: var(--ez-surface);
  color: var(--ez-fg);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
}
.ez-btn-ghost-row:hover {
  background: var(--ez-surface2);
}

/* Included files & skipped toggle */
.ez-included-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--ez-fg3);
}

.ez-toggle-skipped-btn {
  background: none;
  border: none;
  color: var(--ez-accent);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

/* Skipped list */
.ez-skipped-list {
  border: 1px solid var(--ez-border);
  border-radius: 10px;
  overflow: hidden;
}

.ez-skipped-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 11px;
  border-bottom: 1px solid var(--ez-border);
}
.ez-skipped-row:last-child {
  border-bottom: none;
}

.ez-skipped-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ez-warn);
  flex-shrink: 0;
}

.ez-skipped-name {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  color: var(--ez-fg);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ez-skipped-reason {
  font-size: 11px;
  color: var(--ez-fg3);
}

/* Footer buttons */
.ez-footer {
  display: flex;
  gap: 8px;
  margin-top: 1px;
}

.ez-btn-primary {
  border: none;
  background: var(--ez-ink);
  color: var(--ez-inkFg);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  flex: 1;
}
.ez-btn-primary:hover {
  opacity: 0.9;
}

.ez-btn-ghost {
  border: 1px solid var(--ez-border);
  background: var(--ez-surface);
  color: var(--ez-fg2);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.ez-btn-ghost:hover {
  background: var(--ez-surface2);
}

/* Failed body */
.ez-failed-inner {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.ez-status-tile {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ez-status-tile-danger {
  background: color-mix(in srgb, var(--ez-danger) 13%, var(--ez-surface));
  color: var(--ez-danger);
}

.ez-status-tile-neutral {
  background: var(--ez-surface3);
  color: var(--ez-fg3);
}

.ez-status-header {
  display: flex;
  gap: 11px;
  align-items: flex-start;
}

.ez-status-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ez-fg);
}

.ez-status-desc {
  font-size: 12.5px;
  color: var(--ez-fg2);
  margin-top: 4px;
  line-height: 1.5;
}

.ez-error-detail {
  background: var(--ez-surface2);
  border: 1px solid var(--ez-border);
  border-radius: 9px;
  padding: 9px 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
  color: var(--ez-fg3);
  word-break: break-all;
}

/* Expired body */
.ez-expired-inner {
  display: flex;
  flex-direction: column;
  gap: 13px;
}
`;
