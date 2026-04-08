import { type CSSProperties } from 'react';
import { FileArchive, FileText } from 'lucide-react';
import type { BatchStatus } from '@/lib/api/batches';

export function getStatusStyle(status: BatchStatus): CSSProperties {
  return {
    backgroundColor: `var(--color-status-${status}-bg)`,
    color: `var(--color-status-${status}-text)`,
    borderColor: `var(--color-status-${status}-bg)`,
  };
}

export const STATUS_LABELS: Record<BatchStatus, string> = {
  queued: 'En cola',
  processing: 'Procesando',
  done: 'Completado',
  failed: 'Fallido',
};

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Ahora mismo';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 30) return `hace ${diffDays}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === 'zip') return <FileArchive className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  return <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
}
