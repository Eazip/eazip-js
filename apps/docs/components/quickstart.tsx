'use client';

import styles from './quickstart.module.css';
import shared from './shared.module.css';
import { useIntegrationPreference } from './integration-preference';

const QUICKSTARTS = {
  react: [
    {
      title: 'Install',
      code: 'npm i @eazip/react',
      description: 'Add the React package. No build configuration or backend required.',
    },
    {
      title: 'Zip files or URLs',
      code: 'zip.download({ files })',
      description: 'Pass local files or remote URLs to the useEazip() hook.',
    },
    {
      title: 'Show progress',
      code: '<EazipTray />',
      description: 'Progress, cancel, retry, and completed downloads — handled.',
    },
  ],
  core: [
    {
      title: 'Install',
      code: 'npm i @eazip/core',
      description: 'Add the framework-agnostic package. No build configuration or backend required.',
    },
    {
      title: 'Create the ZIP',
      code: 'createZip({ files })',
      description: 'Pass local files or remote URLs to the browser ZIP engine.',
    },
    {
      title: 'Download it',
      code: 'result.download()',
      description: 'Trigger the finished ZIP download from your own interface.',
    },
  ],
} as const;

export function Quickstart() {
  const { integration } = useIntegrationPreference();
  const steps = QUICKSTARTS[integration];

  return (
    <section id="quickstart" className={`${shared.container} ${styles.section}`}>
      <div className={styles.layout}>
        <div className={styles.header}>
          <div className={styles.label}>Quickstart</div>
          <h2 className={styles.h2}>
            From install to
            <br />
            download in minutes
          </h2>
          <p className={styles.intro}>Three steps, no build config, no server to stand up.</p>
        </div>

        <ol className={styles.steps} aria-label={`${integration === 'react' ? 'React' : 'Core'} quickstart`}>
          {steps.map((step, index) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.number}>{index + 1}</span>
              <div className={styles.stepBody}>
                <div className={styles.stepHeading}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <code className={styles.code}>{step.code}</code>
                </div>
                <p className={styles.description}>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
