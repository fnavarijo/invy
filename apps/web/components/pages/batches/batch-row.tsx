'use client';

import { useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { deleteBatch, type BatchListItem } from '@/lib/api/batches';
import { ApiError } from '@/lib/api/helpers';
import { getStatusStyle, STATUS_LABELS, FileIcon, formatRelativeDate } from '@/lib/batch-utils';

export function BatchRow({ batch }: { batch: BatchListItem }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticDeleted, setOptimisticDeleted] = useState(false);

  const { getToken } = useAuth();
  const router = useRouter();

  if (optimisticDeleted) return null;

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const authToken = await getToken();
      await deleteBatch(batch.batch_id, { authToken });
      setOptimisticDeleted(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('No se puede eliminar un lote que está procesando. Intenta de nuevo más tarde.');
      } else {
        setError('Ocurrió un error al eliminar el lote. Intenta de nuevo.');
      }
      setOptimisticDeleted(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="flex items-center border-b last:border-b-0">
      <a
        href={`/batches/${batch.batch_id}`}
        className="group flex flex-1 items-center gap-4 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <FileIcon fileType={batch.file_type} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {batch.source ?? batch.file_name}
        </span>
        <Badge variant="outline" style={getStatusStyle(batch.status)} className="shrink-0 text-xs">
          {STATUS_LABELS[batch.status]}
        </Badge>
        <span className="hidden sm:block shrink-0 w-16 text-right text-sm text-muted-foreground tabular-nums">
          {batch.invoice_count !== null ? `${batch.invoice_count} fact.` : '—'}
        </span>
        <span className="hidden sm:block shrink-0 w-20 text-right text-sm text-muted-foreground">
          {formatRelativeDate(batch.created_at)}
        </span>
      </a>
      <div className="px-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Eliminar lote ${batch.source ?? batch.file_name}`}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar lote</DialogTitle>
            <DialogDescription>
              Esta acción eliminará <strong>{batch.source ?? batch.file_name}</strong> y sus{' '}
              <strong>{batch.invoice_count ?? 0} facturas</strong> de forma permanente. Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </li>
  );
}
