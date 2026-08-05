'use client';

import { useMemo, useState } from 'react';
import { EazipTray, useEazip } from '@eazip/react';
import { buildDemoFiles, formatFileSize } from './demo-files';
import styles from './tray-demo.module.css';

const ACCENT = '#6366f1';

export default function TrayDemo() {
  const files = useMemo(buildDemoFiles, []);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(files.map((f) => f.id)));
  const [panelEl, setPanelEl] = useState<HTMLDivElement | null>(null);

  const zip = useEazip();

  const toggle = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedFiles = files.filter((f) => selected.has(f.id));

  const handleDownload = () => {
    if (selectedFiles.length === 0) return;
    zip.download({
      strategy: 'local',
      zipName: 'assets.zip',
      files: selectedFiles.map((f) => ({ file: f.blob, filename: f.name })),
    });
  };

  return (
    <div className={styles.panel} ref={setPanelEl}>
      <div className={styles.titlebar}>
        <span className={styles.dots} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
        <div className={styles.spacer} />
        <span className={styles.packageLabel}>@eazip/react</span>
      </div>

      <div className={styles.listHeader}>
        <span className={styles.filesLabel}>Files</span>
        <span className={styles.selectedCount}>
          {selectedFiles.length > 0 ? `${selectedFiles.length} of ${files.length} selected` : 'No files selected'}
        </span>
        <button
          type="button"
          className={styles.downloadButton}
          disabled={selectedFiles.length === 0}
          onClick={handleDownload}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Download as ZIP
        </button>
      </div>

      <div className={styles.list}>
        {files.map((file) => {
          const isSelected = selected.has(file.id);
          return (
            <button
              key={file.id}
              type="button"
              className={styles.row}
              data-selected={isSelected}
              onClick={() => toggle(file.id)}
              aria-pressed={isSelected}
            >
              <span className={styles.check} aria-hidden="true">
                {isSelected ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12l4 4L19 7"
                      stroke="#fff"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <span className={styles.extBadge}>{file.ext}</span>
              <span className={styles.fileName}>{file.name}</span>
              <span className={styles.fileSize}>{formatFileSize(file.blob.size)}</span>
            </button>
          );
        })}
      </div>

      <EazipTray accent={ACCENT} container={panelEl} />
    </div>
  );
}
