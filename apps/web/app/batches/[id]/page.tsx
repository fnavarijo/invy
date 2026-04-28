import { ChevronLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { BatchHeader } from '@/components/pages/batch-detail/batch-header';
import { BatchAnalytics } from '@/components/pages/batch-detail/batch-analytics';

export default async function BatchDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <a
          href="/batches"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a Lotes
        </a>

        <BatchHeader paramsPromise={params} />

        <Separator />

        <BatchAnalytics paramsPromise={params} />
      </main>
    </div>
  );
}
