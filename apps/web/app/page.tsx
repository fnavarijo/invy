import { Suspense } from 'react';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { UploadZone } from '@/components/upload/upload-zone';
import { BatchHistory, BatchHistorySkeleton } from '@/components/batches/batch-history';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <section aria-labelledby="upload-heading">
          <div className="mb-4">
            <Text size="h1" id="upload-heading">Sube tus facturas</Text>
            <Text size="body" className="mt-1 text-muted-foreground">
              Sube tus facturas en formato .zip o .xml.
            </Text>
          </div>
          <UploadZone />
        </section>

        <Separator />

        <section aria-labelledby="batches-heading">
          <div className="mb-4">
            <Text size="h2" id="batches-heading">Lotes recientes</Text>
            <Text size="body" className="mt-1 text-muted-foreground">
              Tus cargas más recientes y su estado de procesamiento.
            </Text>
          </div>
          <Suspense fallback={<BatchHistorySkeleton />}>
            <BatchHistory />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
