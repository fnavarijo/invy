import { UploadCloud } from 'lucide-react';
import { Text } from '@/components/ui/text';

interface EmptyStateProps {
  hasDataOutsideRange?: boolean;
}

export function EmptyState({ hasDataOutsideRange = false }: EmptyStateProps) {
  if (hasDataOutsideRange) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
        <UploadCloud className="mx-auto mb-4 size-10 text-muted-foreground" />
        <Text size="h3">Sin facturas en este periodo</Text>
        <Text size="body" className="mx-auto mt-2 max-w-sm text-muted-foreground">
          No se encontraron facturas en el rango de fechas seleccionado. Prueba ampliando el rango.
        </Text>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16 text-center">
      <UploadCloud className="mx-auto mb-4 size-10 text-muted-foreground" />
      <Text size="h3">Aún no hay facturas</Text>
      <Text size="body" className="mx-auto mt-2 max-w-sm text-muted-foreground">
        Sube tus primeros archivos XML o ZIP del SAT para comenzar a ver tu análisis financiero.
      </Text>
    </div>
  );
}
