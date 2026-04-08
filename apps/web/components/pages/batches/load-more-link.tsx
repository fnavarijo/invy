import { ChevronDown } from 'lucide-react';

export function LoadMoreLink({ cursor }: { cursor: string }) {
  return (
    <div className="flex justify-center px-4 py-3 border-t">
      <a
        href={`/batches?cursor=${encodeURIComponent(cursor)}`}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        Cargar más
        <ChevronDown className="size-4" />
      </a>
    </div>
  );
}
