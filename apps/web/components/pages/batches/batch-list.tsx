import { auth } from '@clerk/nextjs/server';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listBatches, type BatchListItem, type BatchListResponse } from '@/lib/api/batches';
import { BatchRow } from '@/components/pages/batches/batch-row';
import { LoadMoreLink } from '@/components/pages/batches/load-more-link';

export async function BatchList({ cursor }: { cursor?: string }) {
  const { getToken } = await auth();
  const authToken = await getToken();

  let data: BatchListResponse | null = null;
  let fetchError = false;

  try {
    data = await listBatches({ authToken }, cursor);
  } catch {
    fetchError = true;
  }

  if (fetchError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Todos los lotes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm text-destructive">No se pudieron cargar los lotes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cursor && data!.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Todos los lotes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg bg-muted px-4 py-8 text-center">
            <p className="text-sm font-medium text-foreground">Aún no hay lotes</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sube tu primer archivo SAT XML o ZIP para comenzar.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos los lotes</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-0">
        <ul aria-label="Todos los lotes">
          {data!.data.map((batch) => (
            <BatchRow key={batch.batchId} batch={batch} />
          ))}
        </ul>
        {data!.nextCursor && <LoadMoreLink cursor={data!.nextCursor} />}
      </CardContent>
    </Card>
  );
}

export function BatchListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Todos los lotes</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0"
            aria-hidden="true"
          >
            <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-48 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-20 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="hidden sm:block h-3.5 w-10 shrink-0 animate-pulse rounded bg-muted" />
            <div className="hidden sm:block h-3.5 w-16 shrink-0 animate-pulse rounded bg-muted" />
            <div className="size-9 shrink-0 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
