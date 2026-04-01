import { type CSSProperties } from 'react';
import { auth } from '@clerk/nextjs/server';

import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BatchStatus, getBatch } from '@/lib/api/batches';
import { DownloadReportButton } from '@/components/pages/batch-detail/download-report-button';

function getStatusStyle(status: BatchStatus): CSSProperties {
  return {
    backgroundColor: `var(--color-status-${status}-bg)`,
    color: `var(--color-status-${status}-text)`,
    borderColor: `var(--color-status-${status}-bg)`,
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

interface BatchHeaderProps {
  paramsPromise: Promise<{ id: string }>;
}

export async function BatchHeader({ paramsPromise }: BatchHeaderProps) {
  const { id } = await paramsPromise;
  const { getToken } = await auth();
  const token = await getToken();

  const batch = await getBatch(id, { authToken: token });
  // try {
  // } catch (err) {
  //   // I want to think in a better way of abstracting this
  //   if (err instanceof ApiError && err.status === 404) notFound();
  //   throw err;
  // }

  return (
    <section aria-labelledby="batch-heading">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Text size="h1" id="batch-heading">
          {batch.file_name}
        </Text>
        <Badge variant="outline" style={getStatusStyle(batch.status)}>
          {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
        </Badge>
        {batch.status === 'done' && (
          <DownloadReportButton batchId={batch.batch_id} />
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">ID de lote</dt>
              <dd className="mt-1 font-mono text-xs text-foreground break-all">
                {batch.batch_id}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Facturas</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {batch.invoice_count ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fallidas</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {batch.failed_count ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Creado el</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {formatDate(batch.created_at)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Info callout when analytics may not be available */}
      {batch.status !== 'done' && (
        <div className="mt-4 rounded-lg bg-muted px-4 py-3">
          <p className="text-sm text-muted-foreground">
            El análisis estará disponible una vez que el lote termine de procesarse.
            Estado actual:{' '}
            <span className="font-medium text-foreground">{batch.status}</span>.
          </p>
        </div>
      )}
    </section>
  );
}
