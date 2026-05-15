import { auth } from '@clerk/nextjs/server';

import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getBatch } from '@/lib/api/batches';
import { getStatusStyle, STATUS_LABELS } from '@/lib/batch-utils';
import { DownloadReportButton } from '@/components/pages/batch-detail/download-report-button';
import { DownloadProductsButton } from '@/components/pages/batch-detail/download-products-button';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-GT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface BatchHeaderProps {
  paramsPromise: Promise<{ id: string }>;
}

export async function BatchHeader({ paramsPromise }: BatchHeaderProps) {
  const { id } = await paramsPromise;
  const { getToken } = await auth();
  const token = await getToken();

  const batch = await getBatch(id, { authToken: token });

  const hasFailed = (batch.failedCount ?? 0) > 0;

  return (
    <section aria-labelledby="batch-heading">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Text size="h1" id="batch-heading">
          {batch.source ?? batch.fileName}
        </Text>
        <Badge variant="outline" style={getStatusStyle(batch.status)}>
          {STATUS_LABELS[batch.status]}
        </Badge>
        {batch.status === 'done' && (
          <>
            <DownloadReportButton batchId={batch.batchId} />
            <DownloadProductsButton batchId={batch.batchId} />
          </>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm text-muted-foreground">ID de lote</dt>
              <dd className="mt-1 font-mono text-sm text-foreground break-all">
                {batch.batchId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Facturas</dt>
              <dd className="mt-1 font-mono text-sm font-medium text-foreground">
                {batch.invoiceCount ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Fallidas</dt>
              <dd className={`mt-1 font-mono text-sm font-medium ${hasFailed ? 'text-destructive' : 'text-muted-foreground'}`}>
                {batch.failedCount ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Creado el</dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {formatDate(batch.createdAt)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {batch.status !== 'done' && (
        <div className="mt-4 rounded-lg bg-muted px-4 py-3">
          <p className="text-sm text-muted-foreground">
            El análisis estará disponible una vez que el lote termine de procesarse.
            Estado actual:{' '}
            <span className="font-medium text-foreground">{STATUS_LABELS[batch.status]}</span>.
          </p>
        </div>
      )}
    </section>
  );
}
