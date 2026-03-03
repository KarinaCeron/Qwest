import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, X, Loader2 } from 'lucide-react';

interface CVFile {
  name: string;
  created_at: string;
  size: number;
}

export function CVManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<CVFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && user) fetchCV();
  }, [open, user]);

  const fetchCV = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.storage
      .from('cvs')
      .list(user.id, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

    if (!error && data && data.length > 0) {
      setCvFile({ name: data[0].name, created_at: data[0].created_at, size: (data[0].metadata as any)?.size || 0 });
    } else {
      setCvFile(null);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== 'application/pdf') {
      toast({ title: '❌ Solo se permiten archivos PDF', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '❌ El archivo no puede superar 10MB', variant: 'destructive' });
      return;
    }

    setUploading(true);

    // Delete existing CV and its RAG data first
    if (cvFile) {
      await supabase.storage.from('cvs').remove([`${user.id}/${cvFile.name}`]);
      await supabase.from('cv_rag').delete().eq('user_id', user.id);
    }

    const fileName = `cv_${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from('cvs')
      .upload(`${user.id}/${fileName}`, file, { upsert: true });

    if (error) {
      toast({ title: '❌ Error al subir el CV', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ CV subido correctamente' });
      await fetchCV();

      // Trigger n8n webhook
      supabase.functions.invoke('cv-webhook', {
        body: { filePath: `${user.id}/${fileName}` },
      }).then(({ error: whError }) => {
        if (whError) console.error('Webhook error:', whError);
      });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async () => {
    if (!user || !cvFile) return;
    const { data, error } = await supabase.storage
      .from('cvs')
      .createSignedUrl(`${user.id}/${cvFile.name}`, 60);

    if (error || !data?.signedUrl) {
      toast({ title: '❌ Error al descargar', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async () => {
    if (!user || !cvFile) return;
    if (!confirm('¿Estás seguro de que quieres eliminar tu CV?')) return;

    const { error } = await supabase.storage
      .from('cvs')
      .remove([`${user.id}/${cvFile.name}`]);

    if (error) {
      toast({ title: '❌ Error al eliminar', variant: 'destructive' });
    } else {
      // Also delete cv_rag entries for this user
      await supabase.from('cv_rag').delete().eq('user_id', user.id);
      toast({ title: '🗑️ CV eliminado' });
      setCvFile(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Gestionar CV</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : cvFile ? (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-10 w-10 text-red-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{cvFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(cvFile.created_at).toLocaleDateString('es-CL')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
                  <Download className="mr-1 h-4 w-4" /> Ver / Descargar
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">No tienes un CV cargado</p>
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {cvFile ? 'Reemplazar CV' : 'Subir CV (PDF)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
