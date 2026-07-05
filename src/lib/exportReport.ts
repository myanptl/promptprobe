import { toPng } from 'html-to-image';
import type { ScanResponse } from './scanClient';

/** Serialize a scan result to a downloadable JSON string. */
export function toJson(response: ScanResponse): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      tool: 'PromptProbe',
      score: response.score,
      results: response.results,
    },
    null,
    2,
  );
}

function triggerDownload(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
}

export function downloadJson(response: ScanResponse): void {
  const blob = new Blob([toJson(response)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'promptprobe-report.json');
  URL.revokeObjectURL(url);
}

export async function downloadPng(node: HTMLElement): Promise<void> {
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true });
  triggerDownload(dataUrl, 'promptprobe-scorecard.png');
}
