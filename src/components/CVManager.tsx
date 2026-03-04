import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, X, Loader2 } from 'lucide-react';

interface CVFile { name: string; created_at: string; size: number; }

export function CVManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cvFile, setCvFile] = useState<CVFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (open && user) fetchCV(); }, [open, user]);

  const fetchCV = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.storage
      .from('cvs').list(user.id, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
    if (!error && data && data.length > 0) {
      setCvFile({ name: data[0].name, created_at: data[0].created_at, size: (data[0].metadata as any)?.size || 0 });
    } else { setCvFile(null); }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
      toast({ title: '❌ Only PDF files are allowed', variant: 'destructive' }); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '❌ File cannot exceed 10MB', variant: 'destructive' }); return;
    }
    setUploading(true);
    if (cvFile) {
      await supabase.storage.from('cvs').remove([`${user.id}/${cvFile.name}`]);
      await supabase.from('cv_rag').delete().eq('user_id', user.id);
    }
    const fileName = file.name;
    const { error } = await supabase.storage.from('cvs').upload(`${user.id}/${fileName}`, file, { upsert: true });
    if (error) {
      toast({ title: '❌ Error uploading CV', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ CV uploaded successfully' });
      await fetchCV();
      supabase.functions.invoke('cv-webhook', { body: { filePath: `${user.id}/${fileName}` } })
        .then(({ error: whError }) => { if (whError) console.error('Webhook error:', whError); });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async () => {
    if (!user || !cvFile) return;
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(`${user.id}/${cvFile.name}`, 60);
    if (error || !data?.signedUrl) { toast({ title: '❌ Error downloading', variant: 'destructive' }); return; }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async () => {
    if (!user || !cvFile) return;
    if (!confirm('Are you sure you want to delete your CV?')) return;
    const { error } = await supabase.storage.from('cvs').remove([`${user.id}/${cvFile.name}`]);
    if (error) {
      toast({ title: '❌ Error deleting', variant: 'destructive' });
    } else {
      await supabase.from('cv_rag').delete().eq('user_id', user.id);
      toast({ title: '🗑️ CV deleted' });
      setCvFile(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Manage CV</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
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
                    {new Date(cvFile.created_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleDownload}>
                  <Download className="mr-1 h-4 w-4" /> View / Download
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">You don't have a CV uploaded</p>
            </div>
          )}
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            <Button className="w-full" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {cvFile ? 'Replace CV' : 'Upload CV (PDF)'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
