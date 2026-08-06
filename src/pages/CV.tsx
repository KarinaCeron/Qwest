import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, Loader2, Save } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { CompensationPlanner } from '@/components/CompensationPlanner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ProfileHero } from '@/components/ProfileHero';

interface CVDocument {
  id: string;
  file_name: string;
  storage_path: string;
  description: string | null;
  created_at: string;
}

const CV = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cvs, setCvs] = useState<CVDocument[]>([]);
  const [loadingCVs, setLoadingCVs] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchCVs();
  }, [user]);

  const fetchCVs = async () => {
    if (!user) return;
    setLoadingCVs(true);
    const { data, error } = await supabase
      .from('cv_documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: '❌ Could not load your CVs', description: error.message, variant: 'destructive' });
    } else {
      const list = (data || []) as CVDocument[];
      setCvs(list);
      setDrafts(Object.fromEntries(list.map((c) => [c.id, c.description ?? ''])));
    }
    setLoadingCVs(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== 'application/pdf') {
      toast({ title: '❌ Only PDF files are allowed', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '❌ File cannot exceed 10MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const storagePath = `${user.id}/${file.name}`;
    const { error } = await supabase.storage.from('cvs').upload(storagePath, file, { upsert: true });
    if (error) {
      toast({ title: '❌ Error uploading CV', description: error.message, variant: 'destructive' });
    } else {
      const { error: dbError } = await supabase.from('cv_documents').insert({
        user_id: user.id,
        file_name: file.name,
        storage_path: storagePath,
        description: newDescription.trim() || null,
        size: file.size,
      });
      if (dbError) {
        toast({ title: '❌ Error saving CV details', description: dbError.message, variant: 'destructive' });
      } else {
        toast({ title: '✅ CV uploaded successfully' });
        setNewDescription('');
        await fetchCVs();
        supabase.functions
          .invoke('cv-webhook', { body: { filePath: storagePath } })
          .then(({ error: whError }) => {
            if (whError) console.error('Webhook error:', whError);
          });
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (cv: CVDocument) => {
    const { data, error } = await supabase.storage.from('cvs').createSignedUrl(cv.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: '❌ Error downloading', variant: 'destructive' });
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleSaveDescription = async (cv: CVDocument) => {
    const description = (drafts[cv.id] ?? '').trim() || null;
    const { error } = await supabase.from('cv_documents').update({ description }).eq('id', cv.id);
    if (error) {
      toast({ title: '❌ Could not save the description', variant: 'destructive' });
      return;
    }
    setCvs((prev) => prev.map((c) => (c.id === cv.id ? { ...c, description } : c)));
    toast({ title: '✅ Description saved' });
  };

  const handleDelete = async (cv: CVDocument) => {
    if (!user) return;
    if (!confirm(`Delete "${cv.file_name}"?`)) return;
    const { error } = await supabase.storage.from('cvs').remove([cv.storage_path]);
    if (error) {
      toast({ title: '❌ Error deleting', variant: 'destructive' });
      return;
    }
    await supabase.from('cv_documents').delete().eq('id', cv.id);
    await supabase
      .from('cv_rag')
      .delete()
      .eq('user_id', user.id)
      .contains('metadata', { file_name: cv.file_name });
    toast({ title: '🗑️ CV deleted' });
    setCvs((prev) => prev.filter((c) => c.id !== cv.id));
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="My Qwest" />

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <ProfileHero />

        <Tabs defaultValue="cvs" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cvs">My CVs</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
          </TabsList>

          <TabsContent value="cvs" className="space-y-6">

        <Card className="bg-gradient-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">

              <FileText className="h-5 w-5" />
              My CVs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newDescription">Description for the next upload</Label>
              <Input
                id="newDescription"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Product leadership CV, tailored for fintech"
                maxLength={200}
              />
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
              <Button
                className="w-full bg-gradient-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload CV (PDF)
              </Button>
            </div>

            {loadingCVs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : cvs.length === 0 ? (
              <div className="text-center py-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">You don't have any CVs uploaded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cvs.map((cv) => (
                  <div key={cv.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <FileText className="h-10 w-10 text-red-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{cv.file_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            id={`desc-${cv.id}`}
                            value={drafts[cv.id] ?? ''}
                            onChange={(e) => setDrafts((prev) => ({ ...prev, [cv.id]: e.target.value }))}
                            placeholder="What is this CV for?"
                            maxLength={200}
                            className="h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleSaveDescription(cv)}
                            aria-label="Save description"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(cv)}>
                        <Download className="mr-1 h-4 w-4" /> View / Download
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(cv)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="compensation">
            <CompensationPlanner />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
};

export default CV;
