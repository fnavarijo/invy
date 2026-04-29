'use client';

import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { UploadZone } from '@/components/upload/upload-zone';

export function UploadDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <UploadCloud className="size-4" />
        Subir facturas
      </Button>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Subir facturas</DialogTitle>
          <DialogDescription>
            Sube archivos .xml o .zip del SAT para procesarlos.
          </DialogDescription>
        </DialogHeader>
        <UploadZone />
      </DialogContent>
    </Dialog>
  );
}
