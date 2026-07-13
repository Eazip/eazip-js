import { Fragment } from 'react';
import styles from './code-window.module.css';

export type TokenClass = 'kw' | 'str' | 'cmt' | 'fn' | 'pl';
export type CodeToken = readonly [text: string, cls?: TokenClass];
export type CodeLine = readonly CodeToken[];

export function CodeWindow({ filename, lines }: { filename: string; lines: readonly CodeLine[] }) {
  return (
    <div className={styles.window}>
      <div className={styles.titlebar}>
        <span className={styles.dots} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
        <span className={styles.filename}>{filename}</span>
      </div>
      <pre className={styles.body}>
        <code>
          {lines.map((line, i) => (
            <Fragment key={i}>
              {line.map(([text, cls], j) => (
                <span key={j} className={cls ? styles[cls] : undefined}>
                  {text}
                </span>
              ))}
              {i < lines.length - 1 ? '\n' : null}
            </Fragment>
          ))}
        </code>
      </pre>
    </div>
  );
}
