'use client';

import * as React from 'react';
import { FileArchive, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBatchList } from '@/lib/hooks/use-batch-list';
import { useBatchRefresh } from '@/components/batches/batch-refresh-context';
import type { BatchStatus } from '@/lib/api/batches';

const MAX_ROWS = 10;
const SKELETON_COUNT = 5;

function getStatusStyle(status: BatchStatus): React.CSSProperties {
  return {
    backgroundColor: `var(--color-status-${status}-bg)`,
    color: `var(--color-status-${status}-text)`,
    borderColor: `var(--color-status-${status}-bg)`,
  };
}

const STATUS_LABELS: Record<BatchStatus, string> = {
  queued: 'Queued',
  processing: 'Processing',
  done: 'Done',
  failed: 'Failed',
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === 'zip') return <FileArchive className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  return <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0" aria-hidden="true">
      <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
      <div className="min-w-0 flex-1"><div className="h-3.5 w-48 animate-pulse rounded bg-muted" /></div>
      <div className="h-5 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="hidden sm:block h-3.5 w-10 shrink-0 animate-pulse rounded bg-muted" />
      <div className="hidden sm:block h-3.5 w-16 shrink-0 animate-pulse rounded bg-muted" />
    </div>
  );
}

export function BatchHistory() {
  const { data, loading, error, refetch } = useBatchList();
  const { registerRefetch } = useBatchRefresh();

  React.useEffect(() => {
    registerRefetch(refetch);
  }, [registerRefetch, refetch]);

  if (error !== null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent batches</CardTitle>
          <CardDescription>Your last {MAX_ROWS} uploads</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent batches</CardTitle>
          <CardDescription>Your last {MAX_ROWS} uploads</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-0">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonRow key={i} />)}
        </CardContent>
      </Card>
    );
  }

  if (data !== null && data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent batches</CardTitle>
          <CardDescription>Your last {MAX_ROWS} uploads</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg bg-muted px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No batches yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Upload your first SAT XML file or ZIP archive above to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rows = (data ?? []).slice(0, MAX_ROWS);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent batches</CardTitle>
        <CardDescription>Your last {MAX_ROWS} uploads</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-0">
        <ul aria-label="Recent batches">
          {rows.map((batch) => (
            <li key={batch.batch_id} className="border-b last:border-b-0">
              <a
                href={`/batches/${batch.batch_id}`}
                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <FileIcon fileType={batch.file_type} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{batch.file_name}</span>
                <Badge variant="outline" style={getStatusStyle(batch.status)} className="shrink-0 text-xs">
                  {STATUS_LABELS[batch.status]}
                </Badge>
                <span className="hidden sm:block shrink-0 w-16 text-right text-sm text-muted-foreground tabular-nums">
                  {batch.invoice_count !== null ? `${batch.invoice_count} inv.` : '—'}
                </span>
                <span className="hidden sm:block shrink-0 w-20 text-right text-sm text-muted-foreground">
                  {formatRelativeDate(batch.created_at)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
