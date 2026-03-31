import { AlertCircle, ChevronLeft } from 'lucide-react';

export default function BatchNotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24 sm:px-6">
      <AlertCircle className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold text-foreground">Batch not found</h1>
      <p className="text-sm text-muted-foreground">
        The batch you are looking for does not exist or may have been removed.
      </p>
      <a
        href="/"
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to dashboard
      </a>
    </main>
  );
}
