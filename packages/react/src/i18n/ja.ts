'use client';

import type { EazipTrayMessages } from './index.js';

export const ja: EazipTrayMessages = {
  preparingTitle: (filesTotal) => `${filesTotal.toLocaleString()}件のファイルを準備中`,
  downloadReadyTitle: 'ダウンロード準備完了',
  downloadStartedTitle: 'ダウンロードを開始しました',
  readySubtitle: (zipCount, totalSize) => {
    const prefix = zipCount > 1 ? `ZIP ${zipCount}個` : '';
    if (prefix && totalSize) return `${prefix} · ${totalSize}`;
    return prefix || totalSize || '';
  },
  skippedSubtitle: (skippedCount) => `${skippedCount.toLocaleString()}件のファイルをスキップ`,
  failedTitle: 'ダウンロードに失敗しました',
  failedSubtitle: 'タップして詳細を確認',
  expiredTitle: 'ダウンロード期限切れ',
  expiredSubtitle: 'リンクは利用できなくなりました',
  processingStage: 'ダウンロードを準備しています',
  processingDescription: (filesTotal) =>
    `${filesTotal.toLocaleString()}件のファイルをひとつにまとめています。そのまま作業を続けて大丈夫です — 準備ができたらここでお知らせします。`,
  cancelExport: 'エクスポートをキャンセル',
  autoStartedBanner: 'ダウンロードは自動的に開始されました。始まらない場合は下のボタンをご利用ください。',
  partialBanner: (skippedCount) =>
    `ZIPの準備はできましたが、${skippedCount.toLocaleString()}件のファイルを追加できませんでした。それ以外はすべて含まれています。`,
  download: 'ダウンロード',
  downloadAgain: '再ダウンロード',
  downloadAll: 'すべてダウンロード',
  done: '完了',
  includedFiles: (count) => `${count.toLocaleString()}件のファイルを含む`,
  viewSkipped: 'スキップを表示',
  hideSkipped: 'スキップを隠す',
  failedBodyTitle: 'エクスポートを完了できませんでした',
  failedBody: '選択内容は失われていません — もう一度お試しください。',
  errorDetail: (code, message) => `error: ${code} · ${message}`,
  retry: '再試行',
  dismiss: '閉じる',
  runAgain: 'もう一度実行',
  expiredBodyTitle: 'このエクスポートは期限切れです',
  expiredBody: 'ダウンロードリンクの有効期限が切れました。再実行すると新しいZIPが生成されます。',
  close: '閉じる',
  expand: '詳細を開く',
  collapse: '詳細を閉じる',
  progressLabel: 'エクスポートの進捗',
};
