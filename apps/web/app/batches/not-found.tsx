import { AlertCircle, ChevronLeft } from 'lucide-react';

export default function BatchNotFound() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 py-24 sm:px-6">
      <AlertCircle className="h-10 w-10 text-muted-foreground" />
      <h1 className="text-xl font-semibold text-foreground">Lote no encontrado</h1>
      <p className="text-sm text-muted-foreground">
        El lote que buscas no existe o puede haber sido eliminado.
      </p>
      <a
        href="/"
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver al inicio
      </a>
    </main>
  );
}
