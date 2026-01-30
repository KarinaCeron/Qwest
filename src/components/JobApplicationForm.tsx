import { useState } from 'react';
import { JobApplicationFormData, JobApplication } from '@/types/jobApplication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { X, Plus, Edit, FileText, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface JobApplicationFormProps {
  onSubmit: (data: JobApplicationFormData) => void;
  onCancel: () => void;
  editingApplication?: JobApplication | null;
}

export function JobApplicationForm({ onSubmit, onCancel, editingApplication }: JobApplicationFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<string | null>(
    editingApplication?.coverLetter || null
  );
  const [isCoverLetterOpen, setIsCoverLetterOpen] = useState(false);
  const [formData, setFormData] = useState<JobApplicationFormData>({
    company: editingApplication?.company || '',
    role: editingApplication?.role || '',
    recruiterName: editingApplication?.recruiterName || '',
    salary: editingApplication?.salary || '',
    jobLink: editingApplication?.jobLink || '',
    status: editingApplication?.status || 'applied',
    priority: editingApplication?.priority || 'medium',
    applicationDate: editingApplication?.applicationDate || new Date().toISOString().split('T')[0],
    notes: editingApplication?.notes || '',
    jobContent: editingApplication?.jobContent || '',
    coverLetter: editingApplication?.coverLetter || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.role.trim()) return;
    // Include the generated cover letter when submitting
    onSubmit({
      ...formData,
      coverLetter: generatedCoverLetter || undefined
    });
  };

  const handleChange = (field: keyof JobApplicationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateCoverLetter = async () => {
    if (!formData.jobContent) {
      toast({
        title: "Error",
        description: "El contenido de la vacante es requerido",
        variant: "destructive",
      });
      return;
    }
    
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No se pudo obtener el email del usuario",
        variant: "destructive",
      });
      return;
    }
    
    setIsGeneratingCoverLetter(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: {
          jobContent: formData.jobContent,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Extract the cover letter from response with fallbacks and log raw data
      console.log('generate-cover-letter response:', data);
      const coverLetter = (
        data?.["Cover letter"] ??
        data?.coverLetter ??
        data?.data?.["Cover letter"] ??
        (Array.isArray(data) ? data.find((x: any) => x?.["Cover letter"])?.["Cover letter"] : undefined)
      );
      if (coverLetter) {
        setGeneratedCoverLetter(coverLetter);
        setIsCoverLetterOpen(true);
        toast({
          title: "Cover Letter generada",
          description: "¡Cover Letter creada exitosamente!",
        });
      } else {
        throw new Error("No se recibió el cover letter");
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el cover letter.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-gradient-card">
        <CardHeader className="border-b bg-gradient-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {editingApplication ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingApplication ? 'Editar Postulación' : 'Nueva Postulación'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-primary-foreground hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Empresa *</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange('company', e.target.value)}
                  placeholder="Ej: Google, Microsoft..."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol / Puesto *</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  placeholder="Ej: Frontend Developer..."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recruiterName">Recruiter / Contacto</Label>
                <Input
                  id="recruiterName"
                  value={formData.recruiterName}
                  onChange={(e) => handleChange('recruiterName', e.target.value)}
                  placeholder="Nombre del recruiter"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salario (USD)</Label>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) => handleChange('salary', e.target.value)}
                  placeholder="45000"
                  min="0"
                  step="1000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobLink">Link de la Vacante</Label>
              <Input
                id="jobLink"
                type="url"
                value={formData.jobLink}
                onChange={(e) => handleChange('jobLink', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">📤 Postulada</SelectItem>
                    <SelectItem value="in-progress">⏳ En Proceso</SelectItem>
                    <SelectItem value="interview">💼 Entrevista</SelectItem>
                    <SelectItem value="offer">🎉 Oferta</SelectItem>
                    <SelectItem value="rejected">❌ Rechazada</SelectItem>
                    <SelectItem value="no-response">⏸️ Sin Respuesta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">🔴 Alta</SelectItem>
                    <SelectItem value="medium">🟡 Media</SelectItem>
                    <SelectItem value="low">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="applicationDate">Fecha de Postulación</Label>
                <Input
                  id="applicationDate"
                  type="date"
                  value={formData.applicationDate}
                  onChange={(e) => handleChange('applicationDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobContent">Contenido de la Vacante</Label>
              <Textarea
                id="jobContent"
                value={formData.jobContent}
                onChange={(e) => handleChange('jobContent', e.target.value)}
                placeholder="Pega aquí el contenido completo de la vacante: descripción, requisitos, beneficios, etc..."
                rows={6}
                className="min-h-[120px]"
              />
              {formData.jobContent && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={handleGenerateCoverLetter}
                  disabled={isGeneratingCoverLetter}
                >
                  {isGeneratingCoverLetter ? 'Generando...' : '✉️ Crear Cover Letter'}
                </Button>
              )}
            </div>
            
            {generatedCoverLetter && (
              <div className="mt-4 p-4 bg-gradient-card border rounded-lg">
                <h4 className="font-semibold mb-2 text-foreground">Cover Letter Generada</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Tu cover letter ha sido generada exitosamente.
                </p>
                <Sheet open={isCoverLetterOpen} onOpenChange={setIsCoverLetterOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Cover Letter
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[500px] sm:w-[600px]">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Cover Letter para {formData.company}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <div className="bg-background border rounded-lg p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                          {generatedCoverLetter}
                        </pre>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedCoverLetter);
                            toast({
                              title: "Copiado",
                              description: "Cover letter copiado al portapapeles",
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar al Portapapeles
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsCoverLetterOpen(false)}
                        >
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Comentarios adicionales sobre la postulación..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-primary">
                {editingApplication ? 'Actualizar' : 'Guardar'} Postulación
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}