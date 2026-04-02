'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { exportBatchProductsXlsx } from '@/lib/api/batches';

export function DownloadProductsButton({ batchId }: { batchId: string }) {
  const { getToken } = useAuth();
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const authToken = await getToken();
      const blob = await exportBatchProductsXlsx(batchId, { authToken });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch_${batchId}_products.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
      <Download className="h-4 w-4 mr-2" />
      {downloading ? 'Descargando…' : 'Exportar Productos'}
    </Button>
  );
}
