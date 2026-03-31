import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { getBatch } from '@/lib/api/batches';
import { ApiError } from '@/lib/api/helpers';
import { BatchDetailPage } from '@/components/pages/batch-detail-page';

export default async function BatchDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  try {
    const batch = await getBatch(id, { authToken: token });
    return <BatchDetailPage batch={batch} />;
  } catch (err) {
    // I want to think in a better way of abstracting this
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
