import { Suspense } from 'react';
import { Text } from '@/components/ui/text';
import { BatchList, BatchListSkeleton } from '@/components/pages/batches/batch-list';

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.cursor) ? params.cursor[0] : params.cursor;
  const cursor = raw ?? undefined;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <Text size="h1">Lotes</Text>
          <Text size="body" className="mt-1 text-muted-foreground">
            Todos tus archivos subidos.
          </Text>
        </div>
        <Suspense fallback={<BatchListSkeleton />}>
          <BatchList cursor={cursor} />
        </Suspense>
      </main>
    </div>
  );
}
